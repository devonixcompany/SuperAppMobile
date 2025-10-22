// Test WebSocket Client for Frontend Connection
// ไคลเอนต์ทดสอบ WebSocket สำหรับการเชื่อมต่อ Frontend

import WebSocket from 'ws';
import { FrontendMessage } from './types';

/**
 * การตั้งค่าการทดสอบ
 * Test configuration
 */
interface TestConfig {
  serverUrl: string;              // URL ของเซิร์ฟเวอร์
  chargePointId: string;          // รหัสเครื่องชาร์จ
  connectorId: number;            // รหัสหัวชาร์จ
  testDurationMs: number;         // ระยะเวลาทดสอบ (มิลลิวินาที)
  logMessages: boolean;           // แสดงข้อความหรือไม่
}

/**
 * สถิติการทดสอบ
 * Test statistics
 */
interface TestStats {
  startTime: Date;
  endTime?: Date;
  messagesReceived: number;
  chargingDataMessages: number;
  statusMessages: number;
  heartbeatMessages: number;
  errorMessages: number;
  connectionErrors: number;
  lastMessage?: FrontendMessage;
}

/**
 * คลาสทดสอบ WebSocket Client
 * WebSocket Client Test class
 */
export class WebSocketTestClient {
  private config: TestConfig;
  private ws: WebSocket | null = null;
  private stats: TestStats;
  private testTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: TestConfig) {
    this.config = config;
    this.stats = {
      startTime: new Date(),
      messagesReceived: 0,
      chargingDataMessages: 0,
      statusMessages: 0,
      heartbeatMessages: 0,
      errorMessages: 0,
      connectionErrors: 0
    };
  }

  /**
   * เริ่มการทดสอบ
   * Start test
   */
  public async startTest(): Promise<TestStats> {
    if (this.isRunning) {
      throw new Error('การทดสอบกำลังทำงานอยู่แล้ว');
    }

    console.log('🧪 เริ่มการทดสอบ WebSocket Client...');
    console.log(`📍 เชื่อมต่อไปยัง: ${this.getConnectionUrl()}`);
    console.log(`⏱️ ระยะเวลาทดสอบ: ${this.config.testDurationMs / 1000} วินาที`);

    this.isRunning = true;
    this.stats.startTime = new Date();

    return new Promise((resolve, reject) => {
      try {
        this.connectWebSocket();

        // ตั้งเวลาหยุดการทดสอบ
        this.testTimer = setTimeout(() => {
          this.stopTest();
          resolve(this.stats);
        }, this.config.testDurationMs);

      } catch (error) {
        this.isRunning = false;
        reject(error);
      }
    });
  }

  /**
   * หยุดการทดสอบ
   * Stop test
   */
  public stopTest(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 หยุดการทดสอบ...');

    this.isRunning = false;
    this.stats.endTime = new Date();

    if (this.testTimer) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.printTestResults();
  }

  /**
   * เชื่อมต่อ WebSocket
   * Connect WebSocket
   */
  private connectWebSocket(): void {
    const url = this.getConnectionUrl();
    
    try {
      this.ws = new WebSocket(url);
      
      this.ws.on('open', () => {
        console.log('✅ เชื่อมต่อ WebSocket สำเร็จ');
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error: Error) => {
        console.error('❌ WebSocket Error:', error.message);
        this.stats.connectionErrors++;
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        console.log(`🔌 WebSocket ปิดการเชื่อมต่อ: ${code} - ${reason.toString()}`);
        
        // ลองเชื่อมต่อใหม่หากยังทดสอบอยู่
        if (this.isRunning) {
          setTimeout(() => {
            if (this.isRunning) {
              console.log('🔄 ลองเชื่อมต่อใหม่...');
              this.connectWebSocket();
            }
          }, 2000);
        }
      });

    } catch (error) {
      console.error('❌ ไม่สามารถเชื่อมต่อ WebSocket:', error);
      this.stats.connectionErrors++;
      throw error;
    }
  }

  /**
   * จัดการข้อความที่ได้รับ
   * Handle received message
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: FrontendMessage = JSON.parse(data.toString());
      
      this.stats.messagesReceived++;
      this.stats.lastMessage = message;

      // นับประเภทข้อความ
      switch (message.type) {
        case 'charging_data':
          this.stats.chargingDataMessages++;
          break;
        case 'status':
          this.stats.statusMessages++;
          break;
        case 'heartbeat':
          this.stats.heartbeatMessages++;
          break;
        case 'error':
          this.stats.errorMessages++;
          break;
      }

      if (this.config.logMessages) {
        this.logMessage(message);
      }

    } catch (error) {
      console.error('❌ ไม่สามารถแปลงข้อความ JSON:', error);
    }
  }

  /**
   * แสดงข้อความที่ได้รับ
   * Log received message
   */
  private logMessage(message: FrontendMessage): void {
    const timestamp = new Date().toISOString();
    
    switch (message.type) {
      case 'charging_data':
        console.log(`📊 [${timestamp}] ข้อมูลการชาร์จ:`, {
          connector: message.data.connectorId,
          status: message.data.status,
          percentage: message.data.chargingPercentage,
          power: message.data.currentPower,
          meter: message.data.currentMeter
        });
        break;

      case 'status':
        console.log(`📋 [${timestamp}] สถานะ:`, {
          chargePoint: message.data.chargePointId,
          connector: message.data.connectorId,
          status: message.data.status,
          online: message.data.isOnline
        });
        break;

      case 'heartbeat':
        console.log(`💓 [${timestamp}] Heartbeat`);
        break;

      case 'error':
        console.log(`❌ [${timestamp}] ข้อผิดพลาด:`, {
          code: message.data.code,
          message: message.data.message
        });
        break;

      default:
        console.log(`📝 [${timestamp}] ข้อความอื่น:`, message);
    }
  }

  /**
   * สร้าง URL การเชื่อมต่อ
   * Generate connection URL
   */
  private getConnectionUrl(): string {
    return `${this.config.serverUrl}/${this.config.chargePointId}/${this.config.connectorId}`;
  }

  /**
   * แสดงผลการทดสอบ
   * Print test results
   */
  private printTestResults(): void {
    const duration = this.stats.endTime 
      ? (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000
      : 0;

    console.log('\n📊 ผลการทดสอบ WebSocket Client:');
    console.log('=====================================');
    console.log(`⏱️ ระยะเวลา: ${duration.toFixed(2)} วินาที`);
    console.log(`📨 ข้อความทั้งหมด: ${this.stats.messagesReceived}`);
    console.log(`📊 ข้อมูลการชาร์จ: ${this.stats.chargingDataMessages}`);
    console.log(`📋 ข้อความสถานะ: ${this.stats.statusMessages}`);
    console.log(`💓 Heartbeat: ${this.stats.heartbeatMessages}`);
    console.log(`❌ ข้อผิดพลาด: ${this.stats.errorMessages}`);
    console.log(`🔌 ข้อผิดพลาดการเชื่อมต่อ: ${this.stats.connectionErrors}`);
    
    if (this.stats.messagesReceived > 0 && duration > 0) {
      const messagesPerSecond = this.stats.messagesReceived / duration;
      console.log(`📈 อัตราข้อความ: ${messagesPerSecond.toFixed(2)} ข้อความ/วินาที`);
    }

    if (this.stats.lastMessage) {
      console.log(`📝 ข้อความล่าสุด: ${this.stats.lastMessage.type}`);
    }

    console.log('=====================================\n');
  }

  /**
   * ดึงสถิติการทดสอบ
   * Get test statistics
   */
  public getStats(): TestStats {
    return { ...this.stats };
  }
}

/**
 * ฟังก์ชันทดสอบแบบง่าย
 * Simple test function
 */
export async function runSimpleTest(
  chargePointId: string = 'CP001',
  connectorId: number = 1,
  durationSeconds: number = 30
): Promise<TestStats> {
  
  const config: TestConfig = {
    serverUrl: 'ws://localhost:8081',
    chargePointId,
    connectorId,
    testDurationMs: durationSeconds * 1000,
    logMessages: true
  };

  const client = new WebSocketTestClient(config);
  
  try {
    const stats = await client.startTest();
    return stats;
  } catch (error) {
    console.error('❌ การทดสอบล้มเหลว:', error);
    throw error;
  }
}

/**
 * ทดสอบหลายการเชื่อมต่อพร้อมกัน
 * Test multiple connections simultaneously
 */
export async function runMultiConnectionTest(
  connections: Array<{ chargePointId: string; connectorId: number }>,
  durationSeconds: number = 30
): Promise<TestStats[]> {
  
  console.log(`🧪 เริ่มทดสอบหลายการเชื่อมต่อ (${connections.length} การเชื่อมต่อ)...`);

  const clients = connections.map(conn => {
    const config: TestConfig = {
      serverUrl: 'ws://localhost:8081',
      chargePointId: conn.chargePointId,
      connectorId: conn.connectorId,
      testDurationMs: durationSeconds * 1000,
      logMessages: false // ปิดการแสดงข้อความเพื่อไม่ให้รกหน้าจอ
    };
    return new WebSocketTestClient(config);
  });

  try {
    const promises = clients.map(client => client.startTest());
    const results = await Promise.all(promises);
    
    console.log('✅ การทดสอบหลายการเชื่อมต่อเสร็จสิ้น');
    return results;
    
  } catch (error) {
    console.error('❌ การทดสอบหลายการเชื่อมต่อล้มเหลว:', error);
    throw error;
  }
}

// ตัวอย่างการใช้งาน
if (require.main === module) {
  console.log('🧪 เริ่มการทดสอบ WebSocket Client...\n');

  // ทดสอบการเชื่อมต่อเดียว
  runSimpleTest('CP001', 1, 15)
    .then(stats => {
      console.log('✅ การทดสอบเสร็จสิ้น');
    })
    .catch(error => {
      console.error('❌ การทดสอบล้มเหลว:', error);
      process.exit(1);
    });
}