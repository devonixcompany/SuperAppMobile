// Frontend WebSocket Server
// WebSocket server สำหรับ frontend เพื่อดูสถานะหัวชาร์จแบบเรียลไทม์

import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { gatewaySessionManager } from '../handlers/gatewaySessionManager';
import { sessionValidator } from './sessionValidator';
import { realTimeDataManager } from './realTimeDataManager';
import {
  FrontendConnection,
  ChargingData,
  ConnectorStatus,
  StatusMessage,
  ChargingDataMessage,
  ErrorMessage,
  HeartbeatMessage,
  DEFAULT_TRANSMISSION_SETTINGS,
  TransmissionSettings
} from './types';

/**
 * คลาสจัดการ WebSocket Server สำหรับ Frontend
 * Frontend WebSocket Server Manager
 * รับการเชื่อมต่อจาก frontend ผ่าน ws://localhost:8081/{chargePointId}/{connectorId}
 */
export class FrontendWebSocketServer {
  private wss: WebSocketServer;
  private connections: Map<string, FrontendConnection> = new Map();
  private settings: TransmissionSettings = DEFAULT_TRANSMISSION_SETTINGS;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private dataUpdateInterval: NodeJS.Timeout | null = null;
  private port: number;

  constructor(port: number = parseInt(process.env.FRONTEND_WS_PORT || '8081', 10)) {
    this.port = port;
    // สร้าง WebSocket Server
    this.wss = new WebSocketServer({
      port,
      verifyClient: this.verifyClient.bind(this)
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    this.startDataUpdates();

    console.log(`🚀 Frontend WebSocket Server started on port ${port}`);
  }

  /**
   * ตรวจสอบการเชื่อมต่อจาก client
   * Verify client connection
   * URL format: ws://localhost:{port}/{chargePointId}/{connectorId}
   */
  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    try {
      console.log(`🔍 Verifying client connection: ${info.req.url}`);
      const url = new URL(info.req.url || '', `ws://localhost:${this.port}`);
      const pathParts = url.pathname.split('/').filter(part => part.length > 0);

      console.log(`🔍 Path parts: [${pathParts.join(', ')}]`);

      // ตรวจสอบรูปแบบ URL: /{chargePointId}/{connectorId}
      if (pathParts.length !== 2) {
        console.log(`❌ Invalid URL format: ${url.pathname}. Expected: /{chargePointId}/{connectorId}`);
        return false;
      }

      const [chargePointId, connectorIdStr] = pathParts;
      const connectorId = parseInt(connectorIdStr, 10);

      // ตรวจสอบ connectorId เป็นตัวเลข
      if (isNaN(connectorId) || connectorId < 1) {
        console.log(`❌ Invalid connector ID: ${connectorIdStr}`);
        return false;
      }

      // เก็บข้อมูลใน request สำหรับใช้ใน connection handler
      (info.req as any).chargePointId = chargePointId;
      (info.req as any).connectorId = connectorId;

      console.log(`✅ Client verified: ${chargePointId}/${connectorId}`);
      return true;
    } catch (error) {
      console.error('❌ Error verifying client:', error);
      return false;
    }
  }

  /**
   * ตั้งค่า Event Handlers สำหรับ WebSocket Server
   * Setup WebSocket Server event handlers
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('error', this.handleServerError.bind(this));
  }

  /**
   * จัดการการเชื่อมต่อใหม่จาก frontend
   * Handle new frontend connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const chargePointId = (req as any).chargePointId;
    const connectorId = (req as any).connectorId;
    const connectionId = `${chargePointId}-${connectorId}-${Date.now()}`;

    console.log(`🔗 Frontend connected: ${chargePointId}/connector-${connectorId}`);

    // ตรวจสอบ session และสถานะออนไลน์
    const validation = sessionValidator.validateSession(chargePointId, connectorId);
    
    if (!validation.isValid) {
      this.sendError(connectionId, 'SESSION_NOT_FOUND', `ไม่พบ session สำหรับเครื่องชาร์จ ${chargePointId}`);
      
      // ส่งสัญญาณเช็คสถานะ
      console.log(`🔍 ส่งสัญญาณเช็คสถานะสำหรับ ${chargePointId}`);
      sessionValidator.checkOfflineChargePoint(chargePointId);
      
      ws.close(1008, 'Session not found');
      return;
    }

    if (!validation.isOnline) {
      this.sendError(connectionId, 'CHARGE_POINT_OFFLINE', `เครื่องชาร์จ ${chargePointId} ออฟไลน์`);
      
      // ส่งสัญญาณเช็คสถานะ
      console.log(`🔍 ส่งสัญญาณเช็คสถานะสำหรับ ${chargePointId} (ออฟไลน์)`);
      sessionValidator.checkOfflineChargePoint(chargePointId);
      
      ws.close(1008, 'Charge point offline');
      return;
    }

    // สร้าง FrontendConnection
    const connection: FrontendConnection = {
      id: connectionId,
      chargePointId,
      connectorId,
      ws,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    // เก็บการเชื่อมต่อ
    this.connections.set(connectionId, connection);
    
    // เพิ่มการเชื่อมต่อใน real-time data manager
    realTimeDataManager.addFrontendConnection(connection);

    // ตั้งค่า event handlers สำหรับ connection นี้
    ws.on('message', (data) => this.handleMessage(connectionId, data));
    ws.on('close', () => this.handleDisconnection(connectionId));
    ws.on('error', (error) => this.handleConnectionError(connectionId, error));
    ws.on('pong', () => this.handlePong(connectionId));

    // ส่งสถานะเริ่มต้น
    this.sendInitialStatus(connectionId);
  }

  /**
   * จัดการข้อความจาก frontend
   * Handle message from frontend
   */
  private handleMessage(connectionId: string, data: WebSocket.Data): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const message = JSON.parse(data.toString());
      connection.lastActivity = new Date();

      console.log(`📨 Message from ${connection.chargePointId}/connector-${connection.connectorId}:`, message);

      // สามารถเพิ่มการจัดการข้อความจาก frontend ได้ที่นี่
      // เช่น การขอข้อมูลเฉพาะ หรือการตั้งค่าต่างๆ

    } catch (error) {
      console.error(`❌ Error parsing message from ${connectionId}:`, error);
      this.sendError(connectionId, 'PARSE_ERROR', 'Invalid message format');
    }
  }

  /**
   * จัดการการตัดการเชื่อมต่อ
   * Handle disconnection
   */
  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      console.log(`🔌 Frontend disconnected: ${connection.chargePointId}/connector-${connection.connectorId}`);
      connection.isActive = false;
      this.connections.delete(connectionId);
      
      // ลบการเชื่อมต่อจาก real-time data manager
      realTimeDataManager.removeFrontendConnection(connectionId);
    }
  }

  /**
   * จัดการข้อผิดพลาดของการเชื่อมต่อ
   * Handle connection error
   */
  private handleConnectionError(connectionId: string, error: Error): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      console.error(`❌ Connection error for ${connection.chargePointId}/connector-${connection.connectorId}:`, error);
      this.sendError(connectionId, 'CONNECTION_ERROR', error.message);
    }
  }

  /**
   * จัดการ pong response
   * Handle pong response
   */
  private handlePong(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * จัดการข้อผิดพลาดของ server
   * Handle server error
   */
  private handleServerError(error: Error): void {
    console.error('❌ WebSocket Server Error:', error);
  }

  /**
   * ส่งสถานะเริ่มต้นให้ frontend
   * Send initial status to frontend
   */
  private sendInitialStatus(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // ตรวจสอบว่าเครื่องชาร์จออนไลน์หรือไม่
    const chargePoint = gatewaySessionManager.getChargePoint(connection.chargePointId);
    const isOnline = chargePoint !== undefined && chargePoint.ws.readyState === WebSocket.OPEN;

    // ส่งสถานะเริ่มต้น
    const statusMessage: StatusMessage = {
      type: 'status',
      timestamp: new Date(),
      data: {
        chargePointId: connection.chargePointId,
        connectorId: connection.connectorId,
        status: isOnline ? ConnectorStatus.AVAILABLE : ConnectorStatus.UNAVAILABLE,
        isOnline,
        message: isOnline ? 'เครื่องชาร์จออนไลน์' : 'เครื่องชาร์จออฟไลน์'
      }
    };

    this.sendMessage(connectionId, statusMessage);

    // หากออนไลน์ ส่งข้อมูลการชาร์จปัจจุบัน
    if (isOnline) {
      this.sendCurrentChargingData(connectionId);
    }
  }

  /**
   * ส่งข้อมูลการชาร์จปัจจุบัน
   * Send current charging data
   */
  private sendCurrentChargingData(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const chargePoint = gatewaySessionManager.getChargePoint(connection.chargePointId);
    if (!chargePoint) return;

    // ค้นหาข้อมูลหัวชาร์จ
    const connector = chargePoint.connectors.find(c => c.connectorId === connection.connectorId);
    if (!connector) {
      this.sendError(connectionId, 'CONNECTOR_NOT_FOUND', `ไม่พบหัวชาร์จหมายเลข ${connection.connectorId}`);
      return;
    }

    // สร้างข้อมูลการชาร์จ (ข้อมูลจำลองสำหรับตัวอย่าง)
    const chargingData: ChargingData = {
      connectorId: connection.connectorId,
      status: ConnectorStatus.AVAILABLE, // ควรได้จากข้อมูลจริงของ OCPP
      chargingPercentage: Math.floor(Math.random() * 100), // ข้อมูลจำลอง
      currentPower: Math.random() * 50, // ข้อมูลจำลอง (0-50 kW)
      currentMeter: Math.random() * 1000, // ข้อมูลจำลอง (0-1000 kWh)
      voltage: 220 + Math.random() * 20, // ข้อมูลจำลอง (220-240V)
      current: Math.random() * 32, // ข้อมูลจำลอง (0-32A)
      temperature: 25 + Math.random() * 15 // ข้อมูลจำลอง (25-40°C)
    };

    const message: ChargingDataMessage = {
      type: 'charging_data',
      timestamp: new Date(),
      data: chargingData
    };

    this.sendMessage(connectionId, message);
  }

  /**
   * ส่งข้อความไป frontend
   * Send message to frontend
   */
  private sendMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isActive || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`❌ Error sending message to ${connectionId}:`, error);
      this.handleDisconnection(connectionId);
    }
  }

  /**
   * ส่งข้อความข้อผิดพลาด
   * Send error message
   */
  private sendError(connectionId: string, code: string, message: string, details?: any): void {
    const errorMessage: ErrorMessage = {
      type: 'error',
      timestamp: new Date(),
      data: {
        code,
        message,
        details
      }
    };

    this.sendMessage(connectionId, errorMessage);
  }

  /**
   * เริ่ม heartbeat
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatMessage: HeartbeatMessage = {
        type: 'heartbeat',
        timestamp: new Date(),
        data: {
          timestamp: new Date(),
          connectedClients: this.connections.size
        }
      };

      // ส่ง heartbeat ไปทุก connection
      for (const [connectionId, connection] of this.connections) {
        if (connection.isActive && connection.ws.readyState === WebSocket.OPEN) {
          // ส่ง ping เพื่อตรวจสอบการเชื่อมต่อ
          connection.ws.ping();
          
          // ส่ง heartbeat message
          this.sendMessage(connectionId, heartbeatMessage);
        } else {
          // ลบการเชื่อมต่อที่ไม่ active
          this.handleDisconnection(connectionId);
        }
      }
    }, this.settings.heartbeatInterval);
  }

  /**
   * เริ่มการอัปเดตข้อมูลแบบเรียลไทม์
   * Start real-time data updates
   */
  private startDataUpdates(): void {
    this.dataUpdateInterval = setInterval(() => {
      // อัปเดตข้อมูลสำหรับทุก connection
      for (const [connectionId, connection] of this.connections) {
        if (connection.isActive && connection.ws.readyState === WebSocket.OPEN) {
          this.sendCurrentChargingData(connectionId);
        }
      }
    }, this.settings.dataUpdateInterval);
  }

  /**
   * หยุดการทำงานของ server
   * Stop server
   */
  public stop(): void {
    console.log('🛑 Stopping Frontend WebSocket Server...');

    // หยุด intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
      this.dataUpdateInterval = null;
    }

    // ปิดการเชื่อมต่อทั้งหมด
    for (const [connectionId, connection] of this.connections) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close();
      }
    }

    this.connections.clear();

    // ปิด server
    this.wss.close(() => {
      console.log('✅ Frontend WebSocket Server stopped');
    });
  }

  /**
   * ดึงสถิติการเชื่อมต่อ
   * Get connection statistics
   */
  public getStats(): any {
    const activeConnections = Array.from(this.connections.values()).filter(c => c.isActive);
    
    return {
      totalConnections: this.connections.size,
      activeConnections: activeConnections.length,
      connectionsByChargePoint: activeConnections.reduce((acc, conn) => {
        acc[conn.chargePointId] = (acc[conn.chargePointId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

// สร้าง instance ของ Frontend WebSocket Server
export const frontendWebSocketServer = new FrontendWebSocketServer();