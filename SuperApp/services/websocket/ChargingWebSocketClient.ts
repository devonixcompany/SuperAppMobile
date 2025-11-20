/**
 * WebSocket Client for Real-time Charging Updates
 */

import { AuthManager } from '../auth/AuthManager';

export interface MeterValues {
  transactionId?: string;
  chargePointId?: string;
  connectorId?: number;
  energyDelivered: number;
  currentSoC?: number;
  powerDelivered: number;
  currentMeterValue?: number;
  timestamp: string;
}

export interface TransactionUpdate {
  type: 'start' | 'update' | 'stop';
  data: {
    transactionId?: string;
    chargePointId?: string;
    connectorId?: number;
    startTime?: string;
    status?: string;
    energyDelivered?: number;
    currentSoC?: number;
    powerDelivered?: number;
    currentCost?: number;
    chargingDurationMinutes?: number;
    [key: string]: any;
  };
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error' | 'failed';
  message: string;
}

export class ChargingWebSocketClient {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 3000;
  private userId?: string;
  private reconnectTimer?: NodeJS.Timeout;

  // Event listeners
  public onTransactionUpdate?: (update: TransactionUpdate) => void;
  public onMeterValues?: (values: MeterValues) => void;
  public onConnectionStatus?: (status: ConnectionStatus) => void;

  /**
   * เชื่อมต่อ WebSocket
   */
  async connect(userId: string): Promise<void> {
    try {
      this.userId = userId;
      
      // ดึง access token สำหรับ authentication
      const authManager = AuthManager.getInstance();
      const token = await authManager.getValidAccessToken();
      
      if (!token) {
        console.error('❌ [WEBSOCKET] No valid access token available');
        if (this.onConnectionStatus) {
          this.onConnectionStatus({ 
            status: 'error', 
            message: 'Authentication required - please login again' 
          });
        }
        
        // แจ้งให้ user login ใหม่
        throw new Error('Authentication required - please login again');
      }

      // สร้าง URL ใหม่ตามรูปแบบที่ต้องการ: /mobile-ws/{userId}?token=...
      const wsUrl = `ws://172.20.10.2:3001/mobile-ws/${userId}?token=${token}`;
      
      console.log('🔌 [WEBSOCKET] Connecting to:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('❌ [WEBSOCKET] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket เชื่อมต่อสำเร็จ
   */
  private handleOpen(event: Event): void {
    console.log('✅ [WEBSOCKET] Connected successfully');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Clear any pending reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    // แจ้ง UI ว่าเชื่อมต่อแล้ว
    if (this.onConnectionStatus) {
      this.onConnectionStatus({ 
        status: 'connected', 
        message: 'Real-time updates active' 
      });
    }
    
    // ส่ง authentication message
    this.sendAuth();
  }

  /**
   * รับข้อความจาก WebSocket
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 [WEBSOCKET] Message received:', data);
      
      switch (data.type) {
        case 'transaction_start':
          console.log('🔄 [WEBSOCKET] Handling transaction_start');
          this.handleTransactionStart(data.payload);
          break;
          
        case 'transaction_update':
          console.log('🔄 [WEBSOCKET] Handling transaction_update');
          this.handleTransactionUpdate(data.payload);
          break;
          
        case 'meter_values':
          console.log('🔄 [WEBSOCKET] Handling meter_values');
          this.handleMeterValues(data.payload);
          break;
          
        case 'charging_status':
          console.log('🔄 [WEBSOCKET] Handling charging_status');
          this.handleChargingStatus(data);
          break;
          
        case 'transaction_stop':
          console.log('🔄 [WEBSOCKET] Handling transaction_stop');
          this.handleTransactionStop(data.payload);
          break;
          
        case 'ping':
          console.log('🔄 [WEBSOCKET] Received ping, ignoring');
          break;
          
        case 'auth_success':
          console.log('✅ [WEBSOCKET] Authentication successful');
          break;
          
        case 'error':
          console.error('❌ [WEBSOCKET] Server error:', data.message);
          break;
          
        default:
          console.log('🔄 [WEBSOCKET] Unknown message type:', data.type, 'Full message:', data);
      }
      
    } catch (error) {
      console.error('❌ [WEBSOCKET] Error parsing message:', error);
    }
  }

  /**
   * Transaction เริ่มต้น
   */
  private handleTransactionStart(payload: any): void {
    console.log('🚀 [WEBSOCKET] Transaction started:', payload);
    
    if (this.onTransactionUpdate) {
      this.onTransactionUpdate({
        type: 'start',
        data: {
          transactionId: payload.transactionId,
          chargePointId: payload.chargePointId,
          connectorId: payload.connectorId,
          startTime: payload.startTime,
          status: 'ACTIVE'
        }
      });
    }
  }

  /**
   * Transaction อัปเดต
   */
  private handleTransactionUpdate(payload: any): void {
    console.log('🔄 [WEBSOCKET] Transaction updated:', payload);
    
    if (this.onTransactionUpdate) {
      this.onTransactionUpdate({
        type: 'update',
        data: payload
      });
    }
  }

  /**
   * Meter Values Real-time
   */
  private handleMeterValues(payload: any): void {
    console.log('⚡ [WEBSOCKET] Meter values updated:', payload);
    
    if (this.onMeterValues) {
      this.onMeterValues({
        transactionId: payload.transactionId,
        chargePointId: payload.chargePointId,
        connectorId: payload.connectorId,
        energyDelivered: payload.energyDelivered || 0,
        currentSoC: payload.currentSoC || null,
        powerDelivered: payload.powerDelivered || 0,
        currentMeterValue: payload.currentMeterValue || 0,
        timestamp: payload.timestamp || new Date().toISOString()
      });
    }
  }

  /**
   * Charging Status Real-time
   */
  private handleChargingStatus(message: any): void {
    console.log('🔋 [WEBSOCKET] Charging status updated:', message);
    
    const payload = message.data;
    const transactionId = message.transactionId;
    
    // อัปเดต Transaction Data
    if (this.onTransactionUpdate) {
      this.onTransactionUpdate({
        type: 'update',
        data: {
          transactionId: transactionId,
          status: payload.status,
          energyDelivered: payload.currentEnergy,
          duration: payload.duration,
          timestamp: payload.timestamp
        }
      });
    }
    
    // อัปเดต Meter Values
    if (this.onMeterValues) {
      this.onMeterValues({
        transactionId: transactionId,
        energyDelivered: payload.currentEnergy || 0,
        currentMeterValue: payload.meterValue || 0,
        powerDelivered: 0, // ไม่มีข้อมูล power ใน message นี้
        currentSoC: undefined, // ไม่มีข้อมูล SoC ใน message นี้
        timestamp: payload.timestamp || new Date().toISOString()
      });
    }
  }

  /**
   * Transaction หยุด
   */
  private handleTransactionStop(payload: any): void {
    console.log('🛑 [WEBSOCKET] Transaction stopped:', payload);
    
    if (this.onTransactionUpdate) {
      this.onTransactionUpdate({
        type: 'stop',
        data: payload
      });
    }
  }

  /**
   * ส่ง Authentication
   */
  private sendAuth(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.userId) {
      this.ws.send(JSON.stringify({
        type: 'auth',
        payload: {
          userId: this.userId,
          clientType: 'mobile_app'
        }
      }));
    }
  }

  /**
   * WebSocket ปิดการเชื่อมต่อ
   */
  private handleClose(event: CloseEvent): void {
    console.log('🔌 [WEBSOCKET] Connection closed:', event.code, event.reason);
    this.isConnected = false;
    
    if (this.onConnectionStatus) {
      this.onConnectionStatus({ 
        status: 'disconnected', 
        message: 'Connection lost. Attempting to reconnect...' 
      });
    }
    
    // Auto reconnect ถ้าไม่ใช่การปิดแบบ manual
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket Error
   */
  private handleError(error: Event): void {
    console.error('❌ [WEBSOCKET] Error:', error);
    
    if (this.onConnectionStatus) {
      this.onConnectionStatus({ 
        status: 'error', 
        message: 'Connection error. Retrying...' 
      });
    }
  }

  /**
   * Auto Reconnect
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.userId) {
      this.reconnectAttempts++;
      console.log(`🔄 [WEBSOCKET] Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect(this.userId!);
      }, this.reconnectDelay);
    } else {
      console.error('❌ [WEBSOCKET] Max reconnect attempts reached');
      if (this.onConnectionStatus) {
        this.onConnectionStatus({ 
          status: 'failed', 
          message: 'Unable to establish connection' 
        });
      }
    }
  }

  /**
   * ปิดการเชื่อมต่อ
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isConnected = false;
    }
  }

  /**
   * ส่งข้อความไป WebSocket
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ [WEBSOCKET] Not connected. Message not sent:', message);
    }
  }

  /**
   * เช็คสถานะการเชื่อมต่อ
   */
  get connected(): boolean {
    return this.isConnected;
  }
}