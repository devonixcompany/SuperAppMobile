const WebSocket = require('ws');

// ทดสอบ User WebSocket endpoint
const chargePointId = 'EVBANGNA-CP001';
const connectorId = '1';
const wsUrl = `ws://localhost:8081/user-cp/${chargePointId}/${connectorId}`;

console.log(`👤 Testing User WebSocket connection to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ Connected to User WebSocket server');
});

ws.on('message', function message(data) {
  console.log('📥 Received:', data.toString());
  
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📊 Parsed data:', JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.log('❌ Error parsing message:', error.message);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 Connection closed. Code: ${code}, Reason: ${reason}`);
});

// ปิดการเชื่อมต่อหลังจาก 8 วินาที
setTimeout(() => {
  console.log('⏰ Closing connection...');
  ws.close();
}, 8000);