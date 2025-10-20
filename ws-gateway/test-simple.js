const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8081/ocpp/CP007', 'ocpp1.6');

ws.on('open', function open() {
  console.log('Connected to WS-Gateway as CP007');
  
  const bootNotification = [2, "123", "BootNotification", {
    "chargePointVendor": "TestVendor",
    "chargePointModel": "TestModel"
  }];
  
  console.log('Sending BootNotification...');
  ws.send(JSON.stringify(bootNotification));
});

ws.on('message', function message(data) {
  console.log('Received:', data.toString());
  
  setTimeout(() => {
    ws.close();
  }, 1000);
});

ws.on('error', function error(err) {
  console.error('Error:', err);
});

ws.on('close', function close() {
  console.log('Connection closed');
});
