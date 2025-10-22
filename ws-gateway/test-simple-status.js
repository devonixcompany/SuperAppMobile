const WebSocket = require('ws');

// Simple test for StatusNotification - using existing connected charge point
async function testSimpleStatusNotification() {
  console.log('🧪 Testing StatusNotification with existing charge point...\n');

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

  // Step 2: Simulate StatusNotification by directly calling the handler
  console.log('\n🔧 Simulating StatusNotification handling...');
  
  // Import the handler directly
  const path = require('path');
  const { gatewaySessionManager } = require('./src/handlers/gatewaySessionManager.ts');
  
  // Test different connector statuses
  const testStatuses = [
    { connectorId: 1, status: 'Available', errorCode: 'NoError' },
    { connectorId: 2, status: 'Preparing', errorCode: 'NoError' },
    { connectorId: 1, status: 'Charging', errorCode: 'NoError' },
    { connectorId: 2, status: 'Faulted', errorCode: 'ConnectorLockFailure' }
  ];

  for (let i = 0; i < testStatuses.length; i++) {
    const { connectorId, status, errorCode } = testStatuses[i];
    
    setTimeout(() => {
      console.log(`\n📤 Updating connector ${connectorId} status to ${status}...`);
      
      try {
        // Call the updateConnectorStatus method directly
        gatewaySessionManager.updateConnectorStatus('EVBANGNA-CP001', connectorId, status, errorCode);
        console.log(`✅ Successfully updated connector ${connectorId} status to ${status}`);
      } catch (error) {
        console.error(`❌ Error updating connector ${connectorId}:`, error.message);
      }
    }, (i + 1) * 2000);
  }

  // Step 3: Close connections after testing
  setTimeout(() => {
    console.log('\n🔌 Closing connections...');
    if (userWs.readyState === WebSocket.OPEN) {
      userWs.close();
    }
    console.log('✅ Test completed!');
    process.exit(0);
  }, 12000);
}

// Run the test
testSimpleStatusNotification().catch(console.error);