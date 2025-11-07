/**
 * Test Client for Charging WebSocket API
 * Simple command-line tool to test WebSocket functionality
 */

const WebSocket = require('ws');
const readline = require('readline');

class ChargingWebSocketTestClient {
    constructor(url, token) {
        this.url = url;
        this.token = token;
        this.ws = null;
        this.messageId = 1;
        this.pendingCalls = new Map();
        this.isConnected = false;
        this.isAuthenticated = false;
    }

    async connect() {
        console.log(`🔌 Connecting to ${this.url}`);

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                console.log('✅ Connected to WebSocket server');
                this.isConnected = true;
                resolve();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data.toString());
            });

            this.ws.on('close', (code, reason) => {
                console.log(`🔌 Disconnected: ${code} - ${reason}`);
                this.isConnected = false;
                this.isAuthenticated = false;
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });
        });
    }

    async authenticate() {
        if (!this.token) {
            throw new Error('No JWT token provided');
        }

        const response = await this.sendMessage('auth_request', { token: this.token });

        if (response.data && response.data.success) {
            this.isAuthenticated = true;
            console.log('✅ Authentication successful');
            console.log(`📝 Session ID: ${response.data.sessionId}`);
        } else {
            throw new Error(response.data?.message || 'Authentication failed');
        }
    }

    async startCharging(chargePointId, connectorId, idTag) {
        const response = await this.sendMessage('start_charging_request', {
            chargePointId,
            connectorId: parseInt(connectorId),
            idTag
        });

        if (response.data && response.data.success) {
            console.log('✅ Charging started successfully');
            console.log(`🔋 Transaction ID: ${response.data.transactionId}`);
            console.log(`📊 Status: ${response.data.status}`);
        } else {
            console.error('❌ Failed to start charging:', response.data?.message);
        }

        return response;
    }

    async stopCharging(chargePointId, transactionId) {
        const response = await this.sendMessage('stop_charging_request', {
            chargePointId,
            transactionId: parseInt(transactionId)
        });

        if (response.data && response.data.success) {
            console.log('✅ Charging stopped successfully');
            console.log(`📊 Status: ${response.data.status}`);
        } else {
            console.error('❌ Failed to stop charging:', response.data?.message);
        }

        return response;
    }

    async sendHeartbeat() {
        const response = await this.sendMessage('heartbeat', {});
        console.log('💓 Heartbeat sent');
        return response;
    }

    async sendMessage(type, data) {
        if (!this.isConnected) {
            throw new Error('Not connected to server');
        }

        const messageId = this.getNextMessageId();
        const message = {
            id: messageId,
            type: type,
            timestamp: new Date().toISOString(),
            data: data
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingCalls.delete(messageId);
                reject(new Error('Timeout waiting for response'));
            }, 30000);

            this.pendingCalls.set(messageId, { resolve, reject, timeout });

            try {
                this.ws.send(JSON.stringify(message));
                console.log(`📤 Sent ${type}:`, JSON.stringify(data, null, 2));
            } catch (error) {
                clearTimeout(timeout);
                this.pendingCalls.delete(messageId);
                reject(error);
            }
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log(`📥 Received ${message.type}:`, JSON.stringify(message, null, 2));

            // Handle response to pending call
            if (this.pendingCalls.has(message.id)) {
                const pending = this.pendingCalls.get(message.id);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pendingCalls.delete(message.id);

                    if (message.error) {
                        pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
                    } else {
                        pending.resolve(message);
                    }
                }
                return;
            }

            // Handle real-time updates
            switch (message.type) {
                case 'charging_status_update':
                    console.log('🔄 Status Update:', message.data);
                    break;
                case 'meter_values_update':
                    console.log('⚡ Meter Values:', message.data);
                    break;
                case 'error':
                    console.error('❌ Server Error:', message.error);
                    break;
            }

        } catch (error) {
            console.error('❌ Failed to parse message:', error);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.isConnected = false;
        this.isAuthenticated = false;
    }

    getNextMessageId() {
        return (this.messageId++).toString();
    }
}

// Interactive command-line interface
async function runInteractiveClient() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('🔌 Charging WebSocket API Test Client');
    console.log('=====================================\n');

    // Get configuration
    const url = await askQuestion(rl, 'WebSocket URL (ws://localhost:8082/ws): ') || 'ws://localhost:8082/ws';
    const token = await askQuestion(rl, 'JWT Token: ');

    if (!token) {
        console.log('❌ JWT token is required');
        rl.close();
        return;
    }

    // Create and connect client
    const client = new ChargingWebSocketTestClient(url, token);

    try {
        await client.connect();
        await client.authenticate();

        console.log('\n✅ Connected and authenticated!');
        console.log('Available commands:');
        console.log('  start <chargePointId> <connectorId> <idTag> - Start charging');
        console.log('  stop <chargePointId> <transactionId> - Stop charging');
        console.log('  heartbeat - Send heartbeat');
        console.log('  status - Show connection status');
        console.log('  quit - Exit');
        console.log('');

        // Command loop
        while (true) {
            const command = await askQuestion(rl, '> ');

            if (!command.trim()) continue;

            const parts = command.trim().split(' ');
            const cmd = parts[0].toLowerCase();

            try {
                switch (cmd) {
                    case 'start':
                        if (parts.length !== 4) {
                            console.log('Usage: start <chargePointId> <connectorId> <idTag>');
                            break;
                        }
                        await client.startCharging(parts[1], parts[2], parts[3]);
                        break;

                    case 'stop':
                        if (parts.length !== 3) {
                            console.log('Usage: stop <chargePointId> <transactionId>');
                            break;
                        }
                        await client.stopCharging(parts[1], parts[2]);
                        break;

                    case 'heartbeat':
                        await client.sendHeartbeat();
                        break;

                    case 'status':
                        console.log(`Connected: ${client.isConnected}`);
                        console.log(`Authenticated: ${client.isAuthenticated}`);
                        break;

                    case 'quit':
                    case 'exit':
                        console.log('👋 Goodbye!');
                        client.disconnect();
                        rl.close();
                        return;

                    default:
                        console.log('Unknown command. Available: start, stop, heartbeat, status, quit');
                }
            } catch (error) {
                console.error('❌ Error:', error.message);
            }
        }

    } catch (error) {
        console.error('❌ Failed to connect or authenticate:', error.message);
        client.disconnect();
        rl.close();
    }
}

// Quick test function
async function runQuickTest() {
    const url = process.argv[2] || 'ws://localhost:8082/ws';
    const token = process.argv[3];
    const chargePointId = process.argv[4] || 'CP_001';

    if (!token) {
        console.log('Usage: node test-client.js <url> <jwt-token> [chargePointId]');
        process.exit(1);
    }

    const client = new ChargingWebSocketTestClient(url, token);

    try {
        console.log('🚀 Running quick test...');

        // Connect and authenticate
        await client.connect();
        await client.authenticate();

        // Wait a moment
        await sleep(1000);

        // Start charging
        console.log('🔋 Testing start charging...');
        await client.startCharging(chargePointId, '1', 'TEST_USER');

        // Wait 5 seconds
        console.log('⏳ Waiting 5 seconds...');
        await sleep(5000);

        // Stop charging
        console.log('🛑 Testing stop charging...');
        await client.stopCharging(chargePointId, '12345');

        console.log('✅ Quick test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        client.disconnect();
    }
}

function askQuestion(rl, question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if running in interactive mode or quick test mode
if (process.argv.length > 1 && process.argv[1].endsWith('test-client.js')) {
    if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
        runInteractiveClient();
    } else {
        runQuickTest();
    }
}

// Export for use as module
module.exports = { ChargingWebSocketTestClient };
