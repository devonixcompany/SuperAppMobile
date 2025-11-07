/**
 * WebSocket Client Utility for Frontend Applications
 * Provides easy-to-use interface for connecting to the Charging WebSocket API
 */

export interface ChargingWebSocketClientOptions {
  url: string;
  token?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: any) => void;
  onChargingStatusUpdate?: (data: any) => void;
  onMeterValuesUpdate?: (data: any) => void;
}

export interface StartChargingParams {
  chargePointId: string;
  connectorId: number;
  idTag: string;
}

export interface StopChargingParams {
  chargePointId: string;
  transactionId: number;
  reason?: 'EmergencyStop' | 'UserStop' | 'DeAuthorized' | 'RemoteStop';
}

export interface WebSocketResponse {
  id: string;
  type: string;
  timestamp: string;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class ChargingWebSocketClient {
  private ws: WebSocket | null = null;
  private options: Required<Omit<ChargingWebSocketClientOptions, 'onConnect' | 'onDisconnect' | 'onError' | 'onMessage' | 'onChargingStatusUpdate' | 'onMeterValuesUpdate'>> & {
    onConnect?: () => void;
    onDisconnect?: (code: number, reason: string) => void;
    onError?: (error: Error) => void;
    onMessage?: (message: any) => void;
    onChargingStatusUpdate?: (data: any) => void;
    onMeterValuesUpdate?: (data: any) => void;
  };
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private isConnecting = false;
  private messageId = 1;
  private pendingCalls: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();

  constructor(options: ChargingWebSocketClientOptions) {
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 5000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      url: options.url,
      token: options.token,
      onConnect: options.onConnect,
      onDisconnect: options.onDisconnect,
      onError: options.onError,
      onMessage: options.onMessage,
      onChargingStatusUpdate: options.onChargingStatusUpdate,
      onMeterValuesUpdate: options.onMeterValuesUpdate
    };
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Client has been destroyed');
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to Charging WebSocket API: ${this.options.url}`);

        this.ws = new WebSocket(this.options.url);

        const connectionTimeout = setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          console.log('✅ Connected to Charging WebSocket API');

          // Authenticate if token is provided
          if (this.options.token) {
            this.authenticate();
          } else {
            this.startHeartbeat();
            this.options.onConnect?.();
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          console.log(`🔌 Disconnected from Charging WebSocket API: ${event.code} - ${event.reason}`);

          this.cleanup();
          this.options.onDisconnect?.(event.code, event.reason);

          if (this.options.autoReconnect && !this.isDestroyed) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ WebSocket error:', error);

          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('Connection failed'));
          } else {
            this.options.onError?.(new Error('WebSocket connection error'));
          }
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this.isDestroyed = true;
    this.cancelReconnect();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }

  /**
   * Authenticate with JWT token
   */
  public authenticate(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const authToken = token || this.options.token;
      if (!authToken) {
        reject(new Error('No authentication token provided'));
        return;
      }

      this.sendMessage('auth_request', { token: authToken })
        .then(() => {
          this.startHeartbeat();
          this.options.onConnect?.();
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Start charging session
   */
  public async startCharging(params: StartChargingParams): Promise<WebSocketResponse> {
    return this.sendMessage('start_charging_request', params);
  }

  /**
   * Stop charging session
   */
  public async stopCharging(params: StopChargingParams): Promise<WebSocketResponse> {
    return this.sendMessage('stop_charging_request', params);
  }

  /**
   * Send heartbeat
   */
  public sendHeartbeat(): Promise<WebSocketResponse> {
    return this.sendMessage('heartbeat', {});
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Update authentication token
   */
  public updateToken(token: string): void {
    this.options.token = token;
    if (this.isConnected()) {
      this.authenticate(token);
    }
  }

  /**
   * Get connection state
   */
  public getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Send message and wait for response
   */
  private async sendMessage(type: string, data?: any): Promise<WebSocketResponse> {
    if (!this.isConnected()) {
      throw new Error('Not connected to server');
    }

    const messageId = this.getNextMessageId();
    const message = {
      id: messageId,
      type,
      timestamp: new Date().toISOString(),
      data
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(messageId);
        reject(new Error(`Timeout waiting for response to ${type}`));
      }, 30000);

      this.pendingCalls.set(messageId, { resolve, reject, timeout });

      try {
        this.ws!.send(JSON.stringify(message));
        console.log(`📤 Sent message:`, { type, id: messageId });
      } catch (error) {
        clearTimeout(timeout);
        this.pendingCalls.delete(messageId);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketResponse = JSON.parse(data);
      console.log(`📥 Received message:`, message.type);

      // Handle response to pending call
      if (this.pendingCalls.has(message.id)) {
        const pending = this.pendingCalls.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingCalls.delete(message.id);

          if (message.error) {
            pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
          } else {
            pending.resolve(message);
          }
        }
        return;
      }

      // Handle different message types
      switch (message.type) {
        case 'auth_response':
          if (message.data?.success) {
            console.log('✅ Authentication successful');
          } else {
            console.error('❌ Authentication failed:', message.data?.message);
          }
          break;

        case 'charging_status_update':
          this.options.onChargingStatusUpdate?.(message.data);
          break;

        case 'meter_values_update':
          this.options.onMeterValuesUpdate?.(message.data);
          break;

        case 'error':
          this.options.onError?.(new Error(message.error?.message || 'Unknown error'));
          break;

        default:
          this.options.onMessage?.(message);
          break;
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.sendHeartbeat().catch(error => {
          console.error('❌ Heartbeat failed:', error);
        });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    console.log(`🔄 Scheduling reconnection in ${this.options.reconnectInterval}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      if (!this.isDestroyed) {
        try {
          await this.connect();
        } catch (error) {
          console.error('❌ Reconnection failed:', error);
          if (this.options.autoReconnect) {
            this.scheduleReconnect();
          }
        }
      }
    }, this.options.reconnectInterval);
  }

  /**
   * Cancel scheduled reconnection
   */
  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopHeartbeat();
    this.cancelReconnect();

    // Reject all pending calls
    for (const [messageId, pending] of this.pendingCalls) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingCalls.clear();
  }

  /**
   * Get next message ID
   */
  private getNextMessageId(): string {
    return (this.messageId++).toString();
  }
}

// Utility function to create a client instance
export function createChargingWebSocketClient(options: ChargingWebSocketClientOptions): ChargingWebSocketClient {
  return new ChargingWebSocketClient(options);
}

// Export WebSocket states for convenience
export const WebSocketStates = {
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED
};
