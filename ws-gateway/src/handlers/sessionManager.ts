// ตัวจัดการ Session สำหรับการเชื่อมต่อ OCPP WebSocket
// Session Manager for OCPP WebSocket connections
// จัดการ session ของ charge point, การยืนยันตัวตน และการติดตามข้อความ
// Manages charge point sessions, authentication, and message tracking

import WebSocket from 'ws';

// ข้อมูล Session ของ Charge Point
// Charge Point Session data structure
export interface ChargePointSession {
  sessionId: string;           // รหัสประจำตัว session
  chargePointId: string;       // รหัส charge point
  serialNumber: string;        // หมายเลขซีเรียล
  ws: WebSocket;              // การเชื่อมต่อ WebSocket
  isAuthenticated: boolean;    // สถานะการยืนยันตัวตน
  connectedAt: Date;          // เวลาที่เชื่อมต่อ
  lastSeen: Date;             // เวลาที่เห็นล่าสุด
  lastHeartbeat: Date;        // เวลา heartbeat ล่าสุด
  ocppVersion: string;        // เวอร์ชั่น OCPP
  messagesSent: number;       // จำนวนข้อความที่ส่ง
  messagesReceived: number;   // จำนวนข้อความที่รับ
  pendingMessages: PendingMessage[];  // ข้อความที่รอการประมวลผล
}

// ข้อความที่รอการประมวลผล
// Pending message structure
export interface PendingMessage {
  messageId: string;    // รหัสข้อความ
  message: any;         // เนื้อหาข้อความ
  timestamp: Date;      // เวลาที่สร้าง
  retryCount: number;   // จำนวนครั้งที่ลองใหม่
  maxRetries: number;   // จำนวนครั้งสูงสุดที่ลองใหม่
}

// สถิติของ Session
// Session statistics structure
export interface SessionStats {
  totalSessions: number;          // จำนวน session ทั้งหมด
  activeSessions: number;         // จำนวน session ที่ใช้งานอยู่
  authenticatedSessions: number;  // จำนวน session ที่ยืนยันตัวตนแล้ว
  sessionsWithHeartbeat: number;  // จำนวน session ที่มี heartbeat
  messagesSent: number;           // จำนวนข้อความที่ส่งทั้งหมด
  messagesReceived: number;       // จำนวนข้อความที่รับทั้งหมด
  averageConnectionTime: number;  // เวลาเชื่อมต่อเฉลี่ย
}

/**
 * คลาสจัดการ Session สำหรับ Charge Point
 * Session Manager class for Charge Point management
 * Step 1: เก็บข้อมูล session ในหน่วยความจำ
 * Step 2: จัดการการเชื่อมต่อและการยืนยันตัวตน
 * Step 3: ติดตามสถิติและสถานะการเชื่อมต่อ
 */
export class SessionManager {
  // แผนที่เก็บ session ทั้งหมด (sessionId -> session)
  private sessions: Map<string, ChargePointSession> = new Map();
  // แผนที่เชื่อม chargePointId กับ sessionId
  private chargePointToSession: Map<string, string> = new Map();
  // แผนที่เชื่อม serialNumber กับ sessionId
  private serialToSession: Map<string, string> = new Map();

  /**
   * สร้าง session ใหม่สำหรับ charge point
   * Create a new session for charge point
   * Step 1: สร้าง sessionId ที่ไม่ซ้ำกัน
   * Step 2: สร้างข้อมูล session พร้อมค่าเริ่มต้น
   * Step 3: เก็บ session ในแผนที่ทั้ง 3 แบบ (sessionId, chargePointId, serialNumber)
   * @param chargePointId - รหัส charge point
   * @param serialNumber - หมายเลขซีเรียล
   * @param ws - การเชื่อมต่อ WebSocket
   * @param ocppVersion - เวอร์ชั่น OCPP (ค่าเริ่มต้น 1.6)
   * @returns ChargePointSession ที่สร้างขึ้น
   */
  createSession(
    chargePointId: string,
    serialNumber: string,
    ws: WebSocket,
    ocppVersion: string = '1.6'
  ): ChargePointSession {
    // Step 1: สร้าง sessionId ที่ไม่ซ้ำกัน
    const sessionId = this.generateSessionId();
    const now = new Date();

    // Step 2: สร้างข้อมูล session พร้อมค่าเริ่มต้น
    const session: ChargePointSession = {
      sessionId,
      chargePointId,
      serialNumber,
      ws,
      isAuthenticated: false,    // ยังไม่ได้ยืนยันตัวตน
      connectedAt: now,
      lastSeen: now,
      lastHeartbeat: now,
      ocppVersion,
      messagesSent: 0,
      messagesReceived: 0,
      pendingMessages: []
    };

    // Step 3: เก็บ session ในแผนที่ทั้ง 3 แบบ
    this.sessions.set(sessionId, session);
    this.chargePointToSession.set(chargePointId, sessionId);
    this.serialToSession.set(serialNumber, sessionId);

    console.log(`Created session ${sessionId} for charge point ${chargePointId}`);
    return session;
  }

  /**
   * ดึง session ตาม session ID
   * Get session by session ID
   * @param sessionId - รหัส session ที่ต้องการค้นหา
   * @returns ChargePointSession หรือ undefined หากไม่พบ
   */
  getSession(sessionId: string): ChargePointSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * ดึง session ตาม charge point ID
   * Get session by charge point ID
   * Step 1: ค้นหา sessionId จาก chargePointId
   * Step 2: ดึง session จาก sessionId ที่พบ
   * @param chargePointId - รหัส charge point ที่ต้องการค้นหา
   * @returns ChargePointSession หรือ undefined หากไม่พบ
   */
  getSessionByChargePointId(chargePointId: string): ChargePointSession | undefined {
    const sessionId = this.chargePointToSession.get(chargePointId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * ดึง session ตาม serial number
   * Get session by serial number
   * Step 1: ค้นหา sessionId จาก serialNumber
   * Step 2: ดึง session จาก sessionId ที่พบ
   * @param serialNumber - หมายเลขซีเรียลที่ต้องการค้นหา
   * @returns ChargePointSession หรือ undefined หากไม่พบ
   */
  getSessionBySerialNumber(serialNumber: string): ChargePointSession | undefined {
    const sessionId = this.serialToSession.get(serialNumber);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * อัปเดตเวลาที่เห็น session ล่าสุด
   * Update session last seen timestamp
   * ใช้เมื่อมีการรับข้อความหรือมีกิจกรรมใดๆ จาก charge point
   * @param sessionId - รหัส session ที่ต้องการอัปเดต
   */
  updateLastSeen(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastSeen = new Date();
    }
  }

  /**
   * อัปเดตเวลา heartbeat ของ session
   * Update session heartbeat timestamp
   * ใช้เมื่อรับ heartbeat message จาก charge point
   * @param sessionId - รหัส session ที่ต้องการอัปเดต
   */
  updateHeartbeat(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastHeartbeat = new Date();
      session.lastSeen = new Date();  // อัปเดต lastSeen ด้วย
    }
  }

  /**
   * ยืนยันตัวตน session
   * Authenticate a session
   * เรียกใช้หลังจากได้รับ BootNotification และตรวจสอบข้อมูลแล้ว
   * @param sessionId - รหัส session ที่ต้องการยืนยันตัวตน
   * @returns true หากยืนยันสำเร็จ, false หากไม่พบ session
   */
  authenticateSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isAuthenticated = true;
      console.log(`Session ${sessionId} authenticated for charge point ${session.chargePointId}`);
      return true;
    }
    return false;
  }

  /**
   * ส่งข้อความผ่าน session
   * Send message through session
   * Step 1: ตรวจสอบว่า session และ WebSocket พร้อมใช้งาน
   * Step 2: ส่งข้อความและอัปเดตสถิติ
   * Step 3: อัปเดตเวลาที่เห็นล่าสุด
   * @param sessionId - รหัส session ที่ต้องการส่งข้อความ
   * @param message - ข้อความที่ต้องการส่ง
   * @returns true หากส่งสำเร็จ, false หากส่งไม่สำเร็จ
   */
  sendMessage(sessionId: string, message: any): boolean {
    const session = this.sessions.get(sessionId);
    // Step 1: ตรวจสอบว่า session และ WebSocket พร้อมใช้งาน
    if (session && session.ws.readyState === WebSocket.OPEN) {
      try {
        // Step 2: ส่งข้อความและอัปเดตสถิติ
        // ไม่ต้อง JSON.stringify เพราะ formatOCPPResponse ได้ return JSON string มาแล้ว
        const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
        session.ws.send(messageToSend);
        session.messagesSent++;
        // Step 3: อัปเดตเวลาที่เห็นล่าสุด
        session.lastSeen = new Date();
        return true;
      } catch (error) {
        console.error(`Failed to send message to session ${sessionId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * เพิ่มจำนวนข้อความที่รับ
   * Increment received message count
   * เรียกใช้เมื่อรับข้อความจาก charge point
   * @param sessionId - รหัส session ที่รับข้อความ
   */
  incrementReceivedMessages(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messagesReceived++;
      session.lastSeen = new Date();  // อัปเดตเวลาที่เห็นล่าสุดด้วย
    }
  }

  /**
   * ปิด session
   * Close session
   * Step 1: ค้นหา session ที่ต้องการปิด
   * Step 2: ปิด WebSocket หากยังเปิดอยู่
   * Step 3: ลบ session จากแผนที่ทั้ง 3 แบบ
   * @param sessionId - รหัส session ที่ต้องการปิด
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(`Closing session ${sessionId} for charge point ${session.chargePointId}`);
      
      // Step 2: ปิด WebSocket หากยังเปิดอยู่
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close();
      }

      // Step 3: ลบ session จากแผนที่ทั้ง 3 แบบ
      this.sessions.delete(sessionId);
      this.chargePointToSession.delete(session.chargePointId);
      this.serialToSession.delete(session.serialNumber);
    }
  }

  /**
   * ดึง session ที่ใช้งานอยู่ทั้งหมด
   * Get all active sessions
   * @returns Array ของ ChargePointSession ทั้งหมด
   */
  getActiveSessions(): ChargePointSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * ดึง session ที่ยืนยันตัวตนแล้วเท่านั้น
   * Get authenticated sessions only
   * @returns Array ของ ChargePointSession ที่ยืนยันตัวตนแล้ว
   */
  getAuthenticatedSessions(): ChargePointSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isAuthenticated);
  }

  /**
   * ดึงสถิติของ session
   * Get session statistics
   * Step 1: รวบรวมข้อมูลจาก session ทั้งหมด
   * Step 2: คำนวณสถิติต่างๆ เช่น จำนวนข้อความ เวลาเชื่อมต่อเฉลี่ย
   * Step 3: ตรวจสอบ session ที่มี heartbeat ล่าสุด
   * @returns SessionStats ข้อมูลสถิติ
   */
  getStats(): SessionStats {
    // Step 1: รวบรวมข้อมูลจาก session ทั้งหมด
    const sessions = Array.from(this.sessions.values());
    const now = new Date();
    const heartbeatThreshold = 2 * 60 * 1000; // 2 นาที

    // Step 2: คำนวณสถิติต่างๆ
    const totalMessagesSent = sessions.reduce((sum, session) => sum + session.messagesSent, 0);
    const totalMessagesReceived = sessions.reduce((sum, session) => sum + session.messagesReceived, 0);
    
    const totalConnectionTime = sessions.reduce((sum, session) => {
      return sum + (now.getTime() - session.connectedAt.getTime());
    }, 0);

    // Step 3: ตรวจสอบ session ที่มี heartbeat ล่าสุด
    const sessionsWithHeartbeat = sessions.filter(session => {
      const timeSinceHeartbeat = now.getTime() - session.lastHeartbeat.getTime();
      return timeSinceHeartbeat <= heartbeatThreshold;
    }).length;

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.length,
      authenticatedSessions: sessions.filter(s => s.isAuthenticated).length,
      sessionsWithHeartbeat,
      messagesSent: totalMessagesSent,
      messagesReceived: totalMessagesReceived,
      averageConnectionTime: sessions.length > 0 ? totalConnectionTime / sessions.length : 0
    };
  }

  /**
   * ดึงข้อมูลรายละเอียดของ session
   * Get detailed session information
   * รวบรวมข้อมูลทั้งหมดของ session รวมถึงสถานะ WebSocket และระยะเวลาการเชื่อมต่อ
   * @param sessionId - รหัส session ที่ต้องการดูข้อมูล
   * @returns ข้อมูลรายละเอียดของ session หรือ null หากไม่พบ
   */
  getSessionInfo(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = new Date();
    return {
      sessionId: session.sessionId,
      chargePointId: session.chargePointId,
      serialNumber: session.serialNumber,
      isAuthenticated: session.isAuthenticated,
      connectedAt: session.connectedAt,
      lastSeen: session.lastSeen,
      lastHeartbeat: session.lastHeartbeat,
      ocppVersion: session.ocppVersion,
      messagesSent: session.messagesSent,
      messagesReceived: session.messagesReceived,
      connectionDuration: now.getTime() - session.connectedAt.getTime(),
      wsState: session.ws.readyState,
      pendingMessageCount: session.pendingMessages.length
    };
  }

  /**
   * เพิ่มข้อความที่รอการประมวลผลให้ session
   * Add pending message to session
   * ใช้สำหรับข้อความที่ต้องการ retry หรือรอการตอบกลับ
   * @param sessionId - รหัส session
   * @param messageId - รหัสข้อความ
   * @param message - เนื้อหาข้อความ
   * @param maxRetries - จำนวนครั้งสูงสุดที่ลองใหม่ (ค่าเริ่มต้น 3)
   */
  addPendingMessage(sessionId: string, messageId: string, message: any, maxRetries: number = 3): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const pendingMessage: PendingMessage = {
        messageId,
        message,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries
      };
      session.pendingMessages.push(pendingMessage);
    }
  }

  /**
   * ดึงข้อความที่รอการประมวลผลของ session
   * Get pending messages for session
   * @param sessionId - รหัส session
   * @returns Array ของ PendingMessage
   */
  getPendingMessages(sessionId: string): PendingMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? session.pendingMessages : [];
  }

  /**
   * ลบข้อความที่รอการประมวลผล
   * Remove pending message
   * เรียกใช้เมื่อได้รับการตอบกลับหรือข้อความหมดอายุ
   * @param sessionId - รหัส session
   * @param messageId - รหัสข้อความที่ต้องการลบ
   */
  removePendingMessage(sessionId: string, messageId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pendingMessages = session.pendingMessages.filter(msg => msg.messageId !== messageId);
    }
  }

  /**
   * ส่งข้อความไปยัง session ที่ยืนยันตัวตนแล้วทั้งหมด
   * Broadcast message to all authenticated sessions
   * Step 1: ดึง session ที่ยืนยันตัวตนแล้วทั้งหมด
   * Step 2: ส่งข้อความไปยังแต่ละ session (ยกเว้น session ที่ระบุ)
   * Step 3: นับจำนวน session ที่ส่งสำเร็จ
   * @param message - ข้อความที่ต้องการส่ง
   * @param excludeSessionId - รหัส session ที่ไม่ต้องการส่งให้ (optional)
   * @returns จำนวน session ที่ส่งสำเร็จ
   */
  broadcastMessage(message: any, excludeSessionId?: string): number {
    let sentCount = 0;
    // Step 1: ดึง session ที่ยืนยันตัวตนแล้วทั้งหมด
    const authenticatedSessions = this.getAuthenticatedSessions();
    
    // Step 2: ส่งข้อความไปยังแต่ละ session
    for (const session of authenticatedSessions) {
      if (excludeSessionId && session.sessionId === excludeSessionId) {
        continue;  // ข้าม session ที่ไม่ต้องการส่งให้
      }
      
      if (this.sendMessage(session.sessionId, message)) {
        sentCount++;  // Step 3: นับจำนวน session ที่ส่งสำเร็จ
      }
    }
    
    return sentCount;
  }

  /**
   * ทำความสะอาด session ที่ไม่ได้ใช้งาน
   * Cleanup stale sessions
   * Step 1: ตรวจสอบ session ทั้งหมดเพื่อหา session ที่ไม่ได้ใช้งาน
   * Step 2: ตรวจสอบเงื่อนไข: เวลาที่ไม่ได้ใช้งานเกินกำหนด หรือ WebSocket ปิดแล้ว
   * Step 3: ปิด session ที่ไม่ได้ใช้งาน
   * @param staleThresholdMs - เวลาที่ถือว่าไม่ได้ใช้งาน (มิลลิวินาที, ค่าเริ่มต้น 10 นาที)
   * @returns จำนวน session ที่ทำความสะอาด
   */
  cleanupStaleSessions(staleThresholdMs: number = 10 * 60 * 1000): number {
    const now = new Date();
    const staleSessions: string[] = [];
    
    // Step 1 & 2: ตรวจสอบ session ทั้งหมดเพื่อหา session ที่ไม่ได้ใช้งาน
    for (const [sessionId, session] of this.sessions) {
      const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
      const isWebSocketClosed = session.ws.readyState === WebSocket.CLOSED || session.ws.readyState === WebSocket.CLOSING;
      
      if (timeSinceLastSeen > staleThresholdMs || isWebSocketClosed) {
        staleSessions.push(sessionId);
      }
    }
    
    // Step 3: ปิด session ที่ไม่ได้ใช้งาน
    staleSessions.forEach(sessionId => this.closeSession(sessionId));
    
    if (staleSessions.length > 0) {
      console.log(`Cleaned up ${staleSessions.length} stale sessions`);
    }
    
    return staleSessions.length;
  }

  /**
   * สร้าง session ID ที่ไม่ซ้ำกัน
   * Generate unique session ID
   * รวม timestamp และ random string เพื่อความไม่ซ้ำกัน
   * @returns session ID ที่ไม่ซ้ำกัน
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ส่งออก singleton instance สำหรับใช้งานทั่วทั้งระบบ
// Export singleton instance for system-wide usage
export const sessionManager = new SessionManager();