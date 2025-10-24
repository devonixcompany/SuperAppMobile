// Gateway Session Manager - Single Session with Charge Points Array
// จัดการ session เดียวที่เก็บ charge points ทั้งหมดเป็น array
// Single session management for all charge points

import { EventEmitter } from 'events';
import WebSocket from 'ws';

// ข้อมูลตัวอย่างค่ามิเตอร์จาก MeterValues
interface MeterValueSample {
  value: string;
  context?: string;
  format?: string;
  measurand?: string;
  phase?: string;
  location?: string;
  unit?: string;
}

interface ConnectorMeterValue {
  timestamp: string;
  sampledValue: MeterValueSample[];
}

// ข้อมูลหัวชาร์จใน Gateway Session
// Connector information stored within the gateway session
export interface ConnectorMetrics {
  lastMeterTimestamp?: Date;    // เวลาอัปเดตค่ามิเตอร์ล่าสุด
  energyDeliveredKWh?: number;  // พลังงานที่ส่งไปแล้ว (kWh)
  stateOfChargePercent?: number; // เปอร์เซ็นต์แบตเตอรี่รถ (SoC)
  powerKw?: number;             // กำลังไฟฟ้า (kW)
  voltage?: number;             // แรงดันไฟฟ้า (V)
  currentAmp?: number;          // กระแสไฟฟ้า (A)
  activeTransactionId?: number; // รหัสธุรกรรมที่กำลังดำเนินอยู่
  transactionStartedAt?: Date;  // เวลาเริ่มธุรกรรมล่าสุด
  transactionIdTag?: string;    // ID Tag ที่ใช้ในธุรกรรมล่าสุด
  meterStart?: number;          // ค่ามิเตอร์ตอนเริ่มธุรกรรม
  lastTransactionCompletedAt?: Date; // เวลาปิดธุรกรรมล่าสุด
}

export interface GatewayConnectorInfo {
  connectorId: number;   // หมายเลขหัวชาร์จ
  type?: string;         // ชนิดหัวชาร์จตามข้อมูลจาก OCPP
  maxCurrent?: number;   // กระแสสูงสุดของหัวชาร์จ
  status?: string;       // สถานะเริ่มต้นของหัวชาร์จ
  metrics?: ConnectorMetrics; // ค่ามิเตอร์ล่าสุดของหัวชาร์จ
}

// ข้อมูล Charge Point ใน Gateway Session
// Charge Point data structure in Gateway Session
export interface ChargePointEntry {
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
  chargePointIdentity?: string; // ข้อมูลเพิ่มเติมจาก cache
  connectors: GatewayConnectorInfo[]; // ข้อมูลหัวชาร์จที่ได้จาก GetConfiguration
  connectorCount: number;      // จำนวนหัวชาร์จล่าสุดที่ทราบ
  connectorMetadataSyncedAt?: Date; // เวลา sync ข้อมูลหัวชาร์จล่าสุด

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

// Gateway Session - Session เดียวสำหรับ gateway ทั้งหมด
// Single Gateway Session structure
export interface GatewaySession {
  sessionId: string;                    // รหัส gateway session
  gatewayId: string;                   // รหัส gateway
  createdAt: Date;                     // เวลาที่สร้าง session
  lastActivity: Date;                  // กิจกรรมล่าสุด
  chargePoints: ChargePointEntry[];    // Array ของ charge points ทั้งหมด
  totalMessagesSent: number;           // จำนวนข้อความที่ส่งทั้งหมด
  totalMessagesReceived: number;       // จำนวนข้อความที่รับทั้งหมด
}

// สถิติของ Gateway Session
// Gateway Session statistics
export interface GatewaySessionStats {
  sessionId: string;                  // รหัส session
  totalChargePoints: number;          // จำนวน charge points ทั้งหมด
  activeChargePoints: number;         // จำนวน charge points ที่ใช้งานอยู่
  authenticatedChargePoints: number;  // จำนวน charge points ที่ยืนยันตัวตนแล้ว
  chargePointsWithHeartbeat: number;  // จำนวน charge points ที่มี heartbeat
  totalMessagesSent: number;          // จำนวนข้อความที่ส่งทั้งหมด
  totalMessagesReceived: number;      // จำนวนข้อความที่รับทั้งหมด
  averageConnectionTime: number;      // เวลาเชื่อมต่อเฉลี่ย
  sessionUptime: number;             // เวลาที่ session ทำงาน
}

/**
 * คลาสจัดการ Gateway Session แบบ Single Session
 * Gateway Session Manager class - Single session approach
 * Step 1: สร้าง session เดียวสำหรับ gateway
 * Step 2: จัดการ charge points ทั้งหมดใน array เดียว
 * Step 3: ให้บริการ CRUD operations สำหรับ charge points
 */
export class GatewaySessionManager extends EventEmitter {
  private session: GatewaySession | null = null;
  private readonly gatewayId: string;

  constructor(gatewayId: string = 'gateway-001') {
    super();
    this.gatewayId = gatewayId;
    this.initializeSession();
  }

  /**
   * สร้าง Gateway Session ใหม่
   * Initialize Gateway Session
   * Step 1: สร้าง session ID ที่ไม่ซ้ำกัน
   * Step 2: สร้างข้อมูล session พร้อมค่าเริ่มต้น
   * Step 3: เริ่มต้น array ของ charge points เป็น array ว่าง
   */
  private initializeSession(): void {
    const now = new Date();
    
    this.session = {
      sessionId: this.generateSessionId(),
      gatewayId: this.gatewayId,
      createdAt: now,
      lastActivity: now,
      chargePoints: [],
      totalMessagesSent: 0,
      totalMessagesReceived: 0
    };

    console.log(`🚀 Gateway Session initialized: ${this.session.sessionId}`);
  }

  /**
   * เพิ่ม Charge Point ใหม่เข้า session
   * Add new Charge Point to session
   * Step 1: ตรวจสอบว่า charge point ไม่ซ้ำ
   * Step 2: สร้าง ChargePointEntry ใหม่
   * Step 3: เพิ่มเข้า array และอัปเดต session activity
   * @param chargePointId - รหัส charge point
   * @param serialNumber - หมายเลขซีเรียล
   * @param ws - การเชื่อมต่อ WebSocket
   * @param ocppVersion - เวอร์ชั่น OCPP
   * @param chargePointIdentity - ข้อมูลเพิ่มเติม
   * @returns ChargePointEntry ที่สร้างขึ้น หรือ null หากมีอยู่แล้ว
   */
  addChargePoint(
    chargePointId: string,
    serialNumber: string,
    ws: WebSocket,
    ocppVersion: string = '1.6',
    chargePointIdentity?: string
  ): ChargePointEntry | null {
    if (!this.session) {
      this.initializeSession();
    }

    // Step 1: ตรวจสอบว่า charge point ไม่ซ้ำ
    const existingIndex = this.session!.chargePoints.findIndex(
      cp => cp.chargePointId === chargePointId
    );

    if (existingIndex !== -1) {
      console.log(`⚠️ Charge Point ${chargePointId} already exists in session`);
      return null;
    }

    // Step 2: สร้าง ChargePointEntry ใหม่
    const now = new Date();
    const chargePointEntry: ChargePointEntry = {
      chargePointId,
      serialNumber,
      ws,
      isAuthenticated: false,
      connectedAt: now,
      lastSeen: now,
      lastHeartbeat: now,
      ocppVersion,
      messagesSent: 0,
      messagesReceived: 0,
      pendingMessages: [],
      chargePointIdentity,
      connectors: [],
      connectorCount: 0,
      connectorMetadataSyncedAt: undefined
    };

    // Step 3: เพิ่มเข้า array และอัปเดต session activity
    this.session!.chargePoints.push(chargePointEntry);
    this.session!.lastActivity = now;

    console.log(`✅ Added Charge Point ${chargePointId} to Gateway Session (Total: ${this.session!.chargePoints.length})`);
    
    // Emit event สำหรับการเพิ่ม charge point
    this.emit('chargePointAdded', {
      chargePointId,
      serialNumber,
      ocppVersion,
      connectedAt: now,
      totalChargePoints: this.session!.chargePoints.length
    });
    
    return chargePointEntry;
  }

  /**
   * ลบ Charge Point จาก session
   * Remove Charge Point from session
   * Step 1: ค้นหา charge point ใน array
   * Step 2: ปิด WebSocket หากยังเปิดอยู่
   * Step 3: ลบออกจาก array และอัปเดต session activity
   * @param chargePointId - รหัส charge point ที่ต้องการลบ
   * @returns true หากลบสำเร็จ, false หากไม่พบ
   */
  removeChargePoint(chargePointId: string): boolean {
    if (!this.session) return false;

    // Step 1: ค้นหา charge point ใน array
    const index = this.session.chargePoints.findIndex(
      cp => cp.chargePointId === chargePointId
    );

    if (index === -1) {
      console.log(`⚠️ Charge Point ${chargePointId} not found in session`);
      return false;
    }

    const chargePoint = this.session.chargePoints[index];

    // Step 2: ปิด WebSocket หากยังเปิดอยู่
    if (chargePoint.ws.readyState === WebSocket.OPEN) {
      chargePoint.ws.close();
    }

    // Step 3: ลบออกจาก array และอัปเดต session activity
    this.session.chargePoints.splice(index, 1);
    this.session.lastActivity = new Date();

    console.log(`🗑️ Removed Charge Point ${chargePointId} from Gateway Session (Remaining: ${this.session.chargePoints.length})`);
    
    // Emit event สำหรับการลบ charge point
    this.emit('chargePointRemoved', {
      chargePointId,
      serialNumber: chargePoint.serialNumber,
      removedAt: new Date(),
      totalChargePoints: this.session.chargePoints.length
    });
    
    return true;
  }

  /**
   * ค้นหา Charge Point ตาม ID
   * Find Charge Point by ID
   * @param chargePointId - รหัส charge point ที่ต้องการค้นหา
   * @returns ChargePointEntry หรือ undefined หากไม่พบ
   */
  getChargePoint(chargePointId: string): ChargePointEntry | undefined {
    if (!this.session) return undefined;

    return this.session.chargePoints.find(cp => cp.chargePointId === chargePointId);
  }

  /**
   * ค้นหา Charge Point ตาม Serial Number
   * Find Charge Point by Serial Number
   * @param serialNumber - หมายเลขซีเรียลที่ต้องการค้นหา
   * @returns ChargePointEntry หรือ undefined หากไม่พบ
   */
  getChargePointBySerial(serialNumber: string): ChargePointEntry | undefined {
    if (!this.session) return undefined;

    return this.session.chargePoints.find(cp => cp.serialNumber === serialNumber);
  }

  /**
   * ดึง Charge Points ทั้งหมด
   * Get all Charge Points
   * @returns Array ของ ChargePointEntry ทั้งหมด
   */
  getAllChargePoints(): ChargePointEntry[] {
    return this.session ? [...this.session.chargePoints] : [];
  }

  /**
   * ดึง Charge Points ที่ยืนยันตัวตนแล้วเท่านั้น
   * Get authenticated Charge Points only
   * @returns Array ของ ChargePointEntry ที่ยืนยันตัวตนแล้ว
   */
  getAuthenticatedChargePoints(): ChargePointEntry[] {
    if (!this.session) return [];

    return this.session.chargePoints.filter(cp => cp.isAuthenticated);
  }

  /**
   * ยืนยันตัวตน Charge Point
   * Authenticate Charge Point
   * @param chargePointId - รหัส charge point ที่ต้องการยืนยันตัวตน
   * @returns true หากยืนยันสำเร็จ, false หากไม่พบ
   */
  authenticateChargePoint(chargePointId: string): boolean {
    const chargePoint = this.getChargePoint(chargePointId);
    if (chargePoint) {
      chargePoint.isAuthenticated = true;
      this.session!.lastActivity = new Date();
      console.log(`🔐 Charge Point ${chargePointId} authenticated`);
      
      // Emit event สำหรับการ authenticate
      this.emit('chargePointUpdated', {
        chargePointId,
        type: 'authentication',
        isAuthenticated: chargePoint.isAuthenticated,
        lastActivity: this.session!.lastActivity
      });
      
      return true;
    }
    return false;
  }

  /**
   * ส่งข้อความไปยัง Charge Point
   * Send message to Charge Point
   * @param chargePointId - รหัส charge point ที่ต้องการส่งข้อความ
   * @param message - ข้อความที่ต้องการส่ง
   * @returns true หากส่งสำเร็จ, false หากส่งไม่สำเร็จ
   */
  sendMessage(chargePointId: string, message: any): boolean {
    const chargePoint = this.getChargePoint(chargePointId);
    
    if (chargePoint && chargePoint.ws.readyState === WebSocket.OPEN) {
      try {
        const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
        chargePoint.ws.send(messageToSend);
        
        // อัปเดตสถิติ
        chargePoint.messagesSent++;
        chargePoint.lastSeen = new Date();
        this.session!.totalMessagesSent++;
        this.session!.lastActivity = new Date();
        
        return true;
      } catch (error) {
        console.error(`Failed to send message to ${chargePointId}:`, error);
        return false;
      }
    }
    return false;
  }

  /**
   * เพิ่มจำนวนข้อความที่รับจาก Charge Point
   * Increment received message count for Charge Point
   * @param chargePointId - รหัส charge point ที่รับข้อความ
   */
  incrementReceivedMessages(chargePointId: string): void {
    const chargePoint = this.getChargePoint(chargePointId);
    if (chargePoint) {
      chargePoint.messagesReceived++;
      chargePoint.lastSeen = new Date();
      this.session!.totalMessagesReceived++;
      this.session!.lastActivity = new Date();
    }
  }

  /**
   * อัปเดตเวลาที่เห็น Charge Point ล่าสุด
   * Update Charge Point last seen timestamp
   * @param chargePointId - รหัส charge point ที่ต้องการอัปเดต
   */
  updateLastSeen(chargePointId: string): void {
    const chargePoint = this.getChargePoint(chargePointId);
    if (chargePoint) {
      chargePoint.lastSeen = new Date();
      this.session!.lastActivity = new Date();
      
      // Emit event สำหรับการอัปเดต lastSeen
      this.emit('chargePointUpdated', {
        chargePointId,
        type: 'lastSeen',
        lastSeen: chargePoint.lastSeen,
        lastActivity: this.session!.lastActivity
      });
    }
  }

  /**
   * อัปเดตเวลา Heartbeat ของ Charge Point
   * Update Charge Point heartbeat timestamp
   * @param chargePointId - รหัส charge point ที่ต้องการอัปเดต
   */
  updateHeartbeat(chargePointId: string): void {
    const chargePoint = this.getChargePoint(chargePointId);
    if (chargePoint) {
      chargePoint.lastHeartbeat = new Date();
      this.session!.lastActivity = new Date();
      
      // Emit event สำหรับการอัปเดต heartbeat
      this.emit('chargePointUpdated', {
        chargePointId,
        type: 'heartbeat',
        lastHeartbeat: chargePoint.lastHeartbeat,
        lastActivity: this.session!.lastActivity
      });
    }
  }

  /**
   * อัปเดตข้อมูลหัวชาร์จของ Charge Point
   * Update connector information for a Charge Point
   * @param chargePointId - รหัส charge point
   * @param connectors - ข้อมูลหัวชาร์จที่ได้รับจาก OCPP configuration
   */
  updateConnectorDetails(
    chargePointId: string,
    connectors: GatewayConnectorInfo[],
    connectorCount?: number
  ): void {
    const chargePoint = this.getChargePoint(chargePointId);
    if (!chargePoint) return;

    const now = new Date();
    const existingById = new Map<number, GatewayConnectorInfo>();

    for (const existingConnector of chargePoint.connectors) {
      existingById.set(existingConnector.connectorId, { ...existingConnector });
    }

    for (const incomingConnector of connectors) {
      const trimmedType = typeof incomingConnector.type === 'string'
        ? incomingConnector.type.trim()
        : undefined;
      const normalizedMaxCurrent =
        typeof incomingConnector.maxCurrent === 'number' && Number.isFinite(incomingConnector.maxCurrent)
          ? incomingConnector.maxCurrent
          : undefined;

      const base = existingById.get(incomingConnector.connectorId) || { connectorId: incomingConnector.connectorId };
      existingById.set(incomingConnector.connectorId, {
        connectorId: incomingConnector.connectorId,
        type: trimmedType || base.type,
        maxCurrent: normalizedMaxCurrent ?? base.maxCurrent,
        status: incomingConnector.status ?? base.status,
        metrics: incomingConnector.metrics
          ? { ...incomingConnector.metrics }
          : base.metrics
            ? { ...base.metrics }
            : undefined
      });
    }

    const knownIds = Array.from(existingById.keys());
    const highestKnownId = knownIds.length > 0 ? Math.max(...knownIds) : 0;
    const requestedCount = typeof connectorCount === 'number' && connectorCount > 0
      ? connectorCount
      : 0;
    const derivedCount = Math.max(
      requestedCount,
      highestKnownId,
      chargePoint.connectorCount
    );

    const mergedConnectors: GatewayConnectorInfo[] = [];
    for (let connectorId = 1; connectorId <= derivedCount; connectorId++) {
      const connector = existingById.get(connectorId);
      if (connector) {
        mergedConnectors.push({ ...connector });
      } else {
        mergedConnectors.push({ connectorId });
      }
    }

    chargePoint.connectors = mergedConnectors;
    chargePoint.connectorCount = derivedCount;
    chargePoint.connectorMetadataSyncedAt = now;
    this.session!.lastActivity = now;

    console.log(
      `🔄 Updated connector details for ${chargePointId}: ${chargePoint.connectorCount} connectors synced at ${now.toISOString()}`
    );
  }

  /**
   * ส่งข้อความไปยัง Charge Points ทั้งหมดที่ยืนยันตัวตนแล้ว
   * Broadcast message to all authenticated Charge Points
   * @param message - ข้อความที่ต้องการส่ง
   * @param excludeChargePointId - รหัส charge point ที่ไม่ต้องการส่งให้
   * @returns จำนวน charge points ที่ส่งสำเร็จ
   */
  broadcastMessage(message: any, excludeChargePointId?: string): number {
    let sentCount = 0;
    const authenticatedChargePoints = this.getAuthenticatedChargePoints();
    
    for (const chargePoint of authenticatedChargePoints) {
      if (excludeChargePointId && chargePoint.chargePointId === excludeChargePointId) {
        continue;
      }
      
      if (this.sendMessage(chargePoint.chargePointId, message)) {
        sentCount++;
      }
    }
    
    return sentCount;
  }

  /**
   * ทำความสะอาด Charge Points ที่ไม่ได้ใช้งาน
   * Cleanup stale Charge Points
   * @param staleThresholdMs - เวลาที่ถือว่าไม่ได้ใช้งาน (มิลลิวินาที)
   * @returns จำนวน charge points ที่ทำความสะอาด
   */
  cleanupStaleChargePoints(staleThresholdMs: number = 10 * 60 * 1000): number {
    if (!this.session) return 0;

    const now = new Date();
    const staleChargePointIds: string[] = [];
    
    for (const chargePoint of this.session.chargePoints) {
      const timeSinceLastSeen = now.getTime() - chargePoint.lastSeen.getTime();
      const isWebSocketClosed = chargePoint.ws.readyState === WebSocket.CLOSED || 
                               chargePoint.ws.readyState === WebSocket.CLOSING;
      
      if (timeSinceLastSeen > staleThresholdMs || isWebSocketClosed) {
        staleChargePointIds.push(chargePoint.chargePointId);
      }
    }
    
    // ลบ charge points ที่ไม่ได้ใช้งาน
    staleChargePointIds.forEach(id => this.removeChargePoint(id));
    
    if (staleChargePointIds.length > 0) {
      console.log(`🧹 Cleaned up ${staleChargePointIds.length} stale charge points`);
    }
    
    return staleChargePointIds.length;
  }

  /**
   * ดึงสถิติของ Gateway Session
   * Get Gateway Session statistics
   * @returns GatewaySessionStats ข้อมูลสถิติ
   */
  getStats(): GatewaySessionStats {
    if (!this.session) {
      return {
        sessionId: 'no-session',
        totalChargePoints: 0,
        activeChargePoints: 0,
        authenticatedChargePoints: 0,
        chargePointsWithHeartbeat: 0,
        totalMessagesSent: 0,
        totalMessagesReceived: 0,
        averageConnectionTime: 0,
        sessionUptime: 0
      };
    }

    const now = new Date();
    const heartbeatThreshold = 2 * 60 * 1000; // 2 นาที
    
    const chargePointsWithHeartbeat = this.session.chargePoints.filter(cp => {
      const timeSinceHeartbeat = now.getTime() - cp.lastHeartbeat.getTime();
      return timeSinceHeartbeat <= heartbeatThreshold;
    }).length;

    const totalConnectionTime = this.session.chargePoints.reduce((sum, cp) => {
      return sum + (now.getTime() - cp.connectedAt.getTime());
    }, 0);

    return {
      sessionId: this.session.sessionId,
      totalChargePoints: this.session.chargePoints.length,
      activeChargePoints: this.session.chargePoints.length,
      authenticatedChargePoints: this.session.chargePoints.filter(cp => cp.isAuthenticated).length,
      chargePointsWithHeartbeat,
      totalMessagesSent: this.session.totalMessagesSent,
      totalMessagesReceived: this.session.totalMessagesReceived,
      averageConnectionTime: this.session.chargePoints.length > 0 ? 
        totalConnectionTime / this.session.chargePoints.length : 0,
      sessionUptime: now.getTime() - this.session.createdAt.getTime()
    };
  }

  /**
   * ดึงข้อมูลรายละเอียดของ Gateway Session
   * Get detailed Gateway Session information
   * @returns ข้อมูลรายละเอียดของ session
   */
  getSessionInfo(): any {
    if (!this.session) return null;

    const stats = this.getStats();
    
    return {
      ...this.session,
      stats,
      chargePointDetails: this.session.chargePoints.map(cp => ({
        chargePointId: cp.chargePointId,
        serialNumber: cp.serialNumber,
        isAuthenticated: cp.isAuthenticated,
        connectedAt: cp.connectedAt,
        lastSeen: cp.lastSeen,
        lastHeartbeat: cp.lastHeartbeat,
        ocppVersion: cp.ocppVersion,
        messagesSent: cp.messagesSent,
        messagesReceived: cp.messagesReceived,
        wsState: cp.ws.readyState,
        pendingMessageCount: cp.pendingMessages.length,
        connectorCount: cp.connectorCount,
        connectors: cp.connectors
      }))
    };
  }

  /**
   * สร้าง session ID ที่ไม่ซ้ำกัน
   * Generate unique session ID
   * @returns session ID ที่ไม่ซ้ำกัน
   */
  private generateSessionId(): string {
    return `gateway_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ดึงข้อมูล Gateway Session
   * Get Gateway Session
   * @returns GatewaySession หรือ null หากไม่มี session
   */
  /**
   * อัปเดตสถานะของ connector เมื่อได้รับ StatusNotification
   * Update connector status when receiving StatusNotification
   * @param chargePointId - รหัส charge point
   * @param connectorId - หมายเลข connector
   * @param status - สถานะใหม่ของ connector
   * @param errorCode - รหัสข้อผิดพลาด (ถ้ามี)
   */
  updateConnectorStatus(
    chargePointId: string,
    connectorId: number,
    status: string,
    errorCode?: string
  ): boolean {
    if (!this.session) {
      console.error('No active session');
      return false;
    }

    const chargePoint = this.getChargePoint(chargePointId);
    if (!chargePoint) {
      console.error(`Charge point ${chargePointId} not found`);
      return false;
    }

    // ค้นหา connector ที่ต้องการอัปเดต
    const connectorIndex = chargePoint.connectors.findIndex(c => c.connectorId === connectorId);
    
    if (connectorIndex === -1) {
      // ถ้าไม่พบ connector ให้สร้างใหม่
      console.log(`Creating new connector ${connectorId} for charge point ${chargePointId}`);
      chargePoint.connectors.push({
        connectorId,
        status
      });
    } else {
      // อัปเดตสถานะของ connector ที่มีอยู่
      const oldStatus = chargePoint.connectors[connectorIndex].status;
      chargePoint.connectors[connectorIndex].status = status;
      console.log(`Updated connector ${connectorId} status from ${oldStatus} to ${status} for charge point ${chargePointId}`);
    }

    // อัปเดต lastActivity
    this.session.lastActivity = new Date();
    chargePoint.lastSeen = new Date();

    // ส่ง event สำหรับ real-time updates
    this.emit('chargePointUpdated', {
      chargePointId,
      type: 'connectorStatus',
      connectorId,
      status,
      errorCode,
      lastActivity: this.session.lastActivity
    });

    console.log(`✅ Connector ${connectorId} status updated to ${status} for charge point ${chargePointId}`);
    return true;
  }

  updateConnectorMeterValues(
    chargePointId: string,
    connectorId: number,
    meterValues: ConnectorMeterValue[],
    transactionId?: number
  ): boolean {
    if (!this.session) {
      console.error('No active session');
      return false;
    }

    const chargePoint = this.getChargePoint(chargePointId);
    if (!chargePoint) {
      console.error(`Charge point ${chargePointId} not found`);
      return false;
    }

    let connector = chargePoint.connectors.find(c => c.connectorId === connectorId);
    if (!connector) {
      console.log(`Creating new connector ${connectorId} for charge point ${chargePointId} while updating meter values`);
      connector = {
        connectorId,
        metrics: {}
      };
      chargePoint.connectors.push(connector);
    } else if (!connector.metrics) {
      connector.metrics = {};
    }

    const metrics = connector.metrics!;
    let updated = false;
    let latestTimestamp = metrics.lastMeterTimestamp ? metrics.lastMeterTimestamp.getTime() : 0;

    const updateEnergy = (value: number, unit?: string) => {
      const normalizedUnit = unit?.toLowerCase();
      if (normalizedUnit === 'kwh') {
        metrics.energyDeliveredKWh = value;
      } else if (normalizedUnit === 'wh' || !normalizedUnit) {
        metrics.energyDeliveredKWh = value / 1000;
      } else {
        metrics.energyDeliveredKWh = value;
      }
      updated = true;
    };

    const updatePower = (value: number, unit?: string) => {
      const normalizedUnit = unit?.toLowerCase();
      if (normalizedUnit === 'w') {
        metrics.powerKw = value / 1000;
      } else if (normalizedUnit === 'kw' || normalizedUnit === 'kilowatt') {
        metrics.powerKw = value;
      } else {
        metrics.powerKw = value;
      }
      updated = true;
    };

    const updateCurrent = (value: number) => {
      metrics.currentAmp = value;
      updated = true;
    };

    const updateVoltage = (value: number) => {
      metrics.voltage = value;
      updated = true;
    };

    const updateSoc = (value: number) => {
      metrics.stateOfChargePercent = value;
      updated = true;
    };

    for (const meterValue of meterValues) {
      const timestampMs = Date.parse(meterValue.timestamp);
      if (!Number.isNaN(timestampMs) && timestampMs > latestTimestamp) {
        latestTimestamp = timestampMs;
      }

      for (const sample of meterValue.sampledValue || []) {
        const numericValue = parseFloat(sample.value);
        if (!Number.isFinite(numericValue)) {
          continue;
        }

        const measurand = (sample.measurand || '').toLowerCase();
        switch (measurand) {
          case '':
          case 'energy.active.import.register':
            updateEnergy(numericValue, sample.unit);
            break;
          case 'soc':
            updateSoc(numericValue);
            break;
          case 'power.active.import':
            updatePower(numericValue, sample.unit);
            break;
          case 'current.import':
          case 'current.export':
          case 'current.offered':
            updateCurrent(numericValue);
            break;
          case 'voltage':
            updateVoltage(numericValue);
            break;
          default:
            // ไม่รองรับ measurand นี้ในตอนนี้
            break;
        }
      }
    }

    if (latestTimestamp > 0) {
      metrics.lastMeterTimestamp = new Date(latestTimestamp);
      updated = true;
    }

    if (typeof transactionId === 'number' && Number.isFinite(transactionId)) {
      if (metrics.activeTransactionId !== transactionId) {
        metrics.activeTransactionId = transactionId;
      }
      if (!metrics.transactionStartedAt) {
        metrics.transactionStartedAt = new Date(latestTimestamp > 0 ? latestTimestamp : Date.now());
      }
    }

    if (!updated) {
      return false;
    }

    const now = new Date();
    this.session.lastActivity = now;
    chargePoint.lastSeen = now;

    const metricsSnapshot = { ...metrics };

    this.emit('chargePointUpdated', {
      chargePointId,
      type: 'connectorMetrics',
      connectorId,
      metrics: metricsSnapshot,
      transactionId,
      lastActivity: this.session.lastActivity
    });

    console.log(
      `📊 Updated meter values for connector ${connectorId} on charge point ${chargePointId}:`,
      {
        transactionId,
        metrics: metricsSnapshot
      }
    );

    return true;
  }

  startConnectorTransaction(
    chargePointId: string,
    connectorId: number,
    transactionId: number,
    options?: {
      idTag?: string;
      meterStart?: number;
      startedAt?: string | Date;
    }
  ): boolean {
    if (!this.session) {
      console.error('No active session');
      return false;
    }

    const chargePoint = this.getChargePoint(chargePointId);
    if (!chargePoint) {
      console.error(`Charge point ${chargePointId} not found when starting transaction`);
      return false;
    }

    let connector = chargePoint.connectors.find(c => c.connectorId === connectorId);
    if (!connector) {
      console.log(`Creating new connector ${connectorId} for charge point ${chargePointId} while starting transaction`);
      connector = {
        connectorId,
        metrics: {}
      };
      chargePoint.connectors.push(connector);
    } else if (!connector.metrics) {
      connector.metrics = {};
    }

    const metrics = connector.metrics!;
    metrics.activeTransactionId = transactionId;
    metrics.transactionIdTag = options?.idTag;
    if (typeof options?.meterStart === 'number' && Number.isFinite(options.meterStart)) {
      metrics.meterStart = options.meterStart;
    }

    const startedAt = options?.startedAt ? new Date(options.startedAt) : new Date();
    if (!Number.isNaN(startedAt.getTime())) {
      metrics.transactionStartedAt = startedAt;
      metrics.lastMeterTimestamp = startedAt;
    } else if (!metrics.transactionStartedAt) {
      metrics.transactionStartedAt = new Date();
    }

    metrics.lastTransactionCompletedAt = undefined;

    const now = new Date();
    this.session.lastActivity = now;
    chargePoint.lastSeen = now;

    const metricsSnapshot = { ...metrics };
    this.emit('chargePointUpdated', {
      chargePointId,
      type: 'connectorMetrics',
      connectorId,
      metrics: metricsSnapshot,
      transactionId,
      lastActivity: this.session.lastActivity
    });

    console.log(`🟢 Transaction ${transactionId} started on ${chargePointId} connector ${connectorId}`);
    return true;
  }

  stopConnectorTransaction(
    chargePointId: string,
    transactionId: number,
    options?: {
      meterStop?: number;
      stoppedAt?: string | Date;
    }
  ): boolean {
    if (!this.session) {
      console.error('No active session');
      return false;
    }

    const chargePoint = this.getChargePoint(chargePointId);
    if (!chargePoint) {
      console.error(`Charge point ${chargePointId} not found when stopping transaction`);
      return false;
    }

    const connector = chargePoint.connectors.find(
      c => c.metrics?.activeTransactionId === transactionId
    );

    if (!connector || !connector.metrics) {
      console.warn(`No active connector found for transaction ${transactionId} on ${chargePointId}`);
      return false;
    }

    const metrics = connector.metrics;
    const stoppedAt = options?.stoppedAt ? new Date(options.stoppedAt) : new Date();
    if (!Number.isNaN(stoppedAt.getTime())) {
      metrics.lastTransactionCompletedAt = stoppedAt;
      metrics.lastMeterTimestamp = stoppedAt;
    } else {
      metrics.lastTransactionCompletedAt = new Date();
    }

    if (typeof options?.meterStop === 'number' && Number.isFinite(options.meterStop)) {
      metrics.energyDeliveredKWh = options.meterStop;
    }

    metrics.activeTransactionId = undefined;
    metrics.transactionStartedAt = undefined;
    metrics.transactionIdTag = undefined;
    metrics.meterStart = undefined;

    const now = new Date();
    this.session.lastActivity = now;
    chargePoint.lastSeen = now;

    const metricsSnapshot = { ...metrics };
    this.emit('chargePointUpdated', {
      chargePointId,
      type: 'connectorMetrics',
      connectorId: connector.connectorId,
      metrics: metricsSnapshot,
      transactionId,
      lastActivity: this.session.lastActivity
    });

    console.log(`🟥 Transaction ${transactionId} stopped on ${chargePointId} connector ${connector.connectorId}`);
    return true;
  }

  getActiveTransactionId(chargePointId: string, connectorId: number): number | undefined {
    const chargePoint = this.getChargePoint(chargePointId);
    if (!chargePoint) {
      return undefined;
    }

    const connector = chargePoint.connectors.find(c => c.connectorId === connectorId);
    return connector?.metrics?.activeTransactionId;
  }

  getSession(): GatewaySession | null {
    return this.session;
  }
}

// ส่งออก singleton instance สำหรับใช้งานทั่วทั้งระบบ
// Export singleton instance for system-wide usage
export const gatewaySessionManager = new GatewaySessionManager();
