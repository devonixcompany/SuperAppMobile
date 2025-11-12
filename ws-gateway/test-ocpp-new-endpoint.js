const WebSocket = require('ws');

// ทดสอบ OCPP endpoint รูปแบบใหม่
const chargePointId = 'Devonix1'; // This is the working ID from cache
const wsUrl = `ws://127.0.0.1:3000/ocpp/${chargePointId}`;

console.log(`🔌 Testing OCPP WebSocket connection to: ${wsUrl}`);

const ws = new WebSocket(wsUrl, ['ocpp1.6']);

ws.on('open', function open() {
  console.log('🔍 [DEBUG] WebSocket opened with protocol:', ws.protocol);
  console.log('✅ Connected to OCPP WebSocket server (new endpoint)');
  
  // ส่ง BootNotification message
  const bootNotification = [
    2,
    "unique-message-id-001",
    "BootNotification",
    {
      "chargePointVendor": "EVBANGNA",
      "chargePointModel": "CP-Model-001",
      "chargePointSerialNumber": "CP1-2919101",
      "firmwareVersion": "1.0.0"
    }
  ];
  
  console.log('📤 Sending BootNotification...');
  ws.send(JSON.stringify(bootNotification));
});

ws.on('message', function message(data) {
  console.log('📥 Received:', data.toString());
  
  try {
    const parsed = JSON.parse(data.toString());
    if (parsed[0] === 3 && parsed[2] && parsed[2].status === 'Accepted') {
      console.log('✅ BootNotification accepted!');
      
      // ส่ง Heartbeat หลังจาก 2 วินาที
      setTimeout(() => {
        const heartbeat = [2, "heartbeat-001", "Heartbeat", {}];
        console.log('💓 Sending Heartbeat...');
        ws.send(JSON.stringify(heartbeat));
      }, 2000);
    }
  } catch (error) {
    console.log('❌ Error parsing message:', error.message);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  console.error('🔍 [DEBUG] Full error object:', err);
});

ws.on('unexpected-response', function unexpectedResponse(request, response) {
  console.error('🔍 [DEBUG] Unexpected response:', response.statusCode, response.statusMessage);
  console.error('🔍 [DEBUG] Response headers:', response.headers);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 Connection closed. Code: ${code}, Reason: ${reason}`);
});

// ปิดการเชื่อมต่อหลังจาก 10 วินาที
setTimeout(() => {
  console.log('⏰ Closing connection...');
  ws.close();
}, 10000);