const WebSocket = require('ws');
const http = require('http');

// Test StatusNotification by simulating OCPP messages via HTTP
async function testDirectStatusNotification() {
  console.log('🧪 Testing StatusNotification via HTTP simulation...\n');

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

  // Step 2: Test StatusNotification by creating a proper OCPP connection
  console.log('\n🔌 Creating OCPP connection for testing...');
  
  const testStatuses = [
    { connectorId: 1, status: 'Available', errorCode: 'NoError' },
    { connectorId: 2, status: 'Preparing', errorCode: 'NoError' },
    { connectorId: 1, status: 'Charging', errorCode: 'NoError' },
    { connectorId: 2, status: 'Faulted', errorCode: 'ConnectorLockFailure' }
  ];

  // Create a temporary OCPP connection to send StatusNotification
  const ocppWs = new WebSocket('ws://localhost:8081/ocpp/EVBANGNA-CP001', 'ocpp1.6');
  
  ocppWs.on('open', () => {
    console.log('✅ OCPP WebSocket connected for testing');
    
    // Send BootNotification first to establish the session
    setTimeout(() => {
      console.log('📤 Sending BootNotification...');
      const bootNotification = JSON.stringify([
        2, // CALL
        "boot-test-001",
        "BootNotification",
        {
          "chargePointVendor": "TestVendor",
          "chargePointModel": "TestModel"
        }
      ]);
      ocppWs.send(bootNotification);
    }, 500);

    // Send StatusNotification messages after BootNotification
    testStatuses.forEach((statusTest, index) => {
      setTimeout(() => {
        if (ocppWs.readyState === WebSocket.OPEN) {
          console.log(`\n📤 Sending StatusNotification - Connector ${statusTest.connectorId} ${statusTest.status}...`);
          const statusNotification = JSON.stringify([
            2, // CALL
            `status-test-${index + 1}`,
            "StatusNotification",
            {
              "connectorId": statusTest.connectorId,
              "errorCode": statusTest.errorCode,
              "status": statusTest.status
            }
          ]);
          ocppWs.send(statusNotification);
        } else {
          console.log(`❌ OCPP WebSocket is not open for status ${statusTest.status}`);
        }
      }, 2000 + (index * 1500)); // Start after BootNotification, then 1.5s intervals
    });

    // Close OCPP connection after all tests
    setTimeout(() => {
      if (ocppWs.readyState === WebSocket.OPEN) {
        console.log('\n🔌 Closing OCPP test connection...');
        ocppWs.close();
      }
    }, 10000);
  });

  ocppWs.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 OCPP received response:', JSON.stringify(message, null, 2));
  });

  ocppWs.on('error', (error) => {
    console.error('❌ OCPP WebSocket error:', error.message);
  });

  ocppWs.on('close', () => {
    console.log('🔌 OCPP WebSocket disconnected');
  });

  // Step 3: Close user connection after testing
  setTimeout(() => {
    console.log('\n🔌 Closing user connection...');
    if (userWs.readyState === WebSocket.OPEN) {
      userWs.close();
    }
    console.log('✅ Test completed!');
    process.exit(0);
  }, 12000);
}

// Run the test
testDirectStatusNotification().catch(console.error);