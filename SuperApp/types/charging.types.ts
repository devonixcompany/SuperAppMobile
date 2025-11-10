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
  power?: string;    // กำลังไฟ เช่น "0.00 (kW)"
  pricePerUnit?: number; // ราคาต่อหน่วย
  openTime?: string;  // เวลาเปิด
  closeTime?: string; // เวลาปิด
  distance?: number;  // ระยะทาง (km)
}

export interface MarkerColor {
  available: string;
  'in-use': string;
  offline: string;
}
