const WebSocket = require('ws');

const chargePointId = 'EVBANGNA-CP001';
const wsUrl = `ws://localhost:8081/ocpp/${chargePointId}`;

console.log('Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl, 'ocpp1.6');

ws.on('open', () => {
  console.log('✅ WebSocket connection opened');
  
  // ส่ง BootNotification
  const bootNotification = [
    2,
    "1",
    "BootNotification",
    {
      "chargePointVendor": "Test Vendor",
      "chargePointModel": "Test Model",
      "chargePointSerialNumber": "SN005",
      "firmwareVersion": "1.0.0"
    }
  ];
  
  console.log('📤 Sending BootNotification:', JSON.stringify(bootNotification));
  ws.send(JSON.stringify(bootNotification));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📥 Received message:', JSON.stringify(message));
  
  // ตรวจสอบว่าเป็น GetConfiguration request หรือไม่
  if (message[0] === 2 && message[2] === 'GetConfiguration') {
    const messageId = message[1];
    const payload = message[3];
    
    console.log('🔧 Received GetConfiguration request for keys:', payload.key);
    
    // ตอบกลับ GetConfiguration
    const response = [
      3,
      messageId,
      {
        "configurationKey": [
          {
            "key": "NumberOfConnectors",
            "readonly": true,
            "value": "2"
          }
        ]
      }
    ];
    
    console.log('📤 Sending GetConfiguration response:', JSON.stringify(response));
    ws.send(JSON.stringify(response));
  }
  
  // ตรวจสอบว่าเป็น BootNotification response หรือไม่
  if (message[0] === 3 && message[1] === "1") {
    console.log('✅ BootNotification accepted');
    
    // ส่ง Heartbeat ทุก 2 วินาที
    let heartbeatCounter = 2;
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const heartbeat = [2, heartbeatCounter.toString(), "Heartbeat", {}];
        console.log('💓 Sending Heartbeat:', JSON.stringify(heartbeat));
        ws.send(JSON.stringify(heartbeat));
        heartbeatCounter++;
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 2000);
    
    // เก็บ interval ID เพื่อใช้ปิดภายหลัง
    ws.heartbeatInterval = heartbeatInterval;
  }
  
  // ตรวจสอบว่าเป็น Heartbeat response หรือไม่
  if (message[0] === 3 && message[2] && message[2].currentTime) {
    console.log('💚 Received Heartbeat response with currentTime:', message[2].currentTime);
  }
  
  // ส่ง Heartbeat ทันทีหลังจากได้รับ GetConfiguration response (เพื่อทดสอบ)
  if (message[0] === 2 && message[2] === 'GetConfiguration') {
    setTimeout(() => {
      const heartbeat = [2, "heartbeat-test", "Heartbeat", {}];
      console.log('🧪 Sending test Heartbeat:', JSON.stringify(heartbeat));
      ws.send(JSON.stringify(heartbeat));
    }, 1000);
  }
});

ws.on('close', (code, reason) => {
  console.log(`❌ Connection closed with code: ${code}, reason: ${reason}`);
  
  // ปิด heartbeat interval เมื่อการเชื่อมต่อปิด
  if (ws.heartbeatInterval) {
    clearInterval(ws.heartbeatInterval);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// ปิดการเชื่อมต่อหลังจาก 10 วินาที
setTimeout(() => {
  console.log('⏰ Closing connection after timeout');
  ws.close();
}, 10000);