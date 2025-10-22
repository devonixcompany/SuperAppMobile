// Real-time Data Manager
// จัดการข้อมูลเรียลไทม์สำหรับส่งไป Frontend

import WebSocket from 'ws';
import { gatewaySessionManager, ChargePointEntry } from '../handlers/gatewaySessionManager';
import { sessionValidator } from './sessionValidator';
import {
  ChargingData,
  ConnectorStatus,
  ChargingDataMessage,
  StatusMessage,
  FrontendConnection
} from './types';

// ข้อมูลการชาร์จที่เก็บไว้ในหน่วยความจำ
// In-memory charging data storage
interface StoredChargingData {
  chargePointId: string;
  connectorId: number;
  data: ChargingData;
  lastUpdated: Date;
  transactionActive: boolean;
}

// การตั้งค่าการจัดการข้อมูลเรียลไทม์
// Real-time data management settings
export interface RealTimeDataSettings {
  dataUpdateIntervalMs: number;        // ช่วงเวลาอัปเดตข้อมูล
  meterValueIntervalMs: number;        // ช่วงเวลาอ่านค่ามิเตอร์
  statusUpdateIntervalMs: number;      // ช่วงเวลาอัปเดตสถานะ
  dataRetentionMs: number;             // เวลาเก็บข้อมูลในหน่วยความจำ
  simulateData: boolean;               // จำลองข้อมูลหรือไม่
}

// ค่าเริ่มต้นการตั้งค่า
export const DEFAULT_REALTIME_SETTINGS: RealTimeDataSettings = {
  dataUpdateIntervalMs: 5000,          // อัปเดตทุก 5 วินาที
  meterValueIntervalMs: 10000,         // อ่านมิเตอร์ทุก 10 วินาที
  statusUpdateIntervalMs: 3000,        // อัปเดตสถานะทุก 3 วินาที
  dataRetentionMs: 60 * 60 * 1000,     // เก็บข้อมูล 1 ชั่วโมง
  simulateData: true                   // ใช้ข้อมูลจำลอง
};

/**
 * คลาสจัดการข้อมูลเรียลไทม์
 * Real-time Data Manager class
 */
export class RealTimeDataManager {
  private settings: RealTimeDataSettings;
  private chargingDataStore: Map<string, StoredChargingData> = new Map();
  private dataUpdateInterval: NodeJS.Timeout | null = null;
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private meterValueInterval: NodeJS.Timeout | null = null;
  private frontendConnections: Map<string, FrontendConnection> = new Map();

  constructor(settings: RealTimeDataSettings = DEFAULT_REALTIME_SETTINGS) {
    this.settings = settings;
    this.startDataCollection();
    console.log('🚀 Real-time Data Manager เริ่มทำงาน');
  }

  /**
   * เริ่มการเก็บรวบรวมข้อมูล
   * Start data collection
   */
  private startDataCollection(): void {
    // เริ่มการอัปเดตข้อมูลการชาร์จ
    this.dataUpdateInterval = setInterval(() => {
      this.updateChargingData();
    }, this.settings.dataUpdateIntervalMs);

    // เริ่มการอัปเดตสถานะ
    this.statusUpdateInterval = setInterval(() => {
      this.updateConnectorStatus();
    }, this.settings.statusUpdateIntervalMs);

    // เริ่มการอ่านค่ามิเตอร์
    this.meterValueInterval = setInterval(() => {
      this.requestMeterValues();
    }, this.settings.meterValueIntervalMs);

    console.log('📊 เริ่มการเก็บรวบรวมข้อมูลเรียลไทม์');
  }

  /**
   * อัปเดตข้อมูลการชาร์จ
   * Update charging data
   */
  private updateChargingData(): void {
    const allChargePoints = gatewaySessionManager.getAllChargePoints();

    for (const chargePoint of allChargePoints) {
      // ตรวจสอบสถานะการเชื่อมต่อ
      const validation = sessionValidator.validateSession(chargePoint.chargePointId, 1);
      
      if (!validation.isOnline) {
        // หากออฟไลน์ อัปเดตสถานะเป็น UNAVAILABLE
        this.updateConnectorStatusForChargePoint(chargePoint, ConnectorStatus.UNAVAILABLE);
        continue;
      }

      // อัปเดตข้อมูลสำหรับแต่ละหัวชาร์จ
      for (let connectorId = 1; connectorId <= chargePoint.connectorCount; connectorId++) {
        this.updateConnectorData(chargePoint, connectorId);
      }
    }

    // ทำความสะอาดข้อมูลเก่า
    this.cleanupOldData();
  }

  /**
   * อัปเดตข้อมูลหัวชาร์จ
   * Update connector data
   */
  private updateConnectorData(chargePoint: ChargePointEntry, connectorId: number): void {
    const key = `${chargePoint.chargePointId}-${connectorId}`;
    const existingData = this.chargingDataStore.get(key);
    
    let chargingData: ChargingData;

    if (this.settings.simulateData) {
      // สร้างข้อมูลจำลอง
      chargingData = this.generateSimulatedData(chargePoint.chargePointId, connectorId, existingData?.data);
    } else {
      // ดึงข้อมูลจริงจาก OCPP (ต้องพัฒนาต่อ)
      chargingData = this.getRealChargingData(chargePoint, connectorId);
    }

    // เก็บข้อมูลในหน่วยความจำ
    const storedData: StoredChargingData = {
      chargePointId: chargePoint.chargePointId,
      connectorId,
      data: chargingData,
      lastUpdated: new Date(),
      transactionActive: chargingData.status === ConnectorStatus.CHARGING
    };

    this.chargingDataStore.set(key, storedData);

    // ส่งข้อมูลไป frontend ที่เชื่อมต่ออยู่
    this.broadcastChargingData(chargePoint.chargePointId, connectorId, chargingData);
  }

  /**
   * สร้างข้อมูลจำลอง
   * Generate simulated data
   */
  private generateSimulatedData(chargePointId: string, connectorId: number, previousData?: ChargingData): ChargingData {
    const now = new Date();
    
    // สุ่มสถานะการชาร์จ
    const statuses = [
      ConnectorStatus.AVAILABLE,
      ConnectorStatus.CHARGING,
      ConnectorStatus.PREPARING,
      ConnectorStatus.FINISHING
    ];
    
    let status = previousData?.status || ConnectorStatus.AVAILABLE;
    
    // จำลองการเปลี่ยนสถานะ (5% โอกาส)
    if (Math.random() < 0.05) {
      status = statuses[Math.floor(Math.random() * statuses.length)];
    }

    // สร้างข้อมูลตามสถานะ
    let chargingPercentage = previousData?.chargingPercentage || 0;
    let currentPower = 0;
    let currentMeter = previousData?.currentMeter || Math.random() * 1000;
    let energyDelivered = previousData?.energyDelivered || 0;

    if (status === ConnectorStatus.CHARGING) {
      // กำลังชาร์จ - เพิ่มค่าต่างๆ
      chargingPercentage = Math.min(100, (previousData?.chargingPercentage || 0) + Math.random() * 2);
      currentPower = 7 + Math.random() * 15; // 7-22 kW
      currentMeter += Math.random() * 0.1; // เพิ่มมิเตอร์
      energyDelivered = (previousData?.energyDelivered || 0) + Math.random() * 0.05;
    } else if (status === ConnectorStatus.PREPARING) {
      currentPower = Math.random() * 2; // พลังงานต่ำขณะเตรียม
    }

    return {
      connectorId,
      status,
      chargingPercentage: Math.round(chargingPercentage * 100) / 100,
      currentPower: Math.round(currentPower * 100) / 100,
      currentMeter: Math.round(currentMeter * 1000) / 1000,
      voltage: 220 + Math.random() * 20, // 220-240V
      current: currentPower > 0 ? currentPower / 230 * 1000 : 0, // คำนวณกระแสจากพลังงาน
      temperature: 25 + Math.random() * 15, // 25-40°C
      sessionId: status === ConnectorStatus.CHARGING ? `session-${chargePointId}-${connectorId}` : undefined,
      transactionId: status === ConnectorStatus.CHARGING ? Math.floor(Math.random() * 10000) : undefined,
      startTime: status === ConnectorStatus.CHARGING ? (previousData?.startTime || now) : undefined,
      duration: status === ConnectorStatus.CHARGING ? 
        Math.floor((now.getTime() - (previousData?.startTime?.getTime() || now.getTime())) / 1000) : undefined,
      energyDelivered: Math.round(energyDelivered * 1000) / 1000,
      cost: energyDelivered * 4.5 // ราคา 4.5 บาท/kWh
    };
  }

  /**
   * ดึงข้อมูลการชาร์จจริงจาก OCPP
   * Get real charging data from OCPP
   */
  private getRealChargingData(chargePoint: ChargePointEntry, connectorId: number): ChargingData {
    // TODO: ใช้ข้อมูลจริงจาก OCPP messages
    // ในการพัฒนาจริง ควรดึงข้อมูลจาก:
    // - StatusNotification messages
    // - MeterValues messages  
    // - StartTransaction/StopTransaction messages
    
    return {
      connectorId,
      status: ConnectorStatus.AVAILABLE,
      chargingPercentage: 0,
      currentPower: 0,
      currentMeter: 0
    };
  }

  /**
   * อัปเดตสถานะหัวชาร์จ
   * Update connector status
   */
  private updateConnectorStatus(): void {
    const allChargePoints = gatewaySessionManager.getAllChargePoints();

    for (const chargePoint of allChargePoints) {
      const validation = sessionValidator.validateSession(chargePoint.chargePointId, 1);
      
      if (!validation.isOnline) {
        this.updateConnectorStatusForChargePoint(chargePoint, ConnectorStatus.UNAVAILABLE);
      }
    }
  }

  /**
   * อัปเดตสถานะสำหรับเครื่องชาร์จ
   * Update status for charge point
   */
  private updateConnectorStatusForChargePoint(chargePoint: ChargePointEntry, status: ConnectorStatus): void {
    for (let connectorId = 1; connectorId <= chargePoint.connectorCount; connectorId++) {
      const statusMessage: StatusMessage = {
        type: 'status',
        timestamp: new Date(),
        data: {
          chargePointId: chargePoint.chargePointId,
          connectorId,
          status,
          isOnline: status !== ConnectorStatus.UNAVAILABLE,
          message: status === ConnectorStatus.UNAVAILABLE ? 'เครื่องชาร์จออฟไลน์' : 'เครื่องชาร์จออนไลน์'
        }
      };

      this.broadcastStatusUpdate(chargePoint.chargePointId, connectorId, statusMessage);
    }
  }

  /**
   * ขอค่ามิเตอร์จากเครื่องชาร์จ
   * Request meter values from charge points
   */
  private requestMeterValues(): void {
    const allChargePoints = gatewaySessionManager.getAllChargePoints();

    for (const chargePoint of allChargePoints) {
      const validation = sessionValidator.validateSession(chargePoint.chargePointId, 1);
      
      if (validation.isOnline) {
        // ส่ง GetMeterValues request (ตัวอย่าง)
        const meterValuesRequest = [
          2, // CALL
          `meter-values-${Date.now()}`,
          'GetMeterValues',
          {
            connectorId: 0, // 0 = ทุกหัวชาร์จ
            measurand: ['Energy.Active.Import.Register', 'Power.Active.Import', 'Current.Import', 'Voltage']
          }
        ];

        gatewaySessionManager.sendMessage(chargePoint.chargePointId, meterValuesRequest);
      }
    }
  }

  /**
   * ส่งข้อมูลการชาร์จไป frontend
   * Broadcast charging data to frontend
   */
  private broadcastChargingData(chargePointId: string, connectorId: number, data: ChargingData): void {
    const message: ChargingDataMessage = {
      type: 'charging_data',
      timestamp: new Date(),
      data
    };

    // ส่งไปยัง frontend ที่เชื่อมต่อกับหัวชาร์จนี้
    for (const [connectionId, connection] of this.frontendConnections) {
      if (connection.chargePointId === chargePointId && 
          connection.connectorId === connectorId && 
          connection.isActive &&
          connection.ws.readyState === WebSocket.OPEN) {
        
        try {
          connection.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`❌ Error sending charging data to ${connectionId}:`, error);
          connection.isActive = false;
        }
      }
    }
  }

  /**
   * ส่งการอัปเดตสถานะไป frontend
   * Broadcast status update to frontend
   */
  private broadcastStatusUpdate(chargePointId: string, connectorId: number, message: StatusMessage): void {
    for (const [connectionId, connection] of this.frontendConnections) {
      if (connection.chargePointId === chargePointId && 
          connection.connectorId === connectorId && 
          connection.isActive &&
          connection.ws.readyState === WebSocket.OPEN) {
        
        try {
          connection.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`❌ Error sending status update to ${connectionId}:`, error);
          connection.isActive = false;
        }
      }
    }
  }

  /**
   * ทำความสะอาดข้อมูลเก่า
   * Cleanup old data
   */
  private cleanupOldData(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, data] of this.chargingDataStore) {
      const age = now.getTime() - data.lastUpdated.getTime();
      if (age > this.settings.dataRetentionMs) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.chargingDataStore.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`🧹 ทำความสะอาดข้อมูลเก่า ${expiredKeys.length} รายการ`);
    }
  }

  /**
   * เพิ่มการเชื่อมต่อ frontend
   * Add frontend connection
   */
  public addFrontendConnection(connection: FrontendConnection): void {
    this.frontendConnections.set(connection.id, connection);
    console.log(`🔗 เพิ่มการเชื่อมต่อ frontend: ${connection.chargePointId}/connector-${connection.connectorId}`);

    // ส่งข้อมูลปัจจุบันให้ connection ใหม่
    const key = `${connection.chargePointId}-${connection.connectorId}`;
    const existingData = this.chargingDataStore.get(key);
    
    if (existingData) {
      const message: ChargingDataMessage = {
        type: 'charging_data',
        timestamp: new Date(),
        data: existingData.data
      };

      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Error sending initial data to ${connection.id}:`, error);
      }
    }
  }

  /**
   * ลบการเชื่อมต่อ frontend
   * Remove frontend connection
   */
  public removeFrontendConnection(connectionId: string): void {
    const connection = this.frontendConnections.get(connectionId);
    if (connection) {
      console.log(`🔌 ลบการเชื่อมต่อ frontend: ${connection.chargePointId}/connector-${connection.connectorId}`);
      this.frontendConnections.delete(connectionId);
    }
  }

  /**
   * ดึงข้อมูลการชาร์จปัจจุบัน
   * Get current charging data
   */
  public getCurrentChargingData(chargePointId: string, connectorId: number): ChargingData | null {
    const key = `${chargePointId}-${connectorId}`;
    const storedData = this.chargingDataStore.get(key);
    return storedData ? storedData.data : null;
  }

  /**
   * ดึงสถิติข้อมูลเรียลไทม์
   * Get real-time data statistics
   */
  public getStats(): any {
    const activeTransactions = Array.from(this.chargingDataStore.values())
      .filter(data => data.transactionActive).length;
    
    const totalConnectors = this.chargingDataStore.size;
    const frontendConnections = this.frontendConnections.size;

    return {
      totalConnectors,
      activeTransactions,
      frontendConnections,
      dataRetentionMs: this.settings.dataRetentionMs,
      updateIntervals: {
        data: this.settings.dataUpdateIntervalMs,
        status: this.settings.statusUpdateIntervalMs,
        meterValue: this.settings.meterValueIntervalMs
      }
    };
  }

  /**
   * หยุดการทำงาน
   * Stop data manager
   */
  public stop(): void {
    console.log('🛑 หยุดการทำงาน Real-time Data Manager...');

    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
      this.dataUpdateInterval = null;
    }

    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }

    if (this.meterValueInterval) {
      clearInterval(this.meterValueInterval);
      this.meterValueInterval = null;
    }

    this.chargingDataStore.clear();
    this.frontendConnections.clear();

    console.log('✅ Real-time Data Manager หยุดทำงานแล้ว');
  }
}

// สร้าง instance ของ Real-time Data Manager
export const realTimeDataManager = new RealTimeDataManager();