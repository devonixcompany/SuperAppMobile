const WebSocket = require('ws');

// Test StatusNotification handling
async function testStatusNotification() {
  console.log('🧪 Testing StatusNotification handling...\n');

  // Step 1: Connect User WebSocket to monitor updates
  console.log('📱 Connecting User WebSocket...');
  const userWs = new WebSocket('ws://localhost:8081/user-cp/EVBANGNA-CP001/1');
  
  userWs.on('open', () => {
    console.log('✅ User WebSocket connected');
  });

  userWs.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 User WebSocket received:', JSON.stringify(message, null, 2));
  });

  userWs.on('error', (error) => {
    console.error('❌ User WebSocket error:', error.message);
  });

  // Wait for user connection to establish
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Connect OCPP WebSocket (charge station)
  console.log('\n🔌 Connecting OCPP WebSocket (charge station)...');
  const ocppWs = new WebSocket('ws://localhost:8081/ocpp/EVBANGNA-CP001', 'ocpp1.6');

  ocppWs.on('open', () => {
    console.log('✅ OCPP WebSocket connected');
    
    // Step 3: Send BootNotification first
    setTimeout(() => {
      console.log('\n📤 Sending BootNotification...');
      const bootNotification = JSON.stringify([
        2, // CALL
        "boot-001",
        "BootNotification",
        {
          "chargePointVendor": "TestVendor",
          "chargePointModel": "TestModel"
        }
      ]);
      ocppWs.send(bootNotification);
    }, 500);

    // Step 4: Send StatusNotification messages for different connectors and statuses
    setTimeout(() => {
      if (ocppWs.readyState === WebSocket.OPEN) {
        console.log('\n📤 Sending StatusNotification - Connector 1 Available...');
        const statusNotification1 = JSON.stringify([
          2, // CALL
          "status-001",
          "StatusNotification",
          {
            "connectorId": 1,
            "errorCode": "NoError",
            "status": "Available"
          }
        ]);
        ocppWs.send(statusNotification1);
      } else {
        console.log('❌ OCPP WebSocket is not open, cannot send StatusNotification');
      }
    }, 3000);

    setTimeout(() => {
      if (ocppWs.readyState === WebSocket.OPEN) {
        console.log('\n📤 Sending StatusNotification - Connector 2 Preparing...');
        const statusNotification2 = JSON.stringify([
          2, // CALL
          "status-002",
          "StatusNotification",
          {
            "connectorId": 2,
            "errorCode": "NoError",
            "status": "Preparing"
          }
        ]);
        ocppWs.send(statusNotification2);
      } else {
        console.log('❌ OCPP WebSocket is not open, cannot send StatusNotification');
      }
    }, 4000);

    setTimeout(() => {
      if (ocppWs.readyState === WebSocket.OPEN) {
        console.log('\n📤 Sending StatusNotification - Connector 1 Charging...');
        const statusNotification3 = JSON.stringify([
          2, // CALL
          "status-003",
          "StatusNotification",
          {
            "connectorId": 1,
            "errorCode": "NoError",
            "status": "Charging"
          }
        ]);
        ocppWs.send(statusNotification3);
      } else {
        console.log('❌ OCPP WebSocket is not open, cannot send StatusNotification');
      }
    }, 5000);

    setTimeout(() => {
      if (ocppWs.readyState === WebSocket.OPEN) {
        console.log('\n📤 Sending StatusNotification - Connector 2 Faulted...');
        const statusNotification4 = JSON.stringify([
          2, // CALL
          "status-004",
          "StatusNotification",
          {
            "connectorId": 2,
            "errorCode": "ConnectorLockFailure",
            "status": "Faulted"
          }
        ]);
        ocppWs.send(statusNotification4);
      } else {
        console.log('❌ OCPP WebSocket is not open, cannot send StatusNotification');
      }
    }, 6000);

    // Step 5: Close connections after testing
    setTimeout(() => {
      console.log('\n🔌 Closing connections...');
      if (ocppWs.readyState === WebSocket.OPEN) {
        ocppWs.close();
      }
      if (userWs.readyState === WebSocket.OPEN) {
        userWs.close();
      }
      console.log('✅ Test completed!');
      process.exit(0);
    }, 8000);
  });

  ocppWs.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 OCPP WebSocket received response:', JSON.stringify(message, null, 2));
  });

  ocppWs.on('error', (error) => {
    console.error('❌ OCPP WebSocket error:', error.message);
  });

  ocppWs.on('close', () => {
    console.log('🔌 OCPP WebSocket disconnected');
  });
}

// Run the test
testStatusNotification().catch(console.error);