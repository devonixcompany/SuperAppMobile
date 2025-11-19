import { ChargingStation } from '../../../types/charging.types';
import { mockChargingStationsThai } from '../../../data/mockChargingStations';
import { http } from '../../../services/api/client';

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
   * Load all charging stations from API
   * เรียก API ใหม่ทุกครั้ง (ไม่ใช้ cache)
   */
  public async loadChargingStations(): Promise<ChargingStation[]> {
    try {
      console.log('🔌 Loading charging stations from API...');

      // เรียก API ผ่าน http client (จัดการ token อัตโนมัติ)
      const response = await http.get<any[]>('/api/v1/user/stations?page=1&limit=100');

      console.log('📡 API Response:', {
        success: response.success,
        dataCount: response.data?.length || 0,
        message: response.message || 'No message',
      });

      if (response.success && response.data) {
        // Transform API response to ChargingStation format
        const freshStations = this.transformStationsFromAPI(response.data);

        // อัปเดต cache ด้วยข้อมูลใหม่
        this.stations = freshStations;

        console.log(`✅ Loaded ${freshStations.length} stations from API`);
        return freshStations;
      } else {
        console.warn('⚠️ Invalid API response, using mock data');
        this.stations = mockChargingStationsThai;
        return this.stations;
      }
    } catch (error) {
      console.error('❌ Error loading charging stations:', error);
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

      const connectorList = (station.charge_points || []).flatMap((cp: any) => cp.connectors || []);
      const connectorsAvailable = connectorList.filter((c: any) => c.connectorstatus === 'AVAILABLE').length;
      const connectorsTotal = connectorList.length;
      const availableCount = connectorsTotal > 0
        ? connectorsAvailable
        : (station.charge_points?.filter((cp: any) => cp.chargepointstatus === 'AVAILABLE').length || 0);
      const inUseCount = connectorsTotal > 0
        ? (connectorsTotal - connectorsAvailable)
        : (station.charge_points?.filter((cp: any) => cp.chargepointstatus === 'OCCUPIED' || cp.chargepointstatus === 'CHARGING').length || 0);

      // Determine overall station status
      let status: 'available' | 'in-use' | 'offline' = 'offline';
      if (availableCount > 0) {
        status = 'available';
      } else if (inUseCount > 0) {
        status = 'in-use';
      }

      // Count connectors by type (AC/DC)
      // ถ้า powerRating >= 50 kW = DC, ต่ำกว่านั้น = AC
      let acCount = 0;
      let dcCount = 0;
      const connectorTypesSet = new Set<string>();

      station.charge_points?.forEach((cp: any) => {
        const power = cp.powerRating || 0;
        const count = cp.connectorCount || 0;

        // ตรวจสอบว่าเป็น DC หรือ AC จากกำลังไฟ
        if (power >= 50) {
          dcCount += count;
          connectorTypesSet.add('DC');
        } else if (power > 0) {
          acCount += count;
          connectorTypesSet.add('AC');
        }
      });

      // Get maximum power rating from all charge points
      const maxPower = station.charge_points?.reduce((max: number, cp: any) => {
        return Math.max(max, cp.powerRating || 0);
      }, 0) || 0;

      // Get pricing - prioritize off-peak rate, fallback to on-peak
      const pricePerUnit = station.offPeakRate || station.onPeakRate || 0;

      // Parse opening hours
      // ถ้าไม่มีข้อมูล ใช้เวลา Peak เป็นเวลาเปิด-ปิด
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
      } else if (station.onPeakStartTime && station.onPeakEndTime) {
        // ใช้เวลา Peak เป็นค่าเริ่มต้น
        openTime = station.onPeakStartTime;
        closeTime = station.onPeakEndTime;
      }

      const totalCount = connectorsTotal > 0
        ? connectorsTotal
        : (station.charge_points?.reduce((sum: number, cp: any) => sum + (cp.connectorCount || 0), 0) || 0);

      const transformed = {
        id: station.id,
        name: station.stationname,
        address: station.location || 'ไม่ระบุที่อยู่',
        latitude: station.latitude ? parseFloat(station.latitude) : 0,
        longitude: station.longitude ? parseFloat(station.longitude) : 0,
        status: status,
        acCount: acCount,
        dcCount: dcCount,
        availableCount: availableCount,
        inUseCount: inUseCount,
        totalCount: totalCount,
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
        connectors: connectorList.map((c: any) => ({
          connectorId: c.connectorId,
          connectorstatus: c.connectorstatus,
          type: c.type,
          maxPower: c.maxPower,
        })),
      };

      console.log('✅ Transformed station:', {
        name: transformed.name,
        status: transformed.status,
        acCount: transformed.acCount,
        dcCount: transformed.dcCount,
        power: transformed.power,
        pricePerUnit: `${transformed.pricePerUnit} บาท/kWh`,
        hours: `${transformed.openTime} - ${transformed.closeTime}`,
        location: `${transformed.latitude}, ${transformed.longitude}`,
        chargePoints: station.charge_points?.length || 0,
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
      console.log('🔌 Loading nearby stations from API...');

      // เรียก API ผ่าน http client (จัดการ token อัตโนมัติ)
      const response = await http.get<any[]>(
        `/api/v1/user/stations/nearby/search?latitude=${latitude}&longitude=${longitude}&radius=${radiusKm}`
      );

      if (response.success && response.data) {
        const stations = this.transformStationsFromAPI(response.data);
        console.log(`✅ Loaded ${stations.length} nearby stations from API`);
        return stations;
      } else {
        console.warn('⚠️ Invalid API response, using local filtering');
        return this.getNearbyStations(latitude, longitude, radiusKm);
      }
    } catch (error) {
      console.error('❌ Error loading nearby stations:', error);
      // Fallback to local filtering
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

  public getStationColor(station: ChargingStation): string {
    const total = station.totalCount ?? 0;
    const available = station.availableCount ?? 0;
    if (total > 0) {
      if (available === 0) return '#ef4444';
      if (available === total) return '#10b981';
      return '#f59e0b';
    }
    return this.getMarkerColor(station.status);
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