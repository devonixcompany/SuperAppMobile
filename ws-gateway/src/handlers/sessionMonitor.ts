// ตัวตรวจสอบ Session สำหรับการเชื่อมต่อ WebSocket
// Session Monitor for WebSocket connections
// ให้ความสามารถในการตรวจสอบ, บันทึกข้อมูล และตรวจสอบสุขภาพของ session
// Provides monitoring, logging, and health check capabilities for sessions

import type { ChargePointEntry } from './gatewaySessionManager';
import { gatewaySessionManager } from './gatewaySessionManager';

/**
 * คลาสตรวจสอบ Session
 * Session Monitor class
 * Step 1: ตรวจสอบสุขภาพของ session ทุกช่วงเวลาที่กำหนด
 * Step 2: บันทึกกิจกรรมและสถิติของ session
 * Step 3: ทำความสะอาด session ที่ไม่ได้ใช้งาน
 */
export class SessionMonitor {
  // ตัวแปรเก็บ interval สำหรับการตรวจสอบ
  private monitoringInterval: NodeJS.Timeout | null = null;
  // สถานะการตรวจสอบ
  private isMonitoring = false;

  /**
   * เริ่มการตรวจสอบ session
   * Start monitoring sessions
   * Step 1: ตรวจสอบว่ายังไม่ได้เริ่มการตรวจสอบ
   * Step 2: ตั้งค่า interval สำหรับการตรวจสอบ
   * Step 3: ทำการตรวจสอบครั้งแรกทันที
   * @param intervalMs - ช่วงเวลาการตรวจสอบ (มิลลิวินาที, ค่าเริ่มต้น 30 วินาที)
   */
  startMonitoring(intervalMs: number = 30000): void {
    // Step 1: ตรวจสอบว่ายังไม่ได้เริ่มการตรวจสอบ
    if (this.isMonitoring) {
      console.log('Session monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log(`Starting session monitoring with ${intervalMs}ms interval`);

    // Step 2: ตั้งค่า interval สำหรับการตรวจสอบ
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    // Step 3: ทำการตรวจสอบครั้งแรกทันที
    this.performHealthCheck();
  }

  /**
   * หยุดการตรวจสอบ session
   * Stop monitoring sessions
   * Step 1: ยกเลิก interval ที่กำลังทำงาน
   * Step 2: รีเซ็ตสถานะการตรวจสอบ
   */
  stopMonitoring(): void {
    // Step 1: ยกเลิก interval ที่กำลังทำงาน
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    // Step 2: รีเซ็ตสถานะการตรวจสอบ
    this.isMonitoring = false;
    console.log('Session monitoring stopped');
  }

  /**
   * ทำการตรวจสอบสุขภาพของ session ทั้งหมด
   * Perform health check on all sessions
   * Step 1: ดึงสถิติและข้อมูล session ทั้งหมด
   * Step 2: แสดงสถิติการเชื่อมต่อ
   * Step 3: ตรวจสอบ session ที่ไม่ได้ใช้งาน (stale)
   * Step 4: ตรวจสอบ session ที่ไม่มี heartbeat
   */
  performHealthCheck(): void {
    // Step 1: ดึงสถิติและข้อมูล charge points ทั้งหมด
    const stats = gatewaySessionManager.getStats();
    const activeChargePoints = gatewaySessionManager.getAllChargePoints();
console.log("cccccpcpcpcpcpcpcpcpc",activeChargePoints)
    // Step 2: แสดงสถิติการเชื่อมต่อ
    console.log('=== Gateway Session Health Check ===');
    console.log(`Total Charge Points: ${stats.totalChargePoints}`);
    console.log(`Active Charge Points: ${stats.activeChargePoints}`);
    console.log(`Authenticated Charge Points: ${stats.authenticatedChargePoints}`);
    console.log(`Charge Points with Recent Heartbeat: ${stats.chargePointsWithHeartbeat}`);
    console.log(`Messages Sent: ${stats.totalMessagesSent}`);
   console.log(`Messages Received: ${stats.totalMessagesReceived}`);
   console.log(`Average Connection Time: ${Math.round(stats.averageConnectionTime / 1000)}s`);

    const now = new Date();

    if (activeChargePoints.length > 0) {
      console.log('--- รายการเครื่องชาร์จที่เชื่อมต่ออยู่ ---');
      activeChargePoints.forEach((chargePoint: ChargePointEntry) => {
        const timeSinceLastSeen = Math.round((now.getTime() - chargePoint.lastSeen.getTime()) / 1000);
        const timeSinceHeartbeat = Math.round((now.getTime() - chargePoint.lastHeartbeat.getTime()) / 1000);
        const connectionDuration = Math.round((now.getTime() - chargePoint.connectedAt.getTime()) / 1000);
        const connectorInfo = (chargePoint.connectors && chargePoint.connectors.length > 0)
          ? chargePoint.connectors
              .map(connector => {
                const type = connector.type || 'ไม่ทราบชนิด';
                const maxCurrent = typeof connector.maxCurrent === 'number' ? `${connector.maxCurrent}A` : 'ไม่ระบุ A';
                const status = connector.status || 'ไม่ทราบสถานะ';
                return `#${connector.connectorId} (${type}, ${maxCurrent}, ${status})`;
              })
              .join(', ')
          : 'ไม่มีข้อมูลหัวชาร์จ';

        console.log(`• ${chargePoint.chargePointId} (${chargePoint.serialNumber || 'ไม่มี Serial'})`);
        console.log(`    - สถานะรับรอง: ${chargePoint.isAuthenticated ? 'ผ่าน' : 'ยังไม่ผ่าน'}`);
        console.log(`    - เวลาที่เชื่อมต่อแล้ว: ${connectionDuration}s`);
        console.log(`    - ล่าสุดเห็นเมื่อ: ${timeSinceLastSeen}s ที่ผ่านมา`);
        console.log(`    - ข้อมูลหัวชาร์จ: ${connectorInfo}`);
      });
    } else {
      console.log('--- ไม่มีเครื่องชาร์จที่เชื่อมต่ออยู่ ---');
    }

    // Step 3: ตรวจสอบ charge points ที่ไม่ได้ใช้งาน (stale)
    
    const staleThreshold = 5 * 60 * 1000; // 5 นาที
    const staleChargePoints = activeChargePoints.filter((chargePoint: ChargePointEntry) => {
      const timeSinceLastSeen = now.getTime() - chargePoint.lastSeen.getTime();
      return timeSinceLastSeen > staleThreshold;
    });

    if (staleChargePoints.length > 0) {
      console.log(`⚠️  Found ${staleChargePoints.length} stale charge points:`);
      staleChargePoints.forEach((chargePoint: ChargePointEntry) => {
        const timeSinceLastSeen = Math.round((now.getTime() - chargePoint.lastSeen.getTime()) / 1000);
        console.log(`  - ${chargePoint.chargePointId} (${timeSinceLastSeen}s ago)`);
      });
    }

    // Step 4: ตรวจสอบ charge points ที่ไม่มี heartbeat
    const heartbeatThreshold = 2 * 60 * 1000; // 2 นาที
    const noHeartbeatChargePoints = activeChargePoints.filter((chargePoint: ChargePointEntry) => {
      const timeSinceHeartbeat = now.getTime() - chargePoint.lastHeartbeat.getTime();
      return timeSinceHeartbeat > heartbeatThreshold;
    });

    if (noHeartbeatChargePoints.length > 0) {
      console.log(`💔 Found ${noHeartbeatChargePoints.length} charge points without recent heartbeat:`);
      noHeartbeatChargePoints.forEach((chargePoint: ChargePointEntry) => {
        const timeSinceHeartbeat = Math.round((now.getTime() - chargePoint.lastHeartbeat.getTime()) / 1000);
        console.log(`  - ${chargePoint.chargePointId} (${timeSinceHeartbeat}s ago)`);
      });
    }

    console.log('=== End Health Check ===\n');
  }

  /**
   * ดึงสถิติของ session
   * Get monitoring statistics
   * รวบรวมข้อมูลสถิติสำหรับการแสดงผลหรือการวิเคราะห์
   * @returns ข้อมูลสถิติของ session
   */
  getMonitoringStats(): any {
    const stats = gatewaySessionManager.getStats();
    const activeChargePoints = gatewaySessionManager.getAllChargePoints();
    
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 นาที
    const heartbeatThreshold = 2 * 60 * 1000; // 2 นาที
    
    const staleCount = activeChargePoints.filter((cp: ChargePointEntry) => {
      const timeSinceLastSeen = now.getTime() - cp.lastSeen.getTime();
      return timeSinceLastSeen > staleThreshold;
    }).length;
    
    const noHeartbeatCount = activeChargePoints.filter((cp: ChargePointEntry) => {
      const timeSinceHeartbeat = now.getTime() - cp.lastHeartbeat.getTime();
      return timeSinceHeartbeat > heartbeatThreshold;
    }).length;

    return {
      ...stats,
      staleChargePoints: staleCount,
      noHeartbeatChargePoints: noHeartbeatCount,
      isMonitoring: this.isMonitoring,
      monitoringActive: this.monitoringInterval !== null
    };
  }

  /**
   * บันทึกกิจกรรมของ charge point
   * Log charge point activity
   * บันทึกเหตุการณ์สำคัญเช่น การเชื่อมต่อ, การตัดการเชื่อมต่อ, การส่งข้อความ
   * @param chargePointId - รหัส charge point
   * @param activity - ประเภกิจกรรม
   * @param details - รายละเอียดเพิ่มเติม
   */
  logActivity(chargePointId: string, activity: string, details?: any): void {
    const timestamp = new Date().toISOString();
    const chargePoint = gatewaySessionManager.getChargePoint(chargePointId);
    
    if (chargePoint) {
      console.log(`[${timestamp}] ${activity} - ${chargePointId}`, details || '');
    } else {
      console.log(`[${timestamp}] ${activity} - ${chargePointId} (not found)`, details || '');
    }
  }

  /**
   * ตรวจสอบสุขภาพของ charge point เฉพาะ
   * Check health of specific charge point
   * ตรวจสอบสถานะและสุขภาพของ charge point ที่ระบุ
   * @param chargePointId - รหัส charge point ที่ต้องการตรวจสอบ
   * @returns ข้อมูลสุขภาพของ charge point
   */
  checkChargePointHealth(chargePointId: string): any {
    const chargePoint = gatewaySessionManager.getChargePoint(chargePointId);
    
    if (!chargePoint) {
      return {
        chargePointId,
        status: 'not_found',
        message: 'Charge point not found'
      };
    }

    const now = new Date();
    const timeSinceLastSeen = now.getTime() - chargePoint.lastSeen.getTime();
    const timeSinceHeartbeat = now.getTime() - chargePoint.lastHeartbeat.getTime();
    const connectionDuration = now.getTime() - chargePoint.connectedAt.getTime();

    // ตรวจสอบสถานะต่างๆ
    const isStale = timeSinceLastSeen > 5 * 60 * 1000; // 5 นาที
    const hasRecentHeartbeat = timeSinceHeartbeat <= 2 * 60 * 1000; // 2 นาที
    const isWebSocketOpen = chargePoint.ws.readyState === 1; // WebSocket.OPEN

    let status = 'healthy';
    let issues = [];

    if (!chargePoint.isAuthenticated) {
      status = 'unauthenticated';
      issues.push('Not authenticated');
    }

    if (isStale) {
      status = 'stale';
      issues.push(`No activity for ${Math.round(timeSinceLastSeen / 1000)}s`);
    }

    if (!hasRecentHeartbeat) {
      status = 'no_heartbeat';
      issues.push(`No heartbeat for ${Math.round(timeSinceHeartbeat / 1000)}s`);
    }

    if (!isWebSocketOpen) {
      status = 'disconnected';
      issues.push('WebSocket connection closed');
    }

    return {
      chargePointId: chargePoint.chargePointId,
      serialNumber: chargePoint.serialNumber,
      status,
      issues,
      isAuthenticated: chargePoint.isAuthenticated,
      connectionDuration: Math.round(connectionDuration / 1000),
      timeSinceLastSeen: Math.round(timeSinceLastSeen / 1000),
      timeSinceHeartbeat: Math.round(timeSinceHeartbeat / 1000),
      messagesSent: chargePoint.messagesSent,
      messagesReceived: chargePoint.messagesReceived,
      pendingMessages: chargePoint.pendingMessages.length,
      wsState: chargePoint.ws.readyState,
      ocppVersion: chargePoint.ocppVersion
    };
  }

  /**
   * ทำความสะอาด charge points ที่หมดอายุ
   * Cleanup stale charge points
   * ลบ charge points ที่ไม่ได้ใช้งานเป็นเวลานาน
   * @param maxStaleTime - เวลาสูงสุดที่ยอมให้ไม่มีกิจกรรม (มิลลิวินาที, ค่าเริ่มต้น 10 นาที)
   * @returns จำนวน charge points ที่ถูกลบ
   */
  cleanupStaleChargePoints(maxStaleTime: number = 10 * 60 * 1000): number {
    const activeChargePoints = gatewaySessionManager.getAllChargePoints();
    const now = new Date();
    let cleanedCount = 0;

    activeChargePoints.forEach((chargePoint: ChargePointEntry) => {
      const timeSinceLastSeen = now.getTime() - chargePoint.lastSeen.getTime();
      
      if (timeSinceLastSeen > maxStaleTime) {
        console.log(`Cleaning up stale charge point: ${chargePoint.chargePointId} (${Math.round(timeSinceLastSeen / 1000)}s inactive)`);
        gatewaySessionManager.removeChargePoint(chargePoint.chargePointId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} stale charge points`);
    }

    return cleanedCount;
  }

  /**
   * ส่งข้อความ ping ไปยัง charge points ทั้งหมด
   * Send ping message to all charge points
   * ใช้สำหรับตรวจสอบการเชื่อมต่อและการตอบสนองของ charge points
   * @returns จำนวน charge points ที่ส่ง ping สำเร็จ
   */
  pingAllChargePoints(): number {
    const authenticatedChargePoints = gatewaySessionManager.getAuthenticatedChargePoints();
    let pingCount = 0;

    const pingMessage = {
      messageTypeId: 2,
      messageId: `ping_${Date.now()}`,
      action: 'Heartbeat',
      payload: {}
    };

    authenticatedChargePoints.forEach((chargePoint: ChargePointEntry) => {
      const success = gatewaySessionManager.sendMessage(chargePoint.chargePointId, JSON.stringify(pingMessage));
      if (success) {
        pingCount++;
        this.logActivity(chargePoint.chargePointId, 'PING_SENT');
      }
    });

    console.log(`Sent ping to ${pingCount} charge points`);
    return pingCount;
  }
}

// สร้าง instance เดียวสำหรับใช้งานทั่วทั้งแอปพลิเคชัน
// Create single instance for application-wide use
export const sessionMonitor = new SessionMonitor();
