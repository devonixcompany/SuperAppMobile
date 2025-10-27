import WebSocket from 'ws';
import { gatewaySessionManager } from '../handlers/gatewaySessionManager';

interface UserConnection {
  ws: WebSocket;
  chargePointId: string;
  connectorId: string;
  connectedAt: Date;
}

interface StatusUpdate {
  type: 'status' | 'heartbeat' | 'charging' | 'connector' | 'connectorStatus' | 'charging_data';
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
      const {
        type: updateReason,
        status: existingStatus,
        chargePointId,
        ...rest
      } = data;

      let status: string | null = existingStatus ?? null;
      let additionalData: Record<string, any> = {};
      let messageType: StatusUpdate['type'] = 'status';

      switch (updateReason) {
        case 'lastSeen':
          messageType = 'heartbeat';
          status = null;
          additionalData.lastSeen = data.lastSeen;
          additionalData.lastActivity = data.lastActivity;
          break;
        case 'heartbeat':
          messageType = 'heartbeat';
          status = null;
          additionalData.lastHeartbeat = data.lastHeartbeat;
          additionalData.lastActivity = data.lastActivity;
          break;
        case 'authentication':
          status = data.isAuthenticated ? 'AUTHENTICATED' : 'UNAUTHENTICATED';
          additionalData.isAuthenticated = data.isAuthenticated;
          break;
        case 'connectorStatus': {
          const connectorUpdate: StatusUpdate = {
            type: 'connectorStatus',
            timestamp: new Date().toISOString(),
            data: {
              chargePointId: data.chargePointId,
              connectorId: data.connectorId,
              status: data.status,
              errorCode: data.errorCode,
              isOnline: true,
              message: `Connector ${data.connectorId} status updated to ${data.status}`
            }
          };
          this.broadcastToConnector(data.chargePointId, data.connectorId.toString(), connectorUpdate);
          return;
        }
        case 'connectorMetrics': {
          const metrics = data.metrics || {};
          const chargingUpdate: StatusUpdate = {
            type: 'charging_data',
            timestamp: new Date().toISOString(),
            data: {
              chargePointId: data.chargePointId,
              connectorId: data.connectorId,
              chargingPercentage: metrics.stateOfChargePercent ?? null,
              currentPower: metrics.powerKw ?? null,
              currentMeter: metrics.energyDeliveredKWh ?? null,
              energyDelivered: metrics.energyDeliveredKWh ?? null,
              voltage: metrics.voltage ?? null,
              current: metrics.currentAmp ?? null,
              lastMeterTimestamp: metrics.lastMeterTimestamp ?? null,
              transactionId: data.transactionId ?? null,
              status: metrics.connectorStatus ?? metrics.status ?? null,
              metrics
            }
          };
          this.broadcastToConnector(data.chargePointId, data.connectorId.toString(), chargingUpdate);
          return;
        }
        default:
          if (!status) {
            status = 'UPDATED';
          }
      }

      const updateData: Record<string, any> = {
        chargePointId,
        updateType: updateReason,
        ...rest,
        ...additionalData
      };

      if (status) {
        updateData.status = status;
      } else {
        delete updateData.status;
      }

      const update: StatusUpdate = {
        type: messageType,
        timestamp: new Date().toISOString(),
        data: updateData
      };

      this.broadcastToChargePoint(chargePointId, update);
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

    this.sendInitialConnectorState(ws, chargePointId, connectorId);

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
              console.error(`❌ ส่งข้อมูลอัปเดตไปยัง ${connectionKey} ไม่สำเร็จ:`, error);
            }
          }
        });
      }
    }

    if (sentCount > 0) {
      console.log(`📤 ส่งข้อมูล ${update.type} ไปยังผู้ใช้ ${sentCount} การเชื่อมต่อสำหรับ ${chargePointId}`);
    }
  }

  private sendInitialConnectorState(ws: WebSocket, chargePointId: string, connectorId: string): void {
    const chargePoint = gatewaySessionManager.getChargePoint(chargePointId);
    if (!chargePoint) {
      console.log(`⚠️ ไม่มีข้อมูล Charge Point สดขณะส่งสถานะเริ่มต้นสำหรับ ${chargePointId}/${connectorId}`);
      return;
    }

    const connectorNum = Number(connectorId);
    if (!Number.isFinite(connectorNum)) {
      console.log(`⚠️ หมายเลขหัวชาร์จ "${connectorId}" ไม่ถูกต้องขณะส่งสถานะเริ่มต้นสำหรับ ${chargePointId}`);
      return;
    }

    let connector = chargePoint.connectors.find(c => c.connectorId === connectorNum);
    if (!connector) {
      console.log(`ℹ️ ไม่พบข้อมูลหัวชาร์จสำหรับ ${chargePointId}/${connectorId} ระหว่างส่งสถานะเริ่มต้น`);
      if (chargePoint.connectorCount && connectorNum >= 1 && connectorNum <= chargePoint.connectorCount) {
        connector = {
          connectorId: connectorNum,
          status: 'Unknown'
        };
      } else {
        return;
      }
    }

    if (ws.readyState === WebSocket.OPEN) {
      const statusMessage: StatusUpdate = {
        type: 'connectorStatus',
        timestamp: new Date().toISOString(),
        data: {
          chargePointId,
          connectorId: connector.connectorId,
          status: connector.status || 'Unknown',
          errorCode: (connector as any).errorCode,
          isOnline: chargePoint.ws.readyState === WebSocket.OPEN,
          message: 'โหลดสถานะหัวชาร์จล่าสุดสำเร็จ'
        }
      };

      try {
        ws.send(JSON.stringify(statusMessage));
        console.log(`📤 ส่งสถานะหัวชาร์จเริ่มต้นไปยัง ${chargePointId}/${connectorId}: ${statusMessage.data.status}`);
      } catch (error) {
        console.error(`❌ ส่งสถานะหัวชาร์จเริ่มต้นไปยัง ${chargePointId}/${connectorId} ไม่สำเร็จ:`, error);
      }

      const chargePointStatus: StatusUpdate = {
        type: 'status',
        timestamp: new Date().toISOString(),
        data: {
          chargePointId,
          connectorId: connector.connectorId,
          status: connector.status || 'Unknown',
          updateType: 'initialStatus',
          isOnline: chargePoint.ws.readyState === WebSocket.OPEN,
          message: 'โหลดสแนปชอตสถานะเครื่องชาร์จล่าสุดสำเร็จ'
        }
      };

      try {
        ws.send(JSON.stringify(chargePointStatus));
      } catch (error) {
        console.error(`❌ ส่งสถานะเริ่มต้นของเครื่องชาร์จไปยัง ${chargePointId}/${connectorId} ไม่สำเร็จ:`, error);
      }
    }

    if (connector.metrics && ws.readyState === WebSocket.OPEN) {
      const metrics = connector.metrics;
      const chargingUpdate: StatusUpdate = {
        type: 'charging_data',
        timestamp: new Date().toISOString(),
        data: {
          chargePointId,
          connectorId: connector.connectorId,
          chargingPercentage: metrics.stateOfChargePercent ?? null,
          currentPower: metrics.powerKw ?? null,
          currentMeter: metrics.energyDeliveredKWh ?? null,
          energyDelivered: metrics.energyDeliveredKWh ?? null,
          voltage: metrics.voltage ?? null,
          current: metrics.currentAmp ?? null,
          lastMeterTimestamp: metrics.lastMeterTimestamp instanceof Date
            ? metrics.lastMeterTimestamp.toISOString()
            : metrics.lastMeterTimestamp ?? null,
          transactionId: metrics.activeTransactionId ?? null,
          metrics
        }
      };

      try {
        ws.send(JSON.stringify(chargingUpdate));
        console.log(`📤 ส่งข้อมูลการชาร์จเริ่มต้นไปยัง ${chargePointId}/${connectorId}`);
      } catch (error) {
        console.error(`❌ ส่งข้อมูลการชาร์จเริ่มต้นไปยัง ${chargePointId}/${connectorId} ไม่สำเร็จ:`, error);
      }
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
            console.error(`❌ ส่งข้อมูลอัปเดตไปยัง ${connectionKey} ไม่สำเร็จ:`, error);
          }
        }
      });
      console.log(`📤 ส่งข้อมูลไปยัง ${connectionKey} ทั้งหมด ${sentCount} ข้อความ`);
      if (sentCount > 0) {
        console.log(`📤 ส่งข้อมูลประเภท ${update.type} ไปยังผู้ใช้ ${sentCount} การเชื่อมต่อสำหรับ ${chargePointId}/${connectorId}`);
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
            console.error('❌ ส่งข้อมูล broadcast ไปยังผู้ใช้ไม่สำเร็จ:', error);
          }
        }
      });
    }

    if (sentCount > 0) {
      console.log(`📤 ส่งข้อมูล broadcast ประเภท ${update.type} ไปยังผู้ใช้ทั้งหมด ${sentCount} การเชื่อมต่อ`);
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
          console.error(`❌ ส่ง heartbeat ไปยัง ${connectionKey} ไม่สำเร็จ:`, error);
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
