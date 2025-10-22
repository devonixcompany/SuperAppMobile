const WebSocket = require('ws');

// ทดสอบการส่งข้อมูลเรียลไทม์
async function testRealtimeUpdates() {
  console.log('🧪 Testing Real-time Updates for User WebSocket');
  
  // 1. เชื่อมต่อ User WebSocket ก่อน (ใช้ charge point ที่มีอยู่ใน cache)
  const userWs = new WebSocket('ws://localhost:8081/user-cp/EVBANGNA-CP001/1');
  
  userWs.on('open', () => {
    console.log('👤 User WebSocket connected to EVBANGNA-CP001/1');
  });
  
  userWs.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 User received:', JSON.stringify(message, null, 2));
  });
  
  userWs.on('error', (error) => {
    console.error('❌ User WebSocket error:', error);
  });
  
  // รอ 2 วินาที แล้วเชื่อมต่อ OCPP charge point
  setTimeout(() => {
    console.log('\n🔌 Connecting OCPP Charge Point...');
    
    const ocppWs = new WebSocket('ws://localhost:8081/EVBANGNA-CP001');
    
    ocppWs.on('open', () => {
      console.log('⚡ OCPP WebSocket connected');
      
      // ส่ง BootNotification
      const bootNotification = [
        2,
        "boot-001",
        "BootNotification",
        {
          "chargePointVendor": "EVBang",
          "chargePointModel": "CP-001",
          "chargePointSerialNumber": "CP1-2919101",
          "firmwareVersion": "1.0.0"
        }
      ];
      
      ocppWs.send(JSON.stringify(bootNotification));
      console.log('📤 Sent BootNotification');
      
      // ส่ง Heartbeat หลังจาก 3 วินาที
      setTimeout(() => {
        const heartbeat = [2, "heartbeat-001", "Heartbeat", {}];
        ocppWs.send(JSON.stringify(heartbeat));
        console.log('💓 Sent Heartbeat');
      }, 3000);
      
      // ปิดการเชื่อมต่อหลังจาก 8 วินาที
      setTimeout(() => {
        console.log('🔌 Closing OCPP connection...');
        ocppWs.close();
      }, 8000);
    });
    
    ocppWs.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('📨 OCPP received:', JSON.stringify(message, null, 2));
    });
    
    ocppWs.on('close', () => {
      console.log('⚡ OCPP WebSocket disconnected');
    });
    
    ocppWs.on('error', (error) => {
      console.error('❌ OCPP WebSocket error:', error);
    });
    
  }, 2000);
  
  // ปิด User WebSocket หลังจาก 12 วินาที
  setTimeout(() => {
    console.log('👤 Closing User WebSocket...');
    userWs.close();
    console.log('✅ Test completed');
  }, 12000);
}

// เริ่มทดสอบ
testRealtimeUpdates().catch(console.error);