const WebSocket = require('ws');

// สร้าง WebSocket client ที่ส่ง BootNotification
// Create WebSocket client that sends BootNotification
const ws = new WebSocket('ws://localhost:8081/ocpp/CP005', ['ocpp1.6']);

ws.on('open', function open() {
  console.log('Connected to WS-Gateway');
  console.log('Selected protocol:', ws.protocol);
  
  // ส่ง BootNotification ทันทีหลังจากเชื่อมต่อ
  // Send BootNotification immediately after connection
  const bootNotification = [
    2,  // CALL message type
    "boot-001",  // unique ID
    "BootNotification",  // action
    {
      chargePointVendor: "TestVendor",
      chargePointModel: "TestModel",
      chargePointSerialNumber: "TEST001",
      firmwareVersion: "1.0.0"
    }
  ];
  
  console.log('Sending BootNotification:', JSON.stringify(bootNotification));
  ws.send(JSON.stringify(bootNotification));
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
  
  try {
    const message = JSON.parse(data.toString());
    
    // ตรวจสอบว่าเป็น BootNotification response หรือไม่
    if (message[0] === 3 && message[1] === "boot-001") {
      console.log('BootNotification response received:', message[2]);
      
      // ส่ง Heartbeat หลังจากได้รับ BootNotification response
      setTimeout(() => {
        const heartbeat = [
          2,  // CALL message type
          "heartbeat-001",  // unique ID
          "Heartbeat",  // action
          {}  // empty payload
        ];
        
        console.log('Sending Heartbeat:', JSON.stringify(heartbeat));
        ws.send(JSON.stringify(heartbeat));
      }, 1000);
    }
    
    // ตรวจสอบว่าเป็น Heartbeat response หรือไม่
    if (message[0] === 3 && message[1] === "heartbeat-001") {
      console.log('Heartbeat response received:', message[2]);
    }
    
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('close', function close(code, reason) {
  console.log('Connection closed:', code, reason.toString());
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

// ปิดการเชื่อมต่อหลังจาก 15 วินาที
// Close connection after 15 seconds
setTimeout(() => {
  console.log('Closing connection...');
  ws.close();
}, 15000);