// Types และ Interfaces สำหรับ Frontend WebSocket Connection
// Types and Interfaces for Frontend WebSocket Connection

import WebSocket from 'ws';

// สถานะการชาร์จของหัวชาร์จ
// Charging status of connector
export enum ConnectorStatus {
  AVAILABLE = 'Available',           // พร้อมใช้งาน
  PREPARING = 'Preparing',           // กำลังเตรียม
  CHARGING = 'Charging',             // กำลังชาร์จ
  SUSPENDED_EVSE = 'SuspendedEVSE',  // หยุดชั่วคราวจากเครื่อง
  SUSPENDED_EV = 'SuspendedEV',      // หยุดชั่วคราวจากรถ
  FINISHING = 'Finishing',           // กำลังจบการชาร์จ
  RESERVED = 'Reserved',             // จองไว้
  UNAVAILABLE = 'Unavailable',       // ไม่พร้อมใช้งาน
  FAULTED = 'Faulted'               // เกิดข้อผิดพลาด
}

// ข้อมูลการชาร์จปัจจุบัน
// Current charging information
export interface ChargingData {
  connectorId: number;               // หมายเลขหัวชาร์จ
  status: ConnectorStatus;           // สถานะปัจจุบัน
  chargingPercentage?: number;       // เปอร์เซ็นต์การชาร์จ (0-100)
  currentPower?: number;             // ค่าพลังงานปัจจุบัน (kW)
  currentMeter?: number;             // มิเตอร์ปัจจุบัน (kWh)
  voltage?: number;                  // แรงดันไฟฟ้า (V)
  current?: number;                  // กระแสไฟฟ้า (A)
  temperature?: number;              // อุณหภูมิ (°C)
  sessionId?: string;                // รหัส session การชาร์จ
  transactionId?: number;            // รหัสธุรกรรมการชาร์จ
  startTime?: Date;                  // เวลาเริ่มชาร์จ
  duration?: number;                 // ระยะเวลาชาร์จ (วินาที)
  energyDelivered?: number;          // พลังงานที่จ่ายแล้ว (kWh)
  cost?: number;                     // ค่าใช้จ่าย (บาท)
}

// ข้อมูลสถานะเครื่องชาร์จ
// Charge Point status information
export interface ChargePointStatus {
  chargePointId: string;             // รหัสเครื่องชาร์จ
  isOnline: boolean;                 // สถานะออนไลน์
  isAuthenticated: boolean;          // สถานะการยืนยันตัวตน
  lastSeen: Date;                    // เวลาที่เห็นล่าสุด
  lastHeartbeat: Date;               // เวลา heartbeat ล่าสุด
  connectorCount: number;            // จำนวนหัวชาร์จทั้งหมด
  connectors: ChargingData[];        // ข้อมูลหัวชาร์จทั้งหมด
  firmwareVersion?: string;          // เวอร์ชั่น firmware
  model?: string;                    // รุ่นเครื่องชาร์จ
  vendor?: string;                   // ผู้ผลิต
  serialNumber?: string;             // หมายเลขซีเรียล
}

// ข้อความที่ส่งไป Frontend
// Message sent to Frontend
export interface FrontendMessage {
  type: 'status' | 'charging_data' | 'error' | 'heartbeat';
  timestamp: Date;
  data: any;
}

// ข้อความสถานะ
// Status message
export interface StatusMessage extends FrontendMessage {
  type: 'status';
  data: {
    chargePointId: string;
    connectorId: number;
    status: ConnectorStatus;
    isOnline: boolean;
    message?: string;
  };
}

// ข้อความข้อมูลการชาร์จ
// Charging data message
export interface ChargingDataMessage extends FrontendMessage {
  type: 'charging_data';
  data: ChargingData;
}

// ข้อความข้อผิดพลาด
// Error message
export interface ErrorMessage extends FrontendMessage {
  type: 'error';
  data: {
    code: string;
    message: string;
    details?: any;
  };
}

// ข้อความ Heartbeat
// Heartbeat message
export interface HeartbeatMessage extends FrontendMessage {
  type: 'heartbeat';
  data: {
    timestamp: Date;
    connectedClients: number;
  };
}

// ข้อมูลการเชื่อมต่อ Frontend
// Frontend connection information
export interface FrontendConnection {
  id: string;                        // รหัสการเชื่อมต่อ
  chargePointId: string;             // รหัสเครื่องชาร์จที่ติดตาม
  connectorId: number;               // หมายเลขหัวชาร์จที่ติดตาม
  ws: WebSocket;                     // การเชื่อมต่อ WebSocket
  connectedAt: Date;                 // เวลาที่เชื่อมต่อ
  lastActivity: Date;                // กิจกรรมล่าสุด
  isActive: boolean;                 // สถานะการใช้งาน
}

// การตั้งค่าการส่งข้อมูล
// Data transmission settings
export interface TransmissionSettings {
  heartbeatInterval: number;         // ช่วงเวลา heartbeat (มิลลิวินาที)
  dataUpdateInterval: number;        // ช่วงเวลาอัปเดตข้อมูล (มิลลิวินาที)
  maxRetries: number;                // จำนวนครั้งสูงสุดที่ลองใหม่
  timeoutMs: number;                 // เวลา timeout (มิลลิวินาที)
}

// ค่าเริ่มต้นการตั้งค่า
// Default settings
export const DEFAULT_TRANSMISSION_SETTINGS: TransmissionSettings = {
  heartbeatInterval: 30000,          // 30 วินาที
  dataUpdateInterval: 5000,          // 5 วินาที
  maxRetries: 3,                     // ลองใหม่ 3 ครั้ง
  timeoutMs: 10000                   // timeout 10 วินาที
};