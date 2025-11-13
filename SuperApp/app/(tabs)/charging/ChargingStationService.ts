import { ChargingStation } from '../../../types/charging.types';
import { mockChargingStationsThai } from '../../../data/mockChargingStations';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Service for managing charging station data and API calls
 */
export class ChargingStationService {
  private static instance: ChargingStationService;
  private stations: ChargingStation[] = [];

  private constructor() {}

  public static getInstance(): ChargingStationService {
    if (!ChargingStationService.instance) {
      ChargingStationService.instance = new ChargingStationService();
    }
    return ChargingStationService.instance;
  }

  /**
   * Get JWT token from AsyncStorage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Load all charging stations from API
   */
  public async loadChargingStations(): Promise<ChargingStation[]> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        console.warn('No auth token found, using mock data');
        this.stations = mockChargingStationsThai;
        return this.stations;
      }

      // Call the API to get all stations
      const response = await fetch(`${API_URL}/api/stations?page=1&limit=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('API error:', response.status);
        // Fallback to mock data if API fails
        this.stations = mockChargingStationsThai;
        return this.stations;
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Transform API response to ChargingStation format
        this.stations = this.transformStationsFromAPI(data.data);
        console.log(`Loaded ${this.stations.length} stations from API`);
      } else {
        console.warn('Invalid API response, using mock data');
        this.stations = mockChargingStationsThai;
      }

      return this.stations;
    } catch (error) {
      console.error('Error loading charging stations:', error);
      // Fallback to mock data on error
      this.stations = mockChargingStationsThai;
      return this.stations;
    }
  }

  /**
   * Transform API station data to ChargingStation format
   */
  private transformStationsFromAPI(apiStations: any[]): ChargingStation[] {
    return apiStations.map((station) => {
      console.log('Transforming station:', station.stationname);

      // Count total charge points by status
      const availableCount = station.charge_points?.filter(
        (cp: any) => cp.chargepointstatus === 'AVAILABLE'
      ).length || 0;

      const inUseCount = station.charge_points?.filter(
        (cp: any) => cp.chargepointstatus === 'OCCUPIED' || cp.chargepointstatus === 'CHARGING'
      ).length || 0;

      const offlineCount = station.charge_points?.filter(
        (cp: any) => cp.chargepointstatus === 'UNAVAILABLE' || cp.chargepointstatus === 'FAULTED'
      ).length || 0;

      // Determine overall station status
      let status: 'available' | 'in-use' | 'offline' = 'offline';
      if (availableCount > 0) {
        status = 'available';
      } else if (inUseCount > 0) {
        status = 'in-use';
      }

      // Count connectors by type (AC/DC) and collect unique types
      let acCount = 0;
      let dcCount = 0;
      const connectorTypesSet = new Set<string>();

      station.charge_points?.forEach((cp: any) => {
        cp.connectors?.forEach((connector: any) => {
          const connectorType = connector.type || '';

          if (connectorType) {
            connectorTypesSet.add(connectorType);
          }

          // DC types: CHADEMO, CCS_COMBO_1, CCS_COMBO_2, GB_T
          if (['CHADEMO', 'CCS_COMBO_1', 'CCS_COMBO_2', 'GB_T'].includes(connectorType)) {
            dcCount++;
          }
          // AC types: TYPE_1, TYPE_2, TESLA
          else if (['TYPE_1', 'TYPE_2', 'TESLA'].includes(connectorType)) {
            acCount++;
          }
        });
      });

      // Get maximum power rating from all charge points
      const maxPower = station.charge_points?.reduce((max: number, cp: any) => {
        return Math.max(max, cp.powerRating || 0);
      }, 0) || 0;

      // Get pricing - prioritize off-peak rate, fallback to on-peak
      const pricePerUnit = station.offPeakRate || station.onPeakRate || 0;

      // Parse opening hours (format: "06:00-22:00" or "24 ชั่วโมง")
      let openTime = '00:00';
      let closeTime = '23:59';

      if (station.openclosedays) {
        if (station.openclosedays.includes('-')) {
          const [open, close] = station.openclosedays.split('-');
          openTime = open.trim();
          closeTime = close.trim();
        } else if (station.openclosedays.includes('24')) {
          openTime = '00:00';
          closeTime = '23:59';
        }
      }

      const transformed = {
        id: station.id,
        name: station.stationname,
        address: station.location || 'ไม่ระบุที่อยู่',
        latitude: station.latitude ? parseFloat(station.latitude) : 0,
        longitude: station.longitude ? parseFloat(station.longitude) : 0,
        status: status,
        acCount: acCount,
        dcCount: dcCount,
        power: `${maxPower.toFixed(2)} kW`,
        pricePerUnit: pricePerUnit,
        openTime: openTime,
        closeTime: closeTime,
        // ข้อมูลเพิ่มเติม
        onPeakRate: station.onPeakRate || 0,
        offPeakRate: station.offPeakRate || 0,
        onPeakStartTime: station.onPeakStartTime || '',
        onPeakEndTime: station.onPeakEndTime || '',
        connectorTypes: Array.from(connectorTypesSet),
      };

      console.log('Transformed result:', {
        name: transformed.name,
        acCount: transformed.acCount,
        dcCount: transformed.dcCount,
        power: transformed.power,
        pricePerUnit: transformed.pricePerUnit,
        openTime: transformed.openTime,
        closeTime: transformed.closeTime,
      });

      return transformed;
    }).filter((station) => station.latitude !== 0 && station.longitude !== 0); // Filter out stations without coordinates
  }

  /**
   * Load nearby stations from API
   */
  public async loadNearbyStations(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<ChargingStation[]> {
    try {
      const token = await this.getAuthToken();

      if (!token) {
        console.warn('No auth token found, using local filtering');
        return this.getNearbyStations(latitude, longitude, radiusKm);
      }

      // Call the nearby stations API
      const response = await fetch(
        `${API_URL}/api/stations/nearby/search?latitude=${latitude}&longitude=${longitude}&radius=${radiusKm}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('API error:', response.status);
        // Fallback to local filtering
        return this.getNearbyStations(latitude, longitude, radiusKm);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return this.transformStationsFromAPI(data.data);
      } else {
        return this.getNearbyStations(latitude, longitude, radiusKm);
      }
    } catch (error) {
      console.error('Error loading nearby stations:', error);
      return this.getNearbyStations(latitude, longitude, radiusKm);
    }
  }

  /**
   * Get all charging stations
   */
  public getChargingStations(): ChargingStation[] {
    return this.stations;
  }

  /**
   * Search charging stations by query
   */
  public searchStations(query: string): ChargingStation[] {
    if (!query.trim()) {
      return this.stations;
    }

    const lowerQuery = query.toLowerCase();
    return this.stations.filter(
      station =>
        station.name.toLowerCase().includes(lowerQuery) ||
        station.address.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Find charging station by ID
   */
  public findStationById(id: string): ChargingStation | undefined {
    return this.stations.find(station => station.id === id);
  }

  /**
   * Get stations by status
   */
  public getStationsByStatus(status: ChargingStation['status']): ChargingStation[] {
    return this.stations.filter(station => station.status === status);
  }

  /**
   * Get nearby stations within a radius (in km)
   */
  public getNearbyStations(
    userLat: number,
    userLng: number,
    radiusKm: number = 10
  ): ChargingStation[] {
    return this.stations.filter(station => {
      const distance = this.calculateDistance(
        userLat,
        userLng,
        station.latitude,
        station.longitude
      );
      return distance <= radiusKm;
    });
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate estimated travel time in minutes
   */
  public calculateTravelDuration(distanceKm: number, averageSpeedKmh: number = 40): number {
    return (distanceKm / averageSpeedKmh) * 60;
  }

  /**
   * Format distance text for display
   */
  public formatDistanceText(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} ม.`;
    } else {
      return `${distanceKm.toFixed(1)} กม.`;
    }
  }

  /**
   * Format duration text for display
   */
  public formatDurationText(durationMinutes: number): string {
    if (durationMinutes < 1) {
      return "< 1 นาที";
    } else if (durationMinutes < 60) {
      return `${Math.round(durationMinutes)} นาที`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const mins = Math.round(durationMinutes % 60);
      return `${hours} ชม. ${mins} นาที`;
    }
  }

  /**
   * Get distance and duration information between user and station
   */
  public getDistanceInfo(
    userLat: number,
    userLng: number,
    station: ChargingStation
  ): {
    distance: number;
    distanceText: string;
    duration: number;
    durationText: string;
  } {
    const distance = this.calculateDistance(userLat, userLng, station.latitude, station.longitude);
    const duration = this.calculateTravelDuration(distance);

    return {
      distance,
      distanceText: this.formatDistanceText(distance),
      duration,
      durationText: this.formatDurationText(duration),
    };
  }

  /**
   * Get marker color based on station status
   */
  public getMarkerColor(status: ChargingStation['status']): string {
    switch (status) {
      case 'available':
        return '#10b981'; // Green
      case 'in-use':
        return '#f59e0b'; // Orange
      case 'offline':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  }

  /**
   * Get status text in Thai
   */
  public getStatusText(status: ChargingStation['status']): string {
    switch (status) {
      case 'available':
        return 'ว่าง';
      case 'in-use':
        return 'ใช้งาน';
      case 'offline':
        return 'ออฟไลน์';
      default:
        return 'ไม่ทราบสถานะ';
    }
  }

  /**
   * Sort stations by distance from user location
   */
  public sortStationsByDistance(
    stations: ChargingStation[],
    userLat: number,
    userLng: number
  ): ChargingStation[] {
    return [...stations].sort((a, b) => {
      const distanceA = this.calculateDistance(userLat, userLng, a.latitude, a.longitude);
      const distanceB = this.calculateDistance(userLat, userLng, b.latitude, b.longitude);
      return distanceA - distanceB;
    });
  }

  /**
   * Filter stations by multiple criteria
   */
  public filterStations(filters: {
    status?: ChargingStation['status'];
    hasAC?: boolean;
    hasDC?: boolean;
    minPower?: number;
    maxPrice?: number;
  }): ChargingStation[] {
    return this.stations.filter(station => {
      if (filters.status && station.status !== filters.status) {
        return false;
      }

      if (filters.hasAC && !station.acCount) {
        return false;
      }

      if (filters.hasDC && !station.dcCount) {
        return false;
      }

      if (filters.minPower && station.power) {
        const powerValue = parseFloat(station.power.split(' ')[0]);
        if (powerValue < filters.minPower) {
          return false;
        }
      }

      if (filters.maxPrice && station.pricePerUnit && station.pricePerUnit > filters.maxPrice) {
        return false;
      }

      return true;
    });
  }
}

export default ChargingStationService;