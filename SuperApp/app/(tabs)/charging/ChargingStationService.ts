import { ChargingStation } from '../../../types/charging.types';
import { mockChargingStationsThai } from '../../../data/mockChargingStations';

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
   * Load all charging stations (currently using mock data)
   */
  public async loadChargingStations(): Promise<ChargingStation[]> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use mock data for now
      this.stations = mockChargingStationsThai;
      return this.stations;
    } catch (error) {
      console.error('Error loading charging stations:', error);
      throw error;
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