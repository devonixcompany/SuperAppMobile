import axios from 'axios';
import { API_CONFIG } from '../config/api.config';
import { ChargingStation } from '../types/charging.types';

/**
 * Charging Station API Service
 * Service สำหรับจัดการข้อมูลสถานีชาร์จ
 */

export interface ChargingStationResponse {
  id: string;
  chargepointname: string;
  location: string;
  latitude: number;
  longitude: number;
  chargepointstatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OFFLINE';
  connectorCount: number;
  powerRating: number;
  onPeakRate: number;
  offPeakRate: number;
  openingHours?: string;
  is24Hours: boolean;
  brand?: string;
  connectors?: {
    id: string;
    connectorType: string;
    maxPower: number;
    status: string;
  }[];
}

/**
 * แปลง status จาก API เป็น status ของ UI
 */
function mapStatus(status: ChargingStationResponse['chargepointstatus']): ChargingStation['status'] {
  switch (status) {
    case 'AVAILABLE':
      return 'available';
    case 'OCCUPIED':
      return 'in-use';
    case 'MAINTENANCE':
    case 'OFFLINE':
      return 'offline';
    default:
      return 'offline';
  }
}

/**
 * แปลงข้อมูลจาก API response เป็น ChargingStation type
 */
function transformChargingStation(data: ChargingStationResponse): ChargingStation {
  // นับจำนวน AC และ DC connectors
  const acCount = data.connectors?.filter(c => c.connectorType.includes('AC')).length || 0;
  const dcCount = data.connectors?.filter(c => c.connectorType.includes('DC')).length || 0;
  
  // แยกเวลาเปิด-ปิด
  const [openTime, closeTime] = data.is24Hours 
    ? ['24 ชม.', '24 ชม.'] 
    : (data.openingHours?.split('-') || ['08.00', '20.00']);

  return {
    id: data.id,
    name: data.chargepointname,
    address: data.location,
    latitude: data.latitude,
    longitude: data.longitude,
    status: mapStatus(data.chargepointstatus),
    acCount,
    dcCount,
    power: `${data.powerRating.toFixed(2)} (kW)`,
    pricePerUnit: data.onPeakRate,
    openTime: openTime.trim(),
    closeTime: closeTime.trim(),
  };
}

/**
 * ดึงรายการสถานีชาร์จทั้งหมด
 */
export async function getChargingStations(
  token?: string
): Promise<ChargingStation[]> {
  try {
    const headers = token 
      ? API_CONFIG.HEADERS.WITH_AUTH(token)
      : API_CONFIG.HEADERS.DEFAULT;

    const response = await axios.get<ChargingStationResponse[]>(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHARGEPOINT.LIST}`,
      {
        headers,
        timeout: API_CONFIG.REQUEST.TIMEOUT,
        params: {
          isPublic: true, // แสดงเฉพาะสถานีสาธารณะ
        }
      }
    );

    return response.data.map(transformChargingStation);
  } catch (error) {
    console.error('Error fetching charging stations:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลสถานีชาร์จเฉพาะ
 */
export async function getChargingStationById(
  id: string,
  token?: string
): Promise<ChargingStation> {
  try {
    const headers = token 
      ? API_CONFIG.HEADERS.WITH_AUTH(token)
      : API_CONFIG.HEADERS.DEFAULT;

    const response = await axios.get<ChargingStationResponse>(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHARGEPOINT.DETAILS(id)}`,
      {
        headers,
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      }
    );

    return transformChargingStation(response.data);
  } catch (error) {
    console.error('Error fetching charging station:', error);
    throw error;
  }
}

/**
 * ค้นหาสถานีชาร์จใกล้เคียง
 */
export async function searchNearbyChargingStations(
  latitude: number,
  longitude: number,
  radius: number = 5, // km
  token?: string
): Promise<ChargingStation[]> {
  try {
    const headers = token 
      ? API_CONFIG.HEADERS.WITH_AUTH(token)
      : API_CONFIG.HEADERS.DEFAULT;

    const response = await axios.get<ChargingStationResponse[]>(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHARGEPOINT.LIST}`,
      {
        headers,
        timeout: API_CONFIG.REQUEST.TIMEOUT,
        params: {
          latitude,
          longitude,
          radius,
          isPublic: true,
        }
      }
    );

    return response.data.map(transformChargingStation);
  } catch (error) {
    console.error('Error searching nearby charging stations:', error);
    throw error;
  }
}

/**
 * ค้นหาสถานีชาร์จด้วย keyword
 */
export async function searchChargingStations(
  keyword: string,
  token?: string
): Promise<ChargingStation[]> {
  try {
    const headers = token 
      ? API_CONFIG.HEADERS.WITH_AUTH(token)
      : API_CONFIG.HEADERS.DEFAULT;

    const response = await axios.get<ChargingStationResponse[]>(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHARGEPOINT.LIST}`,
      {
        headers,
        timeout: API_CONFIG.REQUEST.TIMEOUT,
        params: {
          search: keyword,
          isPublic: true,
        }
      }
    );

    return response.data.map(transformChargingStation);
  } catch (error) {
    console.error('Error searching charging stations:', error);
    throw error;
  }
}

/**
 * ดึงสถานะของสถานีชาร์จ
 */
export async function getChargingStationStatus(
  identity: string,
  token?: string
): Promise<any> {
  try {
    const headers = token 
      ? API_CONFIG.HEADERS.WITH_AUTH(token)
      : API_CONFIG.HEADERS.DEFAULT;

    const response = await axios.get(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHARGEPOINT.STATUS(identity)}`,
      {
        headers,
        timeout: API_CONFIG.REQUEST.TIMEOUT,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching charging station status:', error);
    throw error;
  }
}
