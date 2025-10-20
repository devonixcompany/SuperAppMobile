const WebSocket = require('ws');

// Test connection to charge point CP004 using only chargePointId
const chargePointId = 'CP004';
const wsUrl = `ws://localhost:8081/ocpp/${chargePointId}`;

console.log(`Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl, 'ocpp1.6');

ws.on('open', function open() {
  console.log('✅ WebSocket connection opened');
  
  // Send BootNotification message in correct OCPP format
  const bootNotification = [
    2,  // CALL message type
    "1", // Message ID
    "BootNotification", // Action
    {
      chargePointVendor: "Test Vendor",
      chargePointModel: "Test Model",
      chargePointSerialNumber: "SN004",
      firmwareVersion: "1.0.0"
    }
  ];
  
  console.log('📤 Sending BootNotification:', JSON.stringify(bootNotification));
  ws.send(JSON.stringify(bootNotification));
  
  // Send Heartbeat after 2 seconds
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const heartbeat = [
        2,  // CALL message type
        "2", // Message ID
        "Heartbeat", // Action
        {}
      ];
      console.log('💓 Sending Heartbeat:', JSON.stringify(heartbeat));
      ws.send(JSON.stringify(heartbeat));
    }
  }, 2000);
});

ws.on('message', function message(data) {
  console.log('📥 Received response:', data.toString());
  
  try {
    const response = JSON.parse(data.toString());
    if (response[0] === 3) { // CALLRESULT
      console.log('✅ CALLRESULT - Message ID:', response[1], 'Payload:', response[2]);
    } else if (response[0] === 4) { // CALLERROR
      console.log('❌ CALLERROR - Message ID:', response[1], 'Error:', response[2], 'Description:', response[3]);
    }
  } catch (e) {
    console.log('⚠️ Could not parse response as JSON');
  }
});

ws.on('close', function close(code, reason) {
  console.log(`❌ Connection closed with code: ${code}, reason: ${reason}`);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

// Close connection after 15 seconds
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('⏰ Closing connection after timeout');
    ws.close();
  }
}, 15000);