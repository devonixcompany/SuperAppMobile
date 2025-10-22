import WebSocket from 'ws';
import { gatewaySessionManager } from '../handlers/gatewaySessionManager';

interface UserConnection {
  ws: WebSocket;
  chargePointId: string;
  connectorId: string;
  connectedAt: Date;
}

interface StatusUpdate {
  type: 'status' | 'heartbeat' | 'charging' | 'connector';
  timestamp: string;
  data: any;
}

export class UserConnectionManager {
  private connections: Map<string, UserConnection[]> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // ฟัง events จาก gatewaySessionManager
    this.setupEventListeners();
  }

  /**
   * ตั้งค่า event listeners สำหรับ gatewaySessionManager
   */
  private setupEventListeners(): void {
    // ฟัง event เมื่อมี charge point เพิ่มเข้ามา
    gatewaySessionManager.on('chargePointAdded', (data) => {
      const update: StatusUpdate = {
        type: 'status',
        timestamp: new Date().toISOString(),
        data: {
          chargePointId: data.chargePointId,
          status: 'ONLINE',
          isOnline: true,
          message: 'Charge Point เชื่อมต่อแล้ว',
          connectedAt: data.connectedAt,
          serialNumber: data.serialNumber
        }
      };
      this.broadcastToChargePoint(data.chargePointId, update);
    });

    // ฟัง event เมื่อมี charge point ถูกลบ
    gatewaySessionManager.on('chargePointRemoved', (data) => {
      const update: StatusUpdate = {
        type: 'status',
        timestamp: new Date().toISOString(),
        data: {
          chargePointId: data.chargePointId,
          status: 'OFFLINE',
          isOnline: false,
          message: 'Charge Point ออฟไลน์',
          removedAt: data.removedAt,
          serialNumber: data.serialNumber
        }
      };
      this.broadcastToChargePoint(data.chargePointId, update);
    });

    // ฟัง event เมื่อมีการอัปเดต charge point
    gatewaySessionManager.on('chargePointUpdated', (data) => {
      let status: string;
      let additionalData: any = {};

      switch (data.type) {
        case 'lastSeen':
          status = 'ONLINE';
          additionalData.lastSeen = data.lastSeen;
          break;
        case 'heartbeat':
          status = 'ONLINE';
          additionalData.lastHeartbeat = data.lastHeartbeat;
          break;
        case 'authentication':
          status = data.isAuthenticated ? 'AUTHENTICATED' : 'UNAUTHENTICATED';
          additionalData.isAuthenticated = data.isAuthenticated;
          break;
        case 'connectorStatus':
          status = data.status;
          additionalData.connectorId = data.connectorId;
          additionalData.errorCode = data.errorCode;
          break;
        default:
          status = 'UPDATED';
      }

      const update: StatusUpdate = {
        type: 'status',
        timestamp: new Date().toISOString(),
        data: {
          chargePointId: data.chargePointId,
          status,
          updateType: data.type,
          ...additionalData,
          ...data
        }
      };
      this.broadcastToChargePoint(data.chargePointId, update);
    });
  }

  /**
   * เพิ่ม user connection ใหม่
   */
  addConnection(ws: WebSocket, chargePointId: string, connectorId: string): void {
    const connectionKey = `${chargePointId}:${connectorId}`;
    const connection: UserConnection = {
      ws,
      chargePointId,
      connectorId,
      connectedAt: new Date()
    };

    // เพิ่ม connection ลงใน map
    if (!this.connections.has(connectionKey)) {
      this.connections.set(connectionKey, []);
    }
    this.connections.get(connectionKey)!.push(connection);

    console.log(`👤 Added user connection for ${chargePointId}/${connectorId} (Total: ${this.connections.get(connectionKey)!.length})`);

    // เริ่ม heartbeat สำหรับ connection นี้
    this.startHeartbeat(ws, connectionKey);

    // จัดการการปิด connection
    ws.on('close', () => {
      this.removeConnection(ws, chargePointId, connectorId);
    });

    ws.on('error', (error) => {
      console.error(`❌ User WebSocket error for ${chargePointId}/${connectorId}:`, error);
      this.removeConnection(ws, chargePointId, connectorId);
    });
  }

  /**
   * ลบ user connection
   */
  removeConnection(ws: WebSocket, chargePointId: string, connectorId: string): void {
    const connectionKey = `${chargePointId}:${connectorId}`;
    const connections = this.connections.get(connectionKey);

    if (connections) {
      const index = connections.findIndex(conn => conn.ws === ws);
      if (index !== -1) {
        connections.splice(index, 1);
        console.log(`👤 Removed user connection for ${chargePointId}/${connectorId} (Remaining: ${connections.length})`);

        // ถ้าไม่มี connection เหลือ ให้ลบ key ออก
        if (connections.length === 0) {
          this.connections.delete(connectionKey);
        }
      }
    }

    // หยุด heartbeat
    this.stopHeartbeat(connectionKey);
  }

  /**
   * ส่งข้อมูลอัปเดตไปยัง user connections ที่เกี่ยวข้อง
   */
  broadcastToChargePoint(chargePointId: string, update: StatusUpdate): void {
    let sentCount = 0;

    // ส่งไปยังทุก connector ของ charge point นี้
    for (const [connectionKey, connections] of this.connections.entries()) {
      if (connectionKey.startsWith(`${chargePointId}:`)) {
        connections.forEach(connection => {
          if (connection.ws.readyState === WebSocket.OPEN) {
            try {
              connection.ws.send(JSON.stringify(update));
              sentCount++;
            } catch (error) {
              console.error(`❌ Error sending update to ${connectionKey}:`, error);
            }
          }
        });
      }
    }

    if (sentCount > 0) {
      console.log(`📤 Broadcasted ${update.type} update to ${sentCount} user connections for ${chargePointId}`);
    }
  }

  /**
   * ส่งข้อมูลอัปเดตไปยัง connector เฉพาะ
   */
  broadcastToConnector(chargePointId: string, connectorId: string, update: StatusUpdate): void {
    const connectionKey = `${chargePointId}:${connectorId}`;
    const connections = this.connections.get(connectionKey);

    if (connections) {
      let sentCount = 0;
      connections.forEach(connection => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          try {
            connection.ws.send(JSON.stringify(update));
            sentCount++;
          } catch (error) {
            console.error(`❌ Error sending update to ${connectionKey}:`, error);
          }
        }
      });

      if (sentCount > 0) {
        console.log(`📤 Sent ${update.type} update to ${sentCount} user connections for ${chargePointId}/${connectorId}`);
      }
    }
  }

  /**
   * ส่งข้อมูลอัปเดตไปยังทุก user connections
   */
  broadcastToAll(update: StatusUpdate): void {
    let sentCount = 0;

    for (const connections of this.connections.values()) {
      connections.forEach(connection => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          try {
            connection.ws.send(JSON.stringify(update));
            sentCount++;
          } catch (error) {
            console.error(`❌ Error broadcasting to connection:`, error);
          }
        }
      });
    }

    if (sentCount > 0) {
      console.log(`📤 Broadcasted ${update.type} update to ${sentCount} user connections`);
    }
  }

  /**
   * เริ่ม heartbeat สำหรับ connection
   */
  private startHeartbeat(ws: WebSocket, connectionKey: string): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const heartbeat: StatusUpdate = {
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
          data: {
            serverTime: new Date().toISOString()
          }
        };
        
        try {
          ws.send(JSON.stringify(heartbeat));
        } catch (error) {
          console.error(`❌ Error sending heartbeat to ${connectionKey}:`, error);
          this.stopHeartbeat(connectionKey);
        }
      } else {
        this.stopHeartbeat(connectionKey);
      }
    }, 30000);

    this.heartbeatIntervals.set(connectionKey, interval);
  }

  /**
   * หยุด heartbeat
   */
  private stopHeartbeat(connectionKey: string): void {
    const interval = this.heartbeatIntervals.get(connectionKey);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(connectionKey);
    }
  }

  /**
   * ดูสถิติ connections
   */
  getStats(): { totalConnections: number; connectionsByChargePoint: Record<string, number> } {
    let totalConnections = 0;
    const connectionsByChargePoint: Record<string, number> = {};

    for (const [connectionKey, connections] of this.connections.entries()) {
      const [chargePointId] = connectionKey.split(':');
      totalConnections += connections.length;
      
      if (!connectionsByChargePoint[chargePointId]) {
        connectionsByChargePoint[chargePointId] = 0;
      }
      connectionsByChargePoint[chargePointId] += connections.length;
    }

    return {
      totalConnections,
      connectionsByChargePoint
    };
  }

  /**
   * ปิดทุก connections
   */
  closeAllConnections(): void {
    for (const connections of this.connections.values()) {
      connections.forEach(connection => {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.close(1001, 'Server shutting down');
        }
      });
    }

    // หยุดทุก heartbeat intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }

    this.connections.clear();
    this.heartbeatIntervals.clear();
    console.log('🔌 All user connections closed');
  }
}