import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { ConnectedClient, WebSocketMessage, MessageType, AuthResult } from '@/types';
import { authService } from './auth';
import { GatewayClient } from './gatewayClient';
import { config } from './config';

export interface ConnectionManagerOptions {
  maxConnections?: number;
  connectionTimeout?: number;
  heartbeatInterval?: number;
}

export class ConnectionManager extends EventEmitter {
  private static instance: ConnectionManager;
  private clients: Map<string, ConnectedClient> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set of clientIds
  private gatewayClients: Map<string, GatewayClient> = new Map(); // chargePointId -> GatewayClient
  private options: Required<ConnectionManagerOptions>;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private wss: WebSocket.Server | null = null;

  private constructor(options: Partial<ConnectionManagerOptions> = {}) {
    super();

    this.options = {
      maxConnections: options.maxConnections ?? 1000,
      connectionTimeout: options.connectionTimeout ?? 300000, // 5 minutes
      heartbeatInterval: options.heartbeatInterval ?? config.getHeartbeatInterval(),
      ...options
    };

    console.log('🔧 Connection Manager initialized with options:', this.options);
  }

  public static getInstance(options?: Partial<ConnectionManagerOptions>): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager(options);
    }
    return ConnectionManager.instance;
  }

  /**
   * Initialize WebSocket server
   */
  public initialize(wss: WebSocket.Server): void {
    this.wss = wss;
    this.startHeartbeat();

    wss.on('connection', (ws: WebSocket, request) => {
      this.handleNewConnection(ws, request);
    });

    console.log('🌐 WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleNewConnection(ws: WebSocket, request: any): Promise<void> {
    const clientId = uuidv4();
    const clientIp = request.socket.remoteAddress || 'unknown';

    console.log(`🔗 New connection from ${clientIp}, assigned client ID: ${clientId}`);

    // Check connection limits
    if (this.clients.size >= this.options.maxConnections) {
      console.warn(`⚠️ Connection limit reached (${this.options.maxConnections}), rejecting new connection`);
      ws.close(1013, 'Server overloaded');
      return;
    }

    // Store temporary client info (not authenticated yet)
    const tempClient: ConnectedClient = {
      id: clientId,
      userId: '',
      sessionId: '',
      socket: ws,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      authorizedChargePoints: []
    };

    this.clients.set(clientId, tempClient);

    // Setup WebSocket event handlers
    ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', (code: number, reason: string) => {
      this.handleDisconnection(clientId, code, reason);
    });

    ws.on('error', (error: Error) => {
      console.error(`❌ WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId, 1006, 'Connection error');
    });

    // Send connection timeout message
    setTimeout(() => {
      const client = this.clients.get(clientId);
      if (client && !client.userId) {
        console.log(`⏰ Connection timeout for unauthenticated client ${clientId}`);
        ws.close(1008, 'Authentication timeout');
      }
    }, this.options.connectionTimeout);
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(clientId: string, data: WebSocket.Data): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`⚠️ Received message from unknown client: ${clientId}`);
      return;
    }

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      client.lastActivity = new Date().toISOString();

      console.log(`📨 Received message from client ${clientId}:`, message.type);

      switch (message.type) {
        case MessageType.AUTH_REQUEST:
          await this.handleAuthRequest(clientId, message);
          break;
        case MessageType.START_CHARGING_REQUEST:
          await this.handleStartChargingRequest(clientId, message);
          break;
        case MessageType.STOP_CHARGING_REQUEST:
          await this.handleStopChargingRequest(clientId, message);
          break;
        case MessageType.HEARTBEAT:
          this.sendToClient(clientId, {
            id: uuidv4(),
            type: MessageType.HEARTBEAT,
            timestamp: new Date().toISOString()
          });
          break;
        default:
          console.warn(`⚠️ Unknown message type: ${message.type} from client ${clientId}`);
          this.sendError(clientId, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process message from client ${clientId}:`, error);
      this.sendError(clientId, 'INVALID_MESSAGE_FORMAT', 'Invalid message format');
    }
  }

  /**
   * Handle authentication request
   */
  private async handleAuthRequest(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const authData = message.data;
      if (!authData || !authData.token) {
        this.sendAuthResponse(clientId, false, 'Missing token');
        return;
      }

      const authResult: AuthResult = authService.verifyToken(authData.token);

      if (!authResult.success) {
        this.sendAuthResponse(clientId, false, authResult.error || 'Authentication failed');
        return;
      }

      // Update client with authentication info
      client.userId = authResult.userId!;
      client.sessionId = authResult.sessionId || '';

      // Add to user connections map
      if (!this.userConnections.has(client.userId)) {
        this.userConnections.set(client.userId, new Set());
      }
      this.userConnections.get(client.userId)!.add(clientId);

      console.log(`✅ Client ${clientId} authenticated as user ${client.userId}`);

      this.sendAuthResponse(clientId, true, 'Authentication successful');
      this.emit('userConnected', { clientId, userId: client.userId });

    } catch (error) {
      console.error(`❌ Authentication failed for client ${clientId}:`, error);
      this.sendAuthResponse(clientId, false, 'Authentication error');
    }
  }

  /**
   * Handle start charging request
   */
  private async handleStartChargingRequest(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Check if client is authenticated
    if (!client.userId) {
      this.sendError(clientId, 'NOT_AUTHENTICATED', 'Client not authenticated');
      return;
    }

    try {
      const requestData = message.data;
      const { chargePointId, connectorId, idTag } = requestData;

      if (!chargePointId || connectorId === undefined || !idTag) {
        this.sendError(clientId, 'INVALID_REQUEST', 'Missing required parameters');
        return;
      }

      console.log(`🚗 User ${client.userId} requesting to start charging on ${chargePointId}:${connectorId}`);

      // Get or create gateway client
      let gatewayClient = this.gatewayClients.get(chargePointId);
      if (!gatewayClient) {
        gatewayClient = new GatewayClient(chargePointId);

        gatewayClient.on('connected', () => {
          console.log(`🔌 Gateway client connected for ${chargePointId}`);
        });

        gatewayClient.on('disconnected', () => {
          console.log(`🔌 Gateway client disconnected for ${chargePointId}`);
        });

        gatewayClient.on('error', (error: Error) => {
          console.error(`❌ Gateway client error for ${chargePointId}:`, error);
        });

        this.gatewayClients.set(chargePointId, gatewayClient);
      }

      // Connect to gateway if not connected
      if (!gatewayClient.isConnected()) {
        await gatewayClient.connect();
      }

      // Send RemoteStartTransaction to OCPP gateway
      const result = await gatewayClient.remoteStartTransaction(connectorId, idTag);

      // Add to authorized charge points
      if (!client.authorizedChargePoints.includes(chargePointId)) {
        client.authorizedChargePoints.push(chargePointId);
      }

      this.sendToClient(clientId, {
        id: uuidv4(),
        type: MessageType.START_CHARGING_RESPONSE,
        timestamp: new Date().toISOString(),
        data: {
          success: result.status === 'Accepted',
          transactionId: result.transactionId,
          connectorId,
          status: result.status,
          message: result.status === 'Accepted' ? 'Charging started successfully' : 'Failed to start charging'
        }
      });

      console.log(`✅ Start charging response sent to client ${clientId}`);

    } catch (error) {
      console.error(`❌ Failed to start charging for client ${clientId}:`, error);
      this.sendError(clientId, 'START_CHARGING_FAILED', 'Failed to start charging');
    }
  }

  /**
   * Handle stop charging request
   */
  private async handleStopChargingRequest(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Check if client is authenticated
    if (!client.userId) {
      this.sendError(clientId, 'NOT_AUTHENTICATED', 'Client not authenticated');
      return;
    }

    try {
      const requestData = message.data;
      const { chargePointId, transactionId, reason } = requestData;

      if (!chargePointId || !transactionId) {
        this.sendError(clientId, 'INVALID_REQUEST', 'Missing required parameters');
        return;
      }

      // Check if client is authorized for this charge point
      if (!client.authorizedChargePoints.includes(chargePointId)) {
        this.sendError(clientId, 'NOT_AUTHORIZED', 'Not authorized for this charge point');
        return;
      }

      console.log(`🛑 User ${client.userId} requesting to stop charging on ${chargePointId}, transaction ${transactionId}`);

      // Get gateway client
      const gatewayClient = this.gatewayClients.get(chargePointId);
      if (!gatewayClient || !gatewayClient.isConnected()) {
        this.sendError(clientId, 'GATEWAY_NOT_CONNECTED', 'Not connected to charge point gateway');
        return;
      }

      // Send RemoteStopTransaction to OCPP gateway
      const result = await gatewayClient.remoteStopTransaction(transactionId);

      this.sendToClient(clientId, {
        id: uuidv4(),
        type: MessageType.STOP_CHARGING_RESPONSE,
        timestamp: new Date().toISOString(),
        data: {
          success: result.status === 'Accepted',
          transactionId,
          status: result.status,
          message: result.status === 'Accepted' ? 'Charging stopped successfully' : 'Failed to stop charging'
        }
      });

      console.log(`✅ Stop charging response sent to client ${clientId}`);

    } catch (error) {
      console.error(`❌ Failed to stop charging for client ${clientId}:`, error);
      this.sendError(clientId, 'STOP_CHARGING_FAILED', 'Failed to stop charging');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, code: number, reason: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`🔌 Client ${clientId} disconnected: ${code} - ${reason}`);

    // Remove from user connections map
    if (client.userId) {
      const userClientIds = this.userConnections.get(client.userId);
      if (userClientIds) {
        userClientIds.delete(clientId);
        if (userClientIds.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
      this.emit('userDisconnected', { clientId, userId: client.userId });
    }

    // Remove client
    this.clients.delete(clientId);
  }

  /**
   * Send message to specific client
   */
  public sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      console.warn(`⚠️ Attempted to send message to unknown client: ${clientId}`);
      return false;
    }

    if (client.socket.readyState !== WebSocket.OPEN) {
      console.warn(`⚠️ Client ${clientId} socket is not open`);
      return false;
    }

    try {
      client.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to client ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Send error message to client
   */
  private sendError(clientId: string, code: string, message: string, details?: any): void {
    this.sendToClient(clientId, {
      id: uuidv4(),
      type: MessageType.ERROR,
      timestamp: new Date().toISOString(),
      error: {
        code,
        message,
        details
      }
    });
  }

  /**
   * Send authentication response
   */
  private sendAuthResponse(clientId: string, success: boolean, message: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.sendToClient(clientId, {
      id: uuidv4(),
      type: MessageType.AUTH_RESPONSE,
      timestamp: new Date().toISOString(),
      data: {
        success,
        userId: client.userId,
        sessionId: client.sessionId,
        expiresAt: new Date(Date.now() + config.getSessionTimeout()).toISOString(),
        message
      }
    });
  }

  /**
   * Start heartbeat check for all connections
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const inactiveClients: string[] = [];

      for (const [clientId, client] of this.clients) {
        const lastActivityTime = new Date(client.lastActivity).getTime();
        const inactiveTime = now - lastActivityTime;

        // Send heartbeat to inactive clients
        if (inactiveTime > this.options.heartbeatInterval) {
          this.sendToClient(clientId, {
            id: uuidv4(),
            type: MessageType.HEARTBEAT,
            timestamp: new Date().toISOString()
          });
        }

        // Disconnect very inactive clients
        if (inactiveTime > this.options.heartbeatInterval * 3) {
          console.log(`⏰ Client ${clientId} inactive for too long, disconnecting`);
          inactiveClients.push(clientId);
        }
      }

      // Disconnect inactive clients
      inactiveClients.forEach(clientId => {
        const client = this.clients.get(clientId);
        if (client && client.socket.readyState === WebSocket.OPEN) {
          client.socket.close(1000, 'Inactive timeout');
        }
      });

    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  public stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get client information
   */
  public getClient(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients for a specific user
   */
  public getUserClients(userId: string): ConnectedClient[] {
    const clientIds = this.userConnections.get(userId);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map(clientId => this.clients.get(clientId))
      .filter(client => client !== undefined) as ConnectedClient[];
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    totalUsers: number;
    gatewayConnections: number;
  } {
    const authenticatedConnections = Array.from(this.clients.values())
      .filter(client => client.userId).length;

    return {
      totalConnections: this.clients.size,
      authenticatedConnections,
      totalUsers: this.userConnections.size,
      gatewayConnections: this.gatewayClients.size
    };
  }

  /**
   * Broadcast message to all clients of a user
   */
  public broadcastToUser(userId: string, message: WebSocketMessage): number {
    const clients = this.getUserClients(userId);
    let sentCount = 0;

    for (const client of clients) {
      if (this.sendToClient(client.id, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Cleanup all connections
   */
  public cleanup(): void {
    console.log('🧹 Cleaning up connection manager...');

    this.stopHeartbeat();

    // Disconnect all WebSocket clients
    for (const [clientId, client] of this.clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close(1001, 'Server shutdown');
      }
    }

    // Disconnect all gateway clients
    for (const [chargePointId, gatewayClient] of this.gatewayClients) {
      gatewayClient.disconnect();
    }

    this.clients.clear();
    this.userConnections.clear();
    this.gatewayClients.clear();

    console.log('✅ Connection manager cleanup completed');
  }
}

export const connectionManager = ConnectionManager.getInstance();
