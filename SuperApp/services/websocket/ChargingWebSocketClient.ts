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
  estimatedTimeToFull?: number; // ⏰ เวลาคาดการณ์ที่จะเต็ม (วินาที)
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
    estimatedTimeToFull?: number; // ⏰ เวลาคาดการณ์ที่จะเต็ม (วินาที)
    [key: string]: any;
  };
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error' | 'failed';
  message: string;
}

export interface ChargingCompletionData {
  transactionId: string;
  status: 'COMPLETED';
  chargePointId?: string;
  connectorId?: number;
  currentPower: number;
  currentEnergy: number;
  currentCost: number;
  currentSoC?: number; // 🔋 Battery State of Charge (%)
  duration: number;
  meterValue: number;
  finalMeterReading: number;
  totalEnergyConsumed: number;
  stopReason: string;
  completedAt: string;
  timestamp: string;
}

export interface PaymentNotification {
  transactionId: string;
  status: 'PAYMENT_COMPLETED' | 'PAYMENT_FAILED';
  paymentProcessed?: boolean;
  paymentTimestamp?: string;
  errorMessage?: string;
  message?: string;
  timestamp: string;
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
  public onChargingCompleted?: (data: ChargingCompletionData) => void;
  public onPaymentCompleted?: (data: PaymentNotification) => void;
  public onPaymentFailed?: (data: PaymentNotification) => void;

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
      const wsBaseUrl = process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'ws://192.168.1.40:3001';
      const wsUrl = `${wsBaseUrl}/mobile-ws/${userId}?token=${token}`;
      
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
    
    // 🕐 Debug: Check if estimatedTimeToFull is present
    if (payload.estimatedTimeToFull) {
      console.log(`⏰ [METER_VALUES] Estimated time to full: ${payload.estimatedTimeToFull} seconds (${ChargingWebSocketClient.formatEstimatedTimeToFull(payload.estimatedTimeToFull)})`);
    } else {
      console.log('⚠️ [METER_VALUES] No estimatedTimeToFull in payload:', Object.keys(payload));
    }
    
    if (this.onMeterValues) {
      this.onMeterValues({
        transactionId: payload.transactionId,
        chargePointId: payload.chargePointId,
        connectorId: payload.connectorId,
        energyDelivered: payload.energyDelivered || 0,
        currentSoC: payload.currentSoC || null,
        powerDelivered: payload.powerDelivered || 0,
        currentMeterValue: payload.currentMeterValue || 0,
        estimatedTimeToFull: payload.estimatedTimeToFull, // ⏰ เวลาคาดการณ์
        timestamp: payload.timestamp || new Date().toISOString()
      });
    }
  }

  /**
   * Charging Status Real-time
   * Handles all charging status updates including completion notifications
   */
  private handleChargingStatus(message: any): void {
    console.log('🔋 [WEBSOCKET] Charging status updated:', message);
    
    const payload = message.data;
    const transactionId = message.transactionId;
    
    // 🕐 Debug: Check if estimatedTimeToFull is present
    if (payload.estimatedTimeToFull) {
      console.log(`⏰ [WEBSOCKET] Estimated time to full: ${payload.estimatedTimeToFull} seconds (${ChargingWebSocketClient.formatEstimatedTimeToFull(payload.estimatedTimeToFull)})`);
    } else {
      console.log('⚠️ [WEBSOCKET] No estimatedTimeToFull in payload:', Object.keys(payload));
    }
    
    // Handle charging completion notifications
    if (payload.status === 'COMPLETED') {
      console.log('🎉 [WEBSOCKET] Charging completed!');
      if (this.onChargingCompleted) {
        this.onChargingCompleted({
          transactionId: transactionId,
          status: 'COMPLETED',
          chargePointId: payload.chargePointId,
          connectorId: payload.connectorId,
          currentPower: payload.currentPower || 0,
          currentEnergy: payload.currentEnergy || payload.totalEnergyConsumed || 0,
          currentCost: payload.currentCost || 0,
          currentSoC: payload.currentSoC, // 🔋 Battery percentage
          duration: payload.duration || 0,
          meterValue: payload.meterValue || 0,
          finalMeterReading: payload.finalMeterReading || payload.meterValue || 0,
          totalEnergyConsumed: payload.totalEnergyConsumed || payload.currentEnergy || 0,
          stopReason: payload.stopReason || 'Unknown',
          completedAt: payload.completedAt || payload.timestamp || new Date().toISOString(),
          timestamp: payload.timestamp || new Date().toISOString()
        });
      }
    }
    
    // Handle payment completion notifications
    if (payload.status === 'PAYMENT_COMPLETED') {
      console.log('💰 [WEBSOCKET] Payment completed successfully!');
      if (this.onPaymentCompleted) {
        this.onPaymentCompleted({
          transactionId: transactionId,
          status: 'PAYMENT_COMPLETED',
          paymentProcessed: true,
          paymentTimestamp: payload.paymentTimestamp || payload.timestamp,
          message: payload.message || 'ชาร์จเต็มแล้ว ตัดเงินเรียบร้อยแล้ว',
          timestamp: payload.timestamp || new Date().toISOString()
        });
      }
    }
    
    // Handle payment failure notifications  
    if (payload.status === 'PAYMENT_FAILED') {
      console.log('❌ [WEBSOCKET] Payment failed!');
      if (this.onPaymentFailed) {
        this.onPaymentFailed({
          transactionId: transactionId,
          status: 'PAYMENT_FAILED',
          paymentProcessed: false,
          errorMessage: payload.errorMessage || 'การตัดเงินล้มเหลว กรุณาตรวจสอบบัญชี',
          timestamp: payload.timestamp || new Date().toISOString()
        });
      }
    }
    
    // อัปเดต Transaction Data สำหรับ real-time updates (existing logic)
    if (this.onTransactionUpdate) {
      this.onTransactionUpdate({
        type: 'update',
        data: {
          transactionId: transactionId,
          status: payload.status,
          energyDelivered: payload.currentEnergy,
          duration: payload.duration,
          estimatedTimeToFull: payload.estimatedTimeToFull, // ⏰ เวลาคาดการณ์
          timestamp: payload.timestamp
        }
      });
    }
    
    // อัปเดต Meter Values สำหรับ real-time updates (existing logic)
    if (this.onMeterValues) {
      this.onMeterValues({
        transactionId: transactionId,
        chargePointId: payload.chargePointId,
        connectorId: payload.connectorId,
        energyDelivered: payload.currentEnergy || 0,
        currentMeterValue: payload.meterValue || 0,
        powerDelivered: payload.currentPower || 0,
        currentSoC: payload.currentSoC, // 🔋 Include battery percentage
        estimatedTimeToFull: payload.estimatedTimeToFull, // ⏰ เวลาคาดการณ์
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

  /**
   * Get connection status with detailed info
   */
  getConnectionInfo(): { connected: boolean; attempts: number; maxAttempts: number } {
    return {
      connected: this.isConnected,
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    };
  }

  /**
   * Force reconnect (useful for manual retry)
   */
  forceReconnect(): void {
    console.log('🔄 [WEBSOCKET] Force reconnecting...');
    this.reconnectAttempts = 0; // Reset attempts
    if (this.userId) {
      this.disconnect();
      setTimeout(() => {
        this.connect(this.userId!);
      }, 1000);
    }
  }

  /**
   * Send heartbeat ping to keep connection alive
   */
  sendHeartbeat(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Format estimated time to full for display
   * แสดงแค่ 2 หน่วยที่ใหญ่ที่สุด เช่น "3 ชม. 20 นาที", "45 นาที 30 วิ", "2 นาที"
   * @param seconds - เวลาในวินาที
   * @returns formatted string
   */
  static formatEstimatedTimeToFull(seconds?: number): string {
    if (!seconds || seconds <= 0) {
      return 'ไม่ทราบ';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    // แสดงแค่ 2 หน่วยที่ใหญ่ที่สุด
    if (hours > 0) {
      if (minutes > 0) {
        return `${hours} ชม. ${minutes} นาที`;
      } else {
        return `${hours} ชั่วโมง`;
      }
    } else if (minutes > 0) {
      if (remainingSeconds > 0) {
        return `${minutes} นาที ${remainingSeconds} วิ`;
      } else {
        return `${minutes} นาที`;
      }
    } else {
      return `${remainingSeconds} วินาที`;
    }
  }

  /**
   * Get estimated completion time (current time + estimatedTimeToFull)
   * @param estimatedTimeToFull - เวลาในวินาที
   * @returns Date object ของเวลาที่คาดว่าจะเต็ม
   */
  static getEstimatedCompletionTime(estimatedTimeToFull?: number): Date | null {
    if (!estimatedTimeToFull || estimatedTimeToFull <= 0) {
      return null;
    }

    const now = new Date();
    const completionTime = new Date(now.getTime() + (estimatedTimeToFull * 1000));
    return completionTime;
  }
}