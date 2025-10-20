// ตัวตรวจสอบ Session สำหรับการเชื่อมต่อ WebSocket
// Session Monitor for WebSocket connections
// ให้ความสามารถในการตรวจสอบ, บันทึกข้อมูล และตรวจสอบสุขภาพของ session
// Provides monitoring, logging, and health check capabilities for sessions

import type { ChargePointSession } from './sessionManager';
import { sessionManager } from './sessionManager';

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
    // Step 1: ดึงสถิติและข้อมูล session ทั้งหมด
    const stats = sessionManager.getStats();
    const activeSessions = sessionManager.getActiveSessions();
    
    // Step 2: แสดงสถิติการเชื่อมต่อ
    console.log('=== Session Health Check ===');
    console.log(`Total Sessions: ${stats.totalSessions}`);
    console.log(`Active Sessions: ${stats.activeSessions}`);
    console.log(`Authenticated Sessions: ${stats.authenticatedSessions}`);
    console.log(`Sessions with Recent Heartbeat: ${stats.sessionsWithHeartbeat}`);
    console.log(`Messages Sent: ${stats.messagesSent}`);
    console.log(`Messages Received: ${stats.messagesReceived}`);
    console.log(`Average Connection Time: ${Math.round(stats.averageConnectionTime / 1000)}s`);

    // Step 3: ตรวจสอบ session ที่ไม่ได้ใช้งาน (stale)
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 นาที
    const staleSessions = activeSessions.filter((session: ChargePointSession) => {
      const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
      return timeSinceLastSeen > staleThreshold;
    });

    if (staleSessions.length > 0) {
      console.log(`⚠️  Found ${staleSessions.length} stale sessions:`);
      staleSessions.forEach((session: ChargePointSession) => {
        const timeSinceLastSeen = Math.round((now.getTime() - session.lastSeen.getTime()) / 1000);
        console.log(`  - ${session.chargePointId} (${timeSinceLastSeen}s ago)`);
      });
    }

    // Step 4: ตรวจสอบ session ที่ไม่มี heartbeat
    const heartbeatThreshold = 2 * 60 * 1000; // 2 นาที
    const noHeartbeatSessions = activeSessions.filter((session: ChargePointSession) => {
      const timeSinceHeartbeat = now.getTime() - session.lastHeartbeat.getTime();
      return timeSinceHeartbeat > heartbeatThreshold;
    });

    if (noHeartbeatSessions.length > 0) {
      console.log(`💔 Found ${noHeartbeatSessions.length} sessions without recent heartbeat:`);
      noHeartbeatSessions.forEach((session: ChargePointSession) => {
        const timeSinceHeartbeat = Math.round((now.getTime() - session.lastHeartbeat.getTime()) / 1000);
        console.log(`  - ${session.chargePointId} (${timeSinceHeartbeat}s ago)`);
      });
    }

    console.log('=== End Health Check ===\n');
  }

  /**
   * ดึงสถิติของ session
   * Get session statistics
   * @returns ข้อมูลสถิติของ session ทั้งหมด
   */
  getSessionStats() {
    return sessionManager.getStats();
  }

  /**
   * ดึงข้อมูลรายละเอียดของ session ทั้งหมด
   * Get detailed session information
   * @returns Array ของข้อมูลรายละเอียด session
   */
  getDetailedSessionInfo(): any[] {
    const activeSessions = sessionManager.getActiveSessions();
    return activeSessions.map(session => sessionManager.getSessionInfo(session.sessionId));
  }

  /**
   * บันทึกกิจกรรมของ session
   * Log session activity
   * ใช้สำหรับบันทึกเหตุการณ์สำคัญของ session เช่น การเชื่อมต่อ การส่งข้อความ
   * @param sessionId - รหัส session
   * @param activity - กิจกรรมที่เกิดขึ้น
   * @param details - รายละเอียดเพิ่มเติม (optional)
   */
  logSessionActivity(sessionId: string, activity: string, details?: any): void {
    const session = sessionManager.getSession(sessionId);
    if (session) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Session ${sessionId} (${session.chargePointId}): ${activity}`, details || '');
    }
  }

  /**
   * จัดกลุ่ม session ตามสถานะ
   * Get sessions by status
   * Step 1: ดึง session ทั้งหมดและ session ที่ยืนยันตัวตนแล้ว
   * Step 2: กรอง session ที่ไม่ได้ใช้งาน (stale)
   * Step 3: กรอง session ที่ไม่มี heartbeat
   * @returns Object ที่จัดกลุ่ม session ตามสถานะ
   */
  getSessionsByStatus(): {
    active: ChargePointSession[];
    authenticated: ChargePointSession[];
    stale: ChargePointSession[];
    noHeartbeat: ChargePointSession[];
  } {
    // Step 1: ดึง session ทั้งหมดและ session ที่ยืนยันตัวตนแล้ว
    const activeSessions = sessionManager.getActiveSessions();
    const authenticatedSessions = sessionManager.getAuthenticatedSessions();
    
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 นาที
    const heartbeatThreshold = 2 * 60 * 1000; // 2 นาที

    // Step 2: กรอง session ที่ไม่ได้ใช้งาน (stale)
    const staleSessions = activeSessions.filter((session: ChargePointSession) => {
      const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
      return timeSinceLastSeen > staleThreshold;
    });

    // Step 3: กรอง session ที่ไม่มี heartbeat
    const noHeartbeatSessions = activeSessions.filter((session: ChargePointSession) => {
      const timeSinceHeartbeat = now.getTime() - session.lastHeartbeat.getTime();
      return timeSinceHeartbeat > heartbeatThreshold;
    });

    return {
      active: activeSessions,
      authenticated: authenticatedSessions,
      stale: staleSessions,
      noHeartbeat: noHeartbeatSessions
    };
  }

  /**
   * บังคับทำความสะอาด session ที่ไม่ได้ใช้งาน
   * Force cleanup of stale sessions
   * @returns จำนวน session ที่ทำความสะอาด
   */
  forceCleanup(): number {
    console.log('Forcing cleanup of stale sessions...');
    const cleanedCount = sessionManager.cleanupStaleSessions();
    console.log(`Cleaned up ${cleanedCount} stale sessions`);
    return cleanedCount;
  }

  /**
   * ดึงข้อมูล session ตาม charge point ID พร้อมข้อมูลรายละเอียด
   * Get session by charge point ID with detailed info
   * รวมข้อมูลสุขภาพการเชื่อมต่อและจำนวนข้อความที่รอการประมวลผล
   * @param chargePointId - รหัส charge point
   * @returns ข้อมูลรายละเอียดของ session หรือ null หากไม่พบ
   */
  getSessionByChargePoint(chargePointId: string): any | null {
    const session = sessionManager.getSessionByChargePointId(chargePointId);
    if (!session) return null;
    
    return {
      ...sessionManager.getSessionInfo(session.sessionId),
      connectionHealth: this.getConnectionHealth(session),
      pendingMessageCount: sessionManager.getPendingMessages(session.sessionId).length
    };
  }

  /**
   * ตรวจสอบสุขภาพการเชื่อมต่อของ session
   * Get connection health for a session
   * Step 1: คำนวณเวลาที่ผ่านไปตั้งแต่กิจกรรมล่าสุด
   * Step 2: ตรวจสอบเงื่อนไขต่างๆ และกำหนดสถานะ
   * Step 3: รวบรวมปัญหาที่พบ
   * @param session - session ที่ต้องการตรวจสอบ
   * @returns ข้อมูลสุขภาพการเชื่อมต่อ
   */
  private getConnectionHealth(session: ChargePointSession): {
    status: 'healthy' | 'warning' | 'critical';
    lastSeenAgo: number;
    lastHeartbeatAgo: number;
    issues: string[];
  } {
    // Step 1: คำนวณเวลาที่ผ่านไปตั้งแต่กิจกรรมล่าสุด
    const now = new Date();
    const lastSeenAgo = now.getTime() - session.lastSeen.getTime();
    const lastHeartbeatAgo = now.getTime() - session.lastHeartbeat.getTime();
    
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Step 2: ตรวจสอบเงื่อนไขต่างๆ และกำหนดสถานะ
    // ตรวจสอบเวลาที่เห็นล่าสุด
    if (lastSeenAgo > 5 * 60 * 1000) { // 5 นาที
      issues.push('No activity for over 5 minutes');
      status = 'critical';
    } else if (lastSeenAgo > 2 * 60 * 1000) { // 2 นาที
      issues.push('No activity for over 2 minutes');
      status = 'warning';
    }

    // ตรวจสอบ heartbeat
    if (lastHeartbeatAgo > 2 * 60 * 1000) { // 2 นาที
      issues.push('No heartbeat for over 2 minutes');
      if (status !== 'critical') status = 'warning';
    }

    // ตรวจสอบการยืนยันตัวตน
    if (!session.isAuthenticated) {
      issues.push('Session not authenticated');
      if (status !== 'critical') status = 'warning';
    }

    // ตรวจสอบสถานะ WebSocket
    if (session.ws.readyState !== 1) { // WebSocket.OPEN
      issues.push('WebSocket connection not open');
      status = 'critical';
    }

    return {
      status,
      lastSeenAgo: Math.round(lastSeenAgo / 1000),
      lastHeartbeatAgo: Math.round(lastHeartbeatAgo / 1000),
      issues
    };
  }

  /**
   * สร้างรายงานการตรวจสอบ
   * Generate monitoring report
   * Step 1: รวบรวมสถิติและข้อมูล session
   * Step 2: สร้างรายงานสถิติทั่วไป
   * Step 3: รายงาน session ที่มีปัญหา
   * Step 4: รายงาน session ที่มีสุขภาพดี
   * @returns รายงานในรูปแบบ string
   */
  generateReport(): string {
    // Step 1: รวบรวมสถิติและข้อมูล session
    const stats = sessionManager.getStats();
    const sessionsByStatus = this.getSessionsByStatus();
    
    let report = '\n=== Session Monitoring Report ===\n';
    report += `Generated at: ${new Date().toISOString()}\n\n`;
    
    // Step 2: สร้างรายงานสถิติทั่วไป
    report += '📊 Statistics:\n';
    report += `  Total Sessions: ${stats.totalSessions}\n`;
    report += `  Active Sessions: ${stats.activeSessions}\n`;
    report += `  Authenticated Sessions: ${stats.authenticatedSessions}\n`;
    report += `  Sessions with Recent Heartbeat: ${stats.sessionsWithHeartbeat}\n`;
    report += `  Messages Sent: ${stats.messagesSent}\n`;
    report += `  Messages Received: ${stats.messagesReceived}\n`;
    report += `  Average Connection Time: ${Math.round(stats.averageConnectionTime / 1000)}s\n\n`;
    
    // Step 3: รายงาน session ที่มีปัญหา
    if (sessionsByStatus.stale.length > 0) {
      report += '⚠️  Stale Sessions:\n';
      sessionsByStatus.stale.forEach(session => {
        const health = this.getConnectionHealth(session);
        report += `  - ${session.chargePointId} (${health.lastSeenAgo}s ago)\n`;
      });
      report += '\n';
    }
    
    if (sessionsByStatus.noHeartbeat.length > 0) {
      report += '💔 Sessions without Heartbeat:\n';
      sessionsByStatus.noHeartbeat.forEach(session => {
        const health = this.getConnectionHealth(session);
        report += `  - ${session.chargePointId} (${health.lastHeartbeatAgo}s ago)\n`;
      });
      report += '\n';
    }
    
    // Step 4: รายงาน session ที่มีสุขภาพดี
    report += '✅ Healthy Sessions:\n';
    const healthySessions = sessionsByStatus.active.filter((session: ChargePointSession) => {
      const health = this.getConnectionHealth(session);
      return health.status === 'healthy';
    });
    
    if (healthySessions.length === 0) {
      report += '  None\n';
    } else {
      healthySessions.forEach((session: ChargePointSession) => {
        report += `  - ${session.chargePointId} (${session.ocppVersion})\n`;
      });
    }
    
    report += '\n=== End Report ===\n';
    
    return report;
  }
}

// ส่งออก singleton instance สำหรับใช้งานทั่วทั้งระบบ
// Export singleton instance for system-wide usage
export const sessionMonitor = new SessionMonitor();