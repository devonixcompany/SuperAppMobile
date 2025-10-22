import { Logger } from '../../../../shared/utils/logger.js';
import { OCPPProtocolManager } from '../protocol/protocol-manager.js';
import type {
  ChargePointConnection,
  ChargePointStatus,
  OCPPVersion,
  OCPPMessage
} from '../../../../shared/types/ocpp.js';

const logger = new Logger('ConnectionManager');

export class ConnectionManager {
  private connections: Map<string, ChargePointConnection> = new Map();
  private protocolManagers: Map<OCPPVersion, OCPPProtocolManager> = new Map();

  constructor() {
    // Initialize protocol managers for each OCPP version
    this.protocolManagers.set(OCPPVersion.OCPP_16, new OCPPProtocolManager(OCPPVersion.OCPP_16));
    this.protocolManagers.set(OCPPVersion.OCPP_201, new OCPPProtocolManager(OCPPVersion.OCPP_201));
    this.protocolManagers.set(OCPPVersion.OCPP_21, new OCPPProtocolManager(OCPPVersion.OCPP_21));
  }

  async addConnection(
    chargePointId: string,
    socket: WebSocket,
    ocppVersion: OCPPVersion
  ): Promise<ChargePointConnection> {
    const connectionId = this.generateConnectionId();
    const now = new Date();

    const connection: ChargePointConnection = {
      id: connectionId,
      chargePointId,
      socket,
      ocppVersion,
      connectedAt: now,
      lastHeartbeat: now,
      status: ChargePointStatus.CONNECTED
    };

    this.connections.set(connectionId, connection);

    // Setup WebSocket handlers
    this.setupWebSocketHandlers(connection);

    logger.info(`Charge Point connected: ${chargePointId}`, {
      connectionId,
      ocppVersion,
      connectedAt: now
    });

    return connection;
  }

  private setupWebSocketHandlers(connection: ChargePointConnection) {
    const { socket, chargePointId, connectionId } = connection;

    socket.onopen = () => {
      logger.info(`WebSocket connection opened for ${chargePointId}`);
    };

    socket.onmessage = async (event) => {
      try {
        const data = event.data as string;
        logger.debug(`Message received from ${chargePointId}`, { data });

        await this.handleMessage(connection, data);
      } catch (error) {
        logger.error(`Error handling message from ${chargePointId}:`, error);
      }
    };

    socket.onclose = (event) => {
      logger.warn(`WebSocket connection closed for ${chargePointId}`, {
        code: event.code,
        reason: event.reason
      });

      this.removeConnection(connectionId);
    };

    socket.onerror = (error) => {
      logger.error(`WebSocket error for ${chargePointId}:`, error);
    };
  }

  private async handleMessage(connection: ChargePointConnection, data: string) {
    try {
      const protocolManager = this.protocolManagers.get(connection.ocppVersion);
      if (!protocolManager) {
        logger.error(`No protocol manager for version: ${connection.ocppVersion}`);
        return;
      }

      const message = protocolManager.parseMessage(data);
      if (!message) {
        logger.error(`Failed to parse message from ${connection.chargePointId}`);
        return;
      }

      // Update last heartbeat
      connection.lastHeartbeat = new Date();

      // Process the message
      const response = await protocolManager.handleMessage(message);
      if (response) {
        this.sendMessage(connection, response);
      }

    } catch (error) {
      logger.error(`Error handling message from ${connection.chargePointId}:`, error);
    }
  }

  sendMessage(connection: ChargePointConnection, message: OCPPMessage): boolean {
    try {
      const protocolManager = this.protocolManagers.get(connection.ocppVersion);
      if (!protocolManager) {
        logger.error(`No protocol manager for version: ${connection.ocppVersion}`);
        return false;
      }

      const serialized = protocolManager.serializeMessage(message);
      connection.socket.send(serialized);

      logger.debug(`Message sent to ${connection.chargePointId}`, { message: serialized });
      return true;
    } catch (error) {
      logger.error(`Error sending message to ${connection.chargePointId}:`, error);
      return false;
    }
  }

  broadcastMessage(chargePointId: string, message: OCPPMessage): number {
    let sentCount = 0;

    for (const connection of this.connections.values()) {
      if (connection.chargePointId === chargePointId) {
        if (this.sendMessage(connection, message)) {
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    // Close WebSocket if still open
    if (connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close();
    }

    this.connections.delete(connectionId);

    logger.info(`Connection removed: ${connection.chargePointId}`, { connectionId });
    return true;
  }

  removeConnectionsByChargePointId(chargePointId: string): number {
    let removedCount = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.chargePointId === chargePointId) {
        this.removeConnection(connectionId);
        removedCount++;
      }
    }

    return removedCount;
  }

  getConnection(connectionId: string): ChargePointConnection | null {
    return this.connections.get(connectionId) || null;
  }

  getConnectionsByChargePointId(chargePointId: string): ChargePointConnection[] {
    return Array.from(this.connections.values()).filter(
      connection => connection.chargePointId === chargePointId
    );
  }

  getAllConnections(): ChargePointConnection[] {
    return Array.from(this.connections.values());
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getActiveChargePointsCount(): number {
    const chargePoints = new Set<string>();
    for (const connection of this.connections.values()) {
      chargePoints.add(connection.chargePointId);
    }
    return chargePoints.size;
  }

  updateConnectionStatus(connectionId: string, status: ChargePointStatus): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.status = status;
    logger.debug(`Connection status updated: ${connection.chargePointId} -> ${status}`);
    return true;
  }

  checkStaleConnections(maxAgeMinutes: number = 5): ChargePointConnection[] {
    const now = new Date();
    const staleConnections: ChargePointConnection[] = [];

    for (const connection of this.connections.values()) {
      const ageMinutes = (now.getTime() - connection.lastHeartbeat.getTime()) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) {
        staleConnections.push(connection);
      }
    }

    return staleConnections;
  }

  cleanupStaleConnections(maxAgeMinutes: number = 5): number {
    const staleConnections = this.checkStaleConnections(maxAgeMinutes);
    let cleanedCount = 0;

    for (const connection of staleConnections) {
      logger.warn(`Removing stale connection: ${connection.chargePointId}`, {
        lastHeartbeat: connection.lastHeartbeat,
        ageMinutes: (new Date().getTime() - connection.lastHeartbeat.getTime()) / (1000 * 60)
      });

      if (this.removeConnection(connection.id)) {
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getProtocolManager(ocppVersion: OCPPVersion): OCPPProtocolManager | null {
    return this.protocolManagers.get(ocppVersion) || null;
  }

  // Statistics
  getStatistics() {
    const connections = this.getAllConnections();
    const now = new Date();

    return {
      totalConnections: connections.length,
      activeChargePoints: this.getActiveChargePointsCount(),
      connectionsByStatus: connections.reduce((acc, conn) => {
        acc[conn.status] = (acc[conn.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      connectionsByVersion: connections.reduce((acc, conn) => {
        acc[conn.ocppVersion] = (acc[conn.ocppVersion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageConnectionAge: connections.length > 0
        ? connections.reduce((sum, conn) => sum + (now.getTime() - conn.connectedAt.getTime()), 0) / connections.length
        : 0
    };
  }
}