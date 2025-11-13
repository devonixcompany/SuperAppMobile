/**
 * Types for Charging Station
 */

export interface ChargingStation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'available' | 'in-use' | 'offline';
  acCount?: number;  // จำนวนหัวชาร์จ AC
  dcCount?: number;  // จำนวนหัวชาร์จ DC
  power?: string;    // กำลังไฟสูงสุด เช่น "22.00 kW"
  pricePerUnit?: number; // ราคาต่อหน่วย (บาท/kWh)
  openTime?: string;  // เวลาเปิด เช่น "06:00"
  closeTime?: string; // เวลาปิด เช่น "22:00"
  distance?: number;  // ระยะทาง (km)
  // ข้อมูลเพิ่มเติมจาก API
  onPeakRate?: number;      // ราคาช่วง Peak (บาท/kWh)
  offPeakRate?: number;     // ราคาช่วง Off-Peak (บาท/kWh)
  onPeakStartTime?: string; // เวลาเริ่ม Peak
  onPeakEndTime?: string;   // เวลาสิ้นสุด Peak
  connectorTypes?: string[]; // ประเภทหัวชาร์จทั้งหมด เช่น ['TYPE_2', 'CHADEMO']
}

export interface MarkerColor {
  available: string;
  'in-use': string;
  offline: string;
}

/**
 * Connector types enum
 */
export enum ConnectorType {
  TYPE_1 = 'TYPE_1',
  TYPE_2 = 'TYPE_2',
  CHADEMO = 'CHADEMO',
  CCS_COMBO_1 = 'CCS_COMBO_1',
  CCS_COMBO_2 = 'CCS_COMBO_2',
  TESLA = 'TESLA',
  GB_T = 'GB_T',
}

/**
 * Connector type display names
 */
export const ConnectorTypeNames: Record<string, string> = {
  TYPE_1: 'Type 1 (J1772)',
  TYPE_2: 'Type 2 (Mennekes)',
  CHADEMO: 'CHAdeMO',
  CCS_COMBO_1: 'CCS Combo 1',
  CCS_COMBO_2: 'CCS Combo 2',
  TESLA: 'Tesla',
  GB_T: 'GB/T',
};
