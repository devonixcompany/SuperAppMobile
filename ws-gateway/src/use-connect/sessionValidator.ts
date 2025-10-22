// Session Validator และ Middleware
// Session validation and middleware for charge point status checking

import WebSocket from 'ws';
import { gatewaySessionManager, ChargePointEntry } from '../handlers/gatewaySessionManager';
import { ConnectorStatus } from './types';

// ผลลัพธ์การตรวจสอบ session
// Session validation result
export interface SessionValidationResult {
  isValid: boolean;                    // session ถูกต้องหรือไม่
  isOnline: boolean;                   // เครื่องชาร์จออนไลน์หรือไม่
  chargePoint?: ChargePointEntry;      // ข้อมูลเครื่องชาร์จ
  connectorExists: boolean;            // หัวชาร์จมีอยู่หรือไม่
  connectorCount: number;              // จำนวนหัวชาร์จทั้งหมด
  lastSeen?: Date;                     // เวลาที่เห็นล่าสุด
  lastHeartbeat?: Date;                // เวลา heartbeat ล่าสุด
  errorMessage?: string;               // ข้อความข้อผิดพลาด
}

// การตั้งค่าการตรวจสอบ
// Validation settings
export interface ValidationSettings {
  heartbeatTimeoutMs: number;          // timeout สำหรับ heartbeat (มิลลิวินาที)
  connectionTimeoutMs: number;         // timeout สำหรับการเชื่อมต่อ (มิลลิวินาที)
  maxOfflineRetries: number;           // จำนวนครั้งสูงสุดที่ลองเช็คเครื่องออฟไลน์
  offlineCheckIntervalMs: number;      // ช่วงเวลาเช็คเครื่องออฟไลน์ (มิลลิวินาที)
}

// ค่าเริ่มต้นการตั้งค่า
// Default validation settings
export const DEFAULT_VALIDATION_SETTINGS: ValidationSettings = {
  heartbeatTimeoutMs: 2 * 60 * 1000,   // 2 นาที
  connectionTimeoutMs: 5 * 60 * 1000,  // 5 นาที
  maxOfflineRetries: 3,                // ลองใหม่ 3 ครั้ง
  offlineCheckIntervalMs: 30 * 1000    // เช็คทุก 30 วินาที
};

/**
 * คลาสตรวจสอบ Session และสถานะเครื่องชาร์จ
 * Session Validator class for charge point status checking
 */
export class SessionValidator {
  private settings: ValidationSettings;
  private offlineCheckInterval: NodeJS.Timeout | null = null;
  private offlineRetryCount: Map<string, number> = new Map();

  constructor(settings: ValidationSettings = DEFAULT_VALIDATION_SETTINGS) {
    this.settings = settings;
    this.startOfflineChecking();
  }

  /**
   * ตรวจสอบ session และสถานะเครื่องชาร์จ
   * Validate session and charge point status
   * @param chargePointId - รหัสเครื่องชาร์จ
   * @param connectorId - หมายเลขหัวชาร์จ
   * @returns ผลลัพธ์การตรวจสอบ
   */
  public validateSession(chargePointId: string, connectorId: number): SessionValidationResult {
    // Step 1: ตรวจสอบว่ามี charge point ใน session หรือไม่
    const chargePoint = gatewaySessionManager.getChargePoint(chargePointId);
    
    if (!chargePoint) {
      return {
        isValid: false,
        isOnline: false,
        connectorExists: false,
        connectorCount: 0,
        errorMessage: `ไม่พบเครื่องชาร์จ ${chargePointId} ใน session`
      };
    }

    // Step 2: ตรวจสอบสถานะการเชื่อมต่อ WebSocket
    const isWebSocketConnected = chargePoint.ws.readyState === WebSocket.OPEN;
    
    // Step 3: ตรวจสอบ heartbeat
    const now = new Date();
    const timeSinceHeartbeat = now.getTime() - chargePoint.lastHeartbeat.getTime();
    const isHeartbeatValid = timeSinceHeartbeat <= this.settings.heartbeatTimeoutMs;
    
    // Step 4: ตรวจสอบการเชื่อมต่อล่าสุด
    const timeSinceLastSeen = now.getTime() - chargePoint.lastSeen.getTime();
    const isConnectionValid = timeSinceLastSeen <= this.settings.connectionTimeoutMs;
    
    // Step 5: กำหนดสถานะออนไลน์
    const isOnline = isWebSocketConnected && isHeartbeatValid && isConnectionValid && chargePoint.isAuthenticated;
    
    // Step 6: ตรวจสอบหัวชาร์จ
    const connectorExists = chargePoint.connectorCount >= connectorId && connectorId > 0;
    
    // Step 7: สร้างผลลัพธ์
    const result: SessionValidationResult = {
      isValid: true,
      isOnline,
      chargePoint,
      connectorExists,
      connectorCount: chargePoint.connectorCount,
      lastSeen: chargePoint.lastSeen,
      lastHeartbeat: chargePoint.lastHeartbeat
    };

    // เพิ่มข้อความข้อผิดพลาดหากจำเป็น
    if (!isOnline) {
      const reasons = [];
      if (!isWebSocketConnected) reasons.push('WebSocket ไม่ได้เชื่อมต่อ');
      if (!isHeartbeatValid) reasons.push(`Heartbeat หมดเวลา (${Math.round(timeSinceHeartbeat / 1000)} วินาที)`);
      if (!isConnectionValid) reasons.push(`การเชื่อมต่อหมดเวลา (${Math.round(timeSinceLastSeen / 1000)} วินาที)`);
      if (!chargePoint.isAuthenticated) reasons.push('ยังไม่ได้ยืนยันตัวตน');
      
      result.errorMessage = `เครื่องชาร์จออฟไลน์: ${reasons.join(', ')}`;
    }

    if (!connectorExists) {
      result.errorMessage = (result.errorMessage || '') + 
        ` ไม่พบหัวชาร์จหมายเลข ${connectorId} (มีทั้งหมด ${chargePoint.connectorCount} หัว)`;
    }

    return result;
  }

  /**
   * ตรวจสอบและส่งสัญญาณไปยังเครื่องชาร์จที่ออฟไลน์
   * Check and send signal to offline charge points
   * @param chargePointId - รหัสเครื่องชาร์จ
   * @returns true หากส่งสัญญาณสำเร็จ
   */
  public async checkOfflineChargePoint(chargePointId: string): Promise<boolean> {
    const chargePoint = gatewaySessionManager.getChargePoint(chargePointId);
    if (!chargePoint) return false;

    // ตรวจสอบจำนวนครั้งที่ลองแล้ว
    const retryCount = this.offlineRetryCount.get(chargePointId) || 0;
    if (retryCount >= this.settings.maxOfflineRetries) {
      console.log(`⚠️ เครื่องชาร์จ ${chargePointId} เกินจำนวนครั้งที่ลองเช็คแล้ว (${retryCount}/${this.settings.maxOfflineRetries})`);
      return false;
    }

    try {
      // ส่ง Heartbeat request เพื่อเช็คสถานะ
      const heartbeatMessage = [
        2, // CALL
        `heartbeat-check-${Date.now()}`,
        'Heartbeat',
        {}
      ];

      const success = gatewaySessionManager.sendMessage(chargePointId, heartbeatMessage);
      
      if (success) {
        console.log(`💓 ส่ง Heartbeat check ไปยัง ${chargePointId} (ครั้งที่ ${retryCount + 1})`);
        this.offlineRetryCount.set(chargePointId, retryCount + 1);
        
        // รอ response และรีเซ็ต retry count หากได้รับ response
        setTimeout(() => {
          const updatedChargePoint = gatewaySessionManager.getChargePoint(chargePointId);
          if (updatedChargePoint) {
            const now = new Date();
            const timeSinceHeartbeat = now.getTime() - updatedChargePoint.lastHeartbeat.getTime();
            
            // หากได้รับ heartbeat ใหม่ รีเซ็ต retry count
            if (timeSinceHeartbeat < 10000) { // ภายใน 10 วินาที
              this.offlineRetryCount.delete(chargePointId);
              console.log(`✅ เครื่องชาร์จ ${chargePointId} กลับมาออนไลน์แล้ว`);
            }
          }
        }, 5000); // รอ 5 วินาที
        
        return true;
      } else {
        console.log(`❌ ไม่สามารถส่ง Heartbeat check ไปยัง ${chargePointId} ได้`);
        return false;
      }
    } catch (error) {
      console.error(`❌ ข้อผิดพลาดในการเช็คเครื่องชาร์จ ${chargePointId}:`, error);
      return false;
    }
  }

  /**
   * ดึงสถานะหัวชาร์จปัจจุบัน
   * Get current connector status
   * @param chargePointId - รหัสเครื่องชาร์จ
   * @param connectorId - หมายเลขหัวชาร์จ
   * @returns สถานะหัวชาร์จ
   */
  public getConnectorStatus(chargePointId: string, connectorId: number): ConnectorStatus {
    const validation = this.validateSession(chargePointId, connectorId);
    
    if (!validation.isValid || !validation.connectorExists) {
      return ConnectorStatus.UNAVAILABLE;
    }
    
    if (!validation.isOnline) {
      return ConnectorStatus.UNAVAILABLE;
    }
    
    // ในการใช้งานจริง ควรดึงสถานะจากข้อมูล OCPP
    // สำหรับตัวอย่างนี้ จะใช้สถานะ Available
    return ConnectorStatus.AVAILABLE;
  }

  /**
   * เริ่มการตรวจสอบเครื่องชาร์จออฟไลน์แบบอัตโนมัติ
   * Start automatic offline charge point checking
   */
  private startOfflineChecking(): void {
    this.offlineCheckInterval = setInterval(() => {
      const allChargePoints = gatewaySessionManager.getAllChargePoints();
      
      for (const chargePoint of allChargePoints) {
        const validation = this.validateSession(chargePoint.chargePointId, 1);
        
        // หากเครื่องออฟไลน์ ให้ลองเช็ค
        if (!validation.isOnline) {
          this.checkOfflineChargePoint(chargePoint.chargePointId);
        } else {
          // หากออนไลน์ รีเซ็ต retry count
          this.offlineRetryCount.delete(chargePoint.chargePointId);
        }
      }
    }, this.settings.offlineCheckIntervalMs);

    console.log(`🔍 เริ่มการตรวจสอบเครื่องชาร์จออฟไลน์ทุก ${this.settings.offlineCheckIntervalMs / 1000} วินาที`);
  }

  /**
   * หยุดการตรวจสอบเครื่องชาร์จออฟไลน์
   * Stop offline charge point checking
   */
  public stopOfflineChecking(): void {
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
      this.offlineCheckInterval = null;
      console.log('🛑 หยุดการตรวจสอบเครื่องชาร์จออฟไลน์');
    }
  }

  /**
   * ดึงสถิติการตรวจสอบ
   * Get validation statistics
   */
  public getValidationStats(): any {
    const allChargePoints = gatewaySessionManager.getAllChargePoints();
    const stats = {
      totalChargePoints: allChargePoints.length,
      onlineChargePoints: 0,
      offlineChargePoints: 0,
      authenticatedChargePoints: 0,
      chargePointsWithValidHeartbeat: 0,
      offlineRetryAttempts: this.offlineRetryCount.size,
      chargePointDetails: [] as any[]
    };

    const now = new Date();
    
    for (const chargePoint of allChargePoints) {
      const validation = this.validateSession(chargePoint.chargePointId, 1);
      const timeSinceHeartbeat = now.getTime() - chargePoint.lastHeartbeat.getTime();
      const isHeartbeatValid = timeSinceHeartbeat <= this.settings.heartbeatTimeoutMs;
      
      if (validation.isOnline) stats.onlineChargePoints++;
      else stats.offlineChargePoints++;
      
      if (chargePoint.isAuthenticated) stats.authenticatedChargePoints++;
      if (isHeartbeatValid) stats.chargePointsWithValidHeartbeat++;
      
      stats.chargePointDetails.push({
        chargePointId: chargePoint.chargePointId,
        isOnline: validation.isOnline,
        isAuthenticated: chargePoint.isAuthenticated,
        connectorCount: chargePoint.connectorCount,
        lastHeartbeat: chargePoint.lastHeartbeat,
        timeSinceHeartbeat: Math.round(timeSinceHeartbeat / 1000),
        retryCount: this.offlineRetryCount.get(chargePoint.chargePointId) || 0
      });
    }

    return stats;
  }

  /**
   * อัปเดตการตั้งค่า
   * Update settings
   */
  public updateSettings(newSettings: Partial<ValidationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ อัปเดตการตั้งค่าการตรวจสอบ:', this.settings);
  }
}

// สร้าง instance ของ Session Validator
export const sessionValidator = new SessionValidator();