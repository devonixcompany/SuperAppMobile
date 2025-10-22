const WebSocket = require('ws');

/**
 * ตัวอย่างการใช้งาน WebSocket Client สำหรับเชื่อมต่อกับระบบเครื่องชาร์จ
 */

class ChargingWebSocketClient {
  constructor(chargePointId, connectorId, serverUrl = 'ws://localhost:8081') {
    this.chargePointId = chargePointId;
    this.connectorId = connectorId;
    this.serverUrl = serverUrl;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    
    // Event handlers
    this.onChargingData = null;
    this.onStatus = null;
    this.onError = null;
    this.onConnect = null;
    this.onDisconnect = null;
  }

  connect() {
    const wsUrl = `${this.serverUrl}/${this.chargePointId}/${this.connectorId}`;
    console.log(`🔌 กำลังเชื่อมต่อไปยัง: ${wsUrl}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.on('open', () => {
        console.log('✅ เชื่อมต่อสำเร็จ!');
        this.reconnectAttempts = 0;
        if (this.onConnect) this.onConnect();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ ข้อผิดพลาดในการแปลงข้อมูล:', error.message);
          if (this.onError) this.onError(error.message);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ ข้อผิดพลาด WebSocket:', error.message);
        if (this.onError) this.onError(error.message);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`🔌 การเชื่อมต่อปิด (Code: ${code}, Reason: ${reason})`);
        this.ws = null;
        if (this.onDisconnect) this.onDisconnect(code, reason);
        
        // Auto reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 กำลังพยายามเชื่อมต่อใหม่ครั้งที่ ${this.reconnectAttempts}...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
          console.log('❌ ไม่สามารถเชื่อมต่อได้หลังจากพยายามหลายครั้ง');
        }
      });

    } catch (error) {
      console.error('❌ ไม่สามารถสร้างการเชื่อมต่อได้:', error.message);
      if (this.onError) this.onError(error.message);
    }
  }

  disconnect() {
    if (this.ws) {
      console.log('🔌 กำลังตัดการเชื่อมต่อ...');
      this.ws.close();
      this.ws = null;
    }
  }

  handleMessage(message) {
    const timestamp = new Date(message.timestamp).toLocaleString('th-TH');
    
    switch (message.type) {
      case 'charging_data':
        console.log(`📊 [${timestamp}] ข้อมูลการชาร์จ:`, this.formatChargingData(message.data));
        if (this.onChargingData) this.onChargingData(message.data);
        break;
        
      case 'status':
        console.log(`📡 [${timestamp}] สถานะ:`, this.formatStatusData(message.data));
        if (this.onStatus) this.onStatus(message.data);
        break;
        
      case 'heartbeat':
        console.log(`💓 [${timestamp}] Heartbeat`);
        break;
        
      case 'error':
        console.error(`❌ [${timestamp}] ข้อผิดพลาด:`, message.data.message);
        if (this.onError) this.onError(message.data.message);
        break;
        
      default:
        console.warn(`⚠️ [${timestamp}] ข้อมูลประเภทไม่รู้จัก:`, message.type);
    }
  }

  formatChargingData(data) {
    return {
      'สถานะ': data.status,
      'เปอร์เซ็นต์การชาร์จ': `${data.chargingPercentage?.toFixed(1) || '-'}%`,
      'กำลังไฟปัจจุบัน': `${data.currentPower?.toFixed(2) || '-'} kW`,
      'มิเตอร์ปัจจุบัน': `${data.currentMeter?.toFixed(3) || '-'} kWh`,
      'แรงดันไฟฟ้า': `${data.voltage?.toFixed(1) || '-'} V`,
      'กระแสไฟฟ้า': `${data.current?.toFixed(1) || '-'} A`,
      'อุณหภูมิ': `${data.temperature?.toFixed(1) || '-'} °C`,
      'พลังงานที่จ่าย': `${data.energyDelivered?.toFixed(2) || '-'} kWh`,
      'ค่าใช้จ่าย': `${data.cost?.toFixed(2) || '-'} บาท`,
      'Session ID': data.sessionId,
      'Transaction ID': data.transactionId
    };
  }

  formatStatusData(data) {
    return {
      'เครื่องชาร์จ': data.chargePointId,
      'หัวชาร์จ': data.connectorId,
      'สถานะ': data.status,
      'ออนไลน์': data.isOnline ? '✅ ออนไลน์' : '❌ ออฟไลน์',
      'ข้อความ': data.message || '-'
    };
  }

  // Helper methods for setting event handlers
  setOnChargingData(callback) {
    this.onChargingData = callback;
    return this;
  }

  setOnStatus(callback) {
    this.onStatus = callback;
    return this;
  }

  setOnError(callback) {
    this.onError = callback;
    return this;
  }

  setOnConnect(callback) {
    this.onConnect = callback;
    return this;
  }

  setOnDisconnect(callback) {
    this.onDisconnect = callback;
    return this;
  }
}

// ตัวอย่างการใช้งาน
function runExample() {
  console.log('🚀 เริ่มต้นตัวอย่างการใช้งาน WebSocket Client');
  
  const client = new ChargingWebSocketClient('CP001', 1)
    .setOnConnect(() => {
      console.log('🎉 เชื่อมต่อสำเร็จแล้ว!');
    })
    .setOnChargingData((data) => {
      console.log('📊 ได้รับข้อมูลการชาร์จใหม่');
      // สามารถประมวลผลข้อมูลเพิ่มเติมได้ที่นี่
    })
    .setOnStatus((data) => {
      console.log('📡 ได้รับข้อมูลสถานะใหม่');
      // สามารถประมวลผลข้อมูลเพิ่มเติมได้ที่นี่
    })
    .setOnError((error) => {
      console.error('💥 เกิดข้อผิดพลาด:', error);
    })
    .setOnDisconnect((code, reason) => {
      console.log('👋 การเชื่อมต่อปิดแล้ว');
    });

  // เชื่อมต่อ
  client.connect();

  // ตัดการเชื่อมต่อหลังจาก 30 วินาที (สำหรับตัวอย่าง)
  setTimeout(() => {
    console.log('⏰ หมดเวลาทดสอบ กำลังตัดการเชื่อมต่อ...');
    client.disconnect();
    process.exit(0);
  }, 30000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 กำลังปิดโปรแกรม...');
    client.disconnect();
    process.exit(0);
  });
}

// ตัวอย่างการใช้งานหลายการเชื่อมต่อ
function runMultiConnectionExample() {
  console.log('🚀 เริ่มต้นตัวอย่างการใช้งานหลายการเชื่อมต่อ');
  
  const connections = [
    { chargePointId: 'CP001', connectorId: 1 },
    { chargePointId: 'CP001', connectorId: 2 },
    { chargePointId: 'CP002', connectorId: 1 }
  ];

  const clients = connections.map(({ chargePointId, connectorId }) => {
    const client = new ChargingWebSocketClient(chargePointId, connectorId)
      .setOnConnect(() => {
        console.log(`🎉 ${chargePointId}/${connectorId} เชื่อมต่อสำเร็จ!`);
      })
      .setOnChargingData((data) => {
        console.log(`📊 ${chargePointId}/${connectorId} - เปอร์เซ็นต์: ${data.chargingPercentage?.toFixed(1)}%, กำลังไฟ: ${data.currentPower?.toFixed(2)} kW`);
      })
      .setOnError((error) => {
        console.error(`💥 ${chargePointId}/${connectorId} - ข้อผิดพลาด:`, error);
      });

    client.connect();
    return client;
  });

  // ตัดการเชื่อมต่อทั้งหมดหลังจาก 30 วินาที
  setTimeout(() => {
    console.log('⏰ หมดเวลาทดสอบ กำลังตัดการเชื่อมต่อทั้งหมด...');
    clients.forEach(client => client.disconnect());
    process.exit(0);
  }, 30000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 กำลังปิดโปรแกรม...');
    clients.forEach(client => client.disconnect());
    process.exit(0);
  });
}

// Export สำหรับใช้งานใน module อื่น
module.exports = {
  ChargingWebSocketClient,
  runExample,
  runMultiConnectionExample
};

// รันตัวอย่างถ้าไฟล์นี้ถูกเรียกใช้โดยตรง
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--multi')) {
    runMultiConnectionExample();
  } else {
    runExample();
  }
}

/*
วิธีการใช้งาน:

1. การใช้งานพื้นฐาน:
   node node-client-example.js

2. การใช้งานหลายการเชื่อมต่อ:
   node node-client-example.js --multi

3. การใช้งานใน code อื่น:
   const { ChargingWebSocketClient } = require('./node-client-example.js');
   
   const client = new ChargingWebSocketClient('CP001', 1)
     .setOnChargingData((data) => {
       console.log('Charging data:', data);
     })
     .setOnStatus((data) => {
       console.log('Status:', data);
     });
   
   client.connect();
*/