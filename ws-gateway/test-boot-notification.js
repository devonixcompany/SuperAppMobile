const WebSocket = require('ws');

// Test script to simulate a charge point sending BootNotification
const ws = new WebSocket('ws://localhost:8081/ocpp/CP006', 'ocpp1.6');

ws.on('open', function open() {
  console.log('🔌 Connected to WS-Gateway');
  
  // Send BootNotification message
  const bootNotification = [
    2,  // CALL message type
    "1", // Message ID
    "BootNotification",
    {
      "chargePointVendor": "TestVendor",
      "chargePointModel": "TestModel",
      "chargePointSerialNumber": "TEST-001",
      "chargeBoxSerialNumber": "CP006",
      "firmwareVersion": "v1.0.0"
    }
  ];
  
  console.log('📤 Sending BootNotification:', JSON.stringify(bootNotification));
  ws.send(JSON.stringify(bootNotification));
});

ws.on('message', function message(data) {
  console.log('📥 Received message:', data.toString());
  
  // Parse the message
  try {
    const parsedMessage = JSON.parse(data.toString());
    console.log('📊 Parsed message:', parsedMessage);
    
    // If it's a BootNotification response
    if (parsedMessage[0] === 3 && parsedMessage[1] === "1") {
      console.log('✅ Received BootNotification response:', parsedMessage[2]);
      
      // Wait a bit then close
      setTimeout(() => {
        console.log('🔌 Closing connection');
        ws.close();
      }, 2000);
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('🔌 Connection closed');
});