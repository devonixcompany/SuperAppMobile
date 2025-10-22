const WebSocket = require('ws');

// ทดสอบการ redirect ของ frontend connection (ควรถูก redirect ไป user-cp endpoint)
const chargePointId = 'EVBANGNA-CP001';
const connectorId = '1';
const wsUrl = `ws://localhost:8081/${chargePointId}/${connectorId}`;

console.log(`🌐 Testing Frontend connection redirect to: ${wsUrl}`);
console.log('📝 This should be redirected to use /user-cp/ endpoint');

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
  console.log('✅ Connected (this should not happen - should be redirected)');
});

ws.on('message', function message(data) {
  console.log('📥 Received:', data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error (expected):', err.message);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 Connection closed. Code: ${code}, Reason: ${reason}`);
  
  if (code === 1008) {
    console.log('✅ Correctly redirected with policy violation (1008)');
  }
});

// ปิดการเชื่อมต่อหลังจาก 5 วินาที
setTimeout(() => {
  console.log('⏰ Closing connection...');
  ws.close();
}, 5000);