const WebSocket = require('ws');

// Test WebSocket connection to the gateway
const chargePointId = 'CP_1760882403313_FAAEB99A';
const wsUrl = `ws://localhost:8081/ocpp/16/${chargePointId}`;

console.log(`Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl, ['ocpp1.6']);

ws.on('open', function open() {
  console.log('✅ WebSocket connection established');
  console.log(`Protocol: ${ws.protocol}`);
  
  // Send a BootNotification message (OCPP 1.6 format)
  const bootNotification = [
    2, // CALL
    "12345", // Message ID
    "BootNotification",
    {
      "chargePointVendor": "Test Vendor",
      "chargePointModel": "Test Model"
    }
  ];
  
  console.log('📤 Sending BootNotification:', JSON.stringify(bootNotification));
  ws.send(JSON.stringify(bootNotification));
});

ws.on('message', function message(data) {
  console.log('📥 Received:', data.toString());
});

ws.on('close', function close(code, reason) {
  console.log('❌ Connection closed:', code, reason.toString());
});

ws.on('error', function error(err) {
  console.error('🚨 WebSocket error:', err);
});

// Keep the connection alive for testing
setTimeout(() => {
  console.log('🔄 Sending Heartbeat...');
  const heartbeat = [2, "67890", "Heartbeat", {}];
  ws.send(JSON.stringify(heartbeat));
}, 5000);

// Close after 10 seconds
setTimeout(() => {
  console.log('🔚 Closing connection...');
  ws.close();
}, 10000);