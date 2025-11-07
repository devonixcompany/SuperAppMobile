import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { OCPPMessage, OCPPCall, OCPPCallResult, OCPPCallError, ChargePointInfo } from '@/types';
import { config } from './config';

export interface GatewayMessage {
  chargePointId: string;
  message: OCPPMessage;
  timestamp: string;
}

export interface GatewayClientOptions {
  chargePointId: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private chargePointId: string;
  private options: Required<GatewayClientOptions>;
  private isConnecting = false;
  private isDestroyed = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pendingCalls: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();
  private messageId = 1;

  constructor(chargePointId: string, options: Partial<GatewayClientOptions> = {}) {
    super();

    this.chargePointId = chargePointId;
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 5000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      ...options
    };
  }

  /**
   * Connect to OCPP Gateway
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
    const gatewayUrl = `${config.getGatewayUrl()}/ocpp/16/${this.chargePointId}`;

    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to OCPP Gateway for ${this.chargePointId}: ${gatewayUrl}`);

        this.ws = new WebSocket(gatewayUrl, ['ocpp1.6']);

        const connectionTimeout = setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.cleanup();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          console.log(`✅ Connected to OCPP Gateway for ${this.chargePointId}`);

          this.startHeartbeat();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message: OCPPMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error(`❌ Failed to parse message from gateway:`, error);
            this.emit('error', new Error('Failed to parse gateway message'));
          }
        });

        this.ws.on('close', (code: number, reason: string) => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          console.log(`🔌 Disconnected from OCPP Gateway for ${this.chargePointId}: ${code} - ${reason}`);

          this.cleanup();
          this.emit('disconnected', { code, reason });

          if (this.options.autoReconnect && !this.isDestroyed) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error: Error) => {
          clearTimeout(connectionTimeout);
          console.error(`❌ WebSocket error for ${this.chargePointId}:`, error);
          this.emit('error', error);

          if (this.isConnecting) {
            this.isConnecting = false;
            reject(error);
          }
        });

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from gateway
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
   * Send OCPP call message
   */
  public async sendCall(action: string, payload: any = {}): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to gateway');
    }

    const messageId = this.getNextMessageId();
    const message: OCPPCall = [2, messageId.toString(), action, payload];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(messageId);
        reject(new Error(`Timeout waiting for response to ${action}`));
      }, 30000);

      this.pendingCalls.set(messageId, { resolve, reject, timeout });

      try {
        this.ws!.send(JSON.stringify(message));
        console.log(`📤 Sent to gateway ${this.chargePointId}:`, { action, messageId });
      } catch (error) {
        clearTimeout(timeout);
        this.pendingCalls.delete(messageId);
        reject(error);
      }
    });
  }

  /**
   * Send RemoteStartTransaction request
   */
  public async remoteStartTransaction(connectorId: number, idTag: string): Promise<any> {
    return this.sendCall('RemoteStartTransaction', {
      connectorId,
      idTag
    });
  }

  /**
   * Send RemoteStopTransaction request
   */
  public async remoteStopTransaction(transactionId: number): Promise<any> {
    return this.sendCall('RemoteStopTransaction', {
      transactionId
    });
  }

  /**
   * Send TriggerMessage request to get status
   */
  public async triggerStatusNotification(connectorId?: number): Promise<any> {
    return this.sendCall('TriggerMessage', {
      requestedMessage: 'StatusNotification',
      connectorId
    });
  }

  /**
   * Send TriggerMessage request to get meter values
   */
  public async triggerMeterValues(connectorId: number, transactionId?: number): Promise<any> {
    return this.sendCall('TriggerMessage', {
      requestedMessage: 'MeterValues',
      connectorId,
      ...(transactionId && { transactionId })
    });
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get charge point ID
   */
  public getChargePointId(): string {
    return this.chargePointId;
  }

  /**
   * Handle incoming message from gateway
   */
  private handleMessage(message: OCPPMessage): void {
    console.log(`📥 Received from gateway ${this.chargePointId}:`, message);

    if (Array.isArray(message) && message.length >= 3) {
      const messageType = message[0];
      const messageId = message[1] as string;

      switch (messageType) {
        case 2: // CALL
          this.handleCall(message as OCPPCall);
          break;
        case 3: // CALL RESULT
          this.handleCallResult(messageId, message as OCPPCallResult);
          break;
        case 4: // CALL ERROR
          this.handleCallError(messageId, message as OCPPCallError);
          break;
        default:
          console.warn(`⚠️ Unknown message type: ${messageType}`);
      }
    } else {
      console.warn(`⚠️ Invalid message format:`, message);
    }
  }

  /**
   * Handle CALL message (incoming request from gateway)
   */
  private handleCall(message: OCPPCall): void {
    const [, messageId, action, payload] = message;
    this.emit('call', { messageId, action, payload });
  }

  /**
   * Handle CALL RESULT message
   */
  private handleCallResult(messageId: string, message: OCPPCallResult): void {
    const pending = this.pendingCalls.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCalls.delete(messageId);
      pending.resolve(message[2]);
    }
  }

  /**
   * Handle CALL ERROR message
   */
  private handleCallError(messageId: string, message: OCPPCallError): void {
    const pending = this.pendingCalls.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCalls.delete(messageId);
      const [, , errorCode, errorDescription, errorDetails] = message;
      pending.reject(new Error(`OCPP Error: ${errorCode} - ${errorDescription}`));
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.sendCall('Heartbeat', {});
      } catch (error) {
        console.error(`❌ Heartbeat failed for ${this.chargePointId}:`, error);
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

    console.log(`🔄 Scheduling reconnection for ${this.chargePointId} in ${this.options.reconnectInterval}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      if (!this.isDestroyed) {
        try {
          await this.connect();
        } catch (error) {
          console.error(`❌ Reconnection failed for ${this.chargePointId}:`, error);
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

    this.ws = null;
  }

  /**
   * Get next message ID
   */
  private getNextMessageId(): string {
    return (this.messageId++).toString();
  }
}
