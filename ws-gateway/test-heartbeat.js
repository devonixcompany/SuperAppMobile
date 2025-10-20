const WebSocket = require('ws');

const chargePointId = 'CP008';
const wsUrl = `ws://localhost:8081/ocpp/${chargePointId}`;

console.log(`Connecting to WS-Gateway as ${chargePointId}...`);

const ws = new WebSocket(wsUrl, ['ocpp1.6']);

let heartbeatInterval = null;
let heartbeatTimer = null;

ws.on('open', () => {
    console.log(`Connected to WS-Gateway as ${chargePointId}`);
    
    // Send BootNotification
    console.log('Sending BootNotification...');
    const bootNotification = [
        2, // CALL
        "boot-123", // Message ID
        "BootNotification", // Action
        {
            chargePointVendor: "TestVendor",
            chargePointModel: "TestModel"
        }
    ];
    
    ws.send(JSON.stringify(bootNotification));
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Received:', JSON.stringify(message));
    
    // Check if it's a CALLRESULT for BootNotification
    if (message[0] === 3 && message[1] === "boot-123") {
        const response = message[2];
        if (response.status === "Accepted" && response.interval) {
            heartbeatInterval = response.interval * 1000; // Convert to milliseconds
            console.log(`BootNotification accepted! Heartbeat interval: ${response.interval} seconds`);
            
            // Start sending heartbeats
            startHeartbeat();
        }
    }
    
    // Handle GetConfiguration request
    if (message[0] === 2 && message[2] === "GetConfiguration") {
        const messageId = message[1];
        const response = [
            3, // CALLRESULT
            messageId,
            {
                configurationKey: [
                    {
                        key: "NumberOfConnectors",
                        readonly: true,
                        value: "1"
                    }
                ]
            }
        ];
        console.log('Responding to GetConfiguration...');
        ws.send(JSON.stringify(response));
    }
});

function startHeartbeat() {
    console.log(`Starting heartbeat every ${heartbeatInterval / 1000} seconds...`);
    
    // Send first heartbeat after 1 second
    setTimeout(() => {
        sendHeartbeat();
        
        // Then send heartbeats at the specified interval
        heartbeatTimer = setInterval(() => {
            sendHeartbeat();
        }, heartbeatInterval);
    }, 1000);
}

function sendHeartbeat() {
    const heartbeat = [
        2, // CALL
        `heartbeat-${Date.now()}`, // Message ID
        "Heartbeat", // Action
        {} // Empty payload
    ];
    
    console.log('Sending Heartbeat...');
    ws.send(JSON.stringify(heartbeat));
}

ws.on('close', (code, reason) => {
    console.log(`Connection closed: ${code} - ${reason}`);
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
    }
});

ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

// Keep the connection open for 30 seconds to test heartbeats
setTimeout(() => {
    console.log('Test completed, closing connection...');
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
    }
    ws.close();
}, 30000);