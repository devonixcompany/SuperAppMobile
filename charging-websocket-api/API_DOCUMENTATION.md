# 📚 Charging WebSocket API - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [WebSocket Connection](#websocket-connection)
5. [Message Protocol](#message-protocol)
6. [API Endpoints](#api-endpoints)
7. [Message Types](#message-types)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Security](#security)
11. [Examples](#examples)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

## Overview

The Charging WebSocket API provides real-time communication between frontend applications and electric vehicle charging stations. It acts as a bridge between user-facing applications and OCPP-compliant charging infrastructure.

### Key Features

- **Real-time Communication**: WebSocket-based bidirectional messaging
- **OCPP Integration**: Seamless connectivity with OCPP 1.6 gateways
- **Authentication**: JWT-based secure authentication
- **Session Management**: Robust session handling with automatic reconnection
- **Multi-user Support**: Concurrent user connections with proper isolation
- **Live Monitoring**: Real-time status updates and meter values
- **Error Recovery**: Comprehensive error handling and automatic recovery

## Getting Started

### Prerequisites

- Node.js 18+
- WebSocket-compatible client (browser, React Native, Node.js)
- Valid JWT token from authentication service
- Access to OCPP gateway service

### Quick Start

1. **Install Dependencies**
   ```bash
   cd SuperAppMobile/charging-websocket-api
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Server**
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

4. **Verify Health**
   ```bash
   curl http://localhost:8082/health
   ```

## Authentication

### JWT Token Requirements

The API requires a valid JWT token for authentication. The token must include:

```json
{
  "userId": "user-uuid",
  "sessionId": "session-uuid",
  "iat": 1642248000,
  "exp": 1642334400
}
```

### Authentication Flow

1. Connect to WebSocket endpoint
2. Send `auth_request` message with JWT token
3. Receive `auth_response` with authentication result
4. Proceed with charging operations if authenticated

## WebSocket Connection

### Connection Details

- **URL**: `ws://localhost:8082/ws` (adjust host/port as needed)
- **Protocol**: WebSocket with JSON message format
- **Timeout**: 30 seconds for connection establishment

### Connection States

```javascript
const WebSocketStates = {
  CONNECTING: 0,    // Connection in progress
  OPEN: 1,         // Connected and ready
  CLOSING: 2,      // Connection closing
  CLOSED: 3        // Connection closed
};
```

### Reconnection Strategy

- **Automatic Reconnection**: Enabled by default
- **Backoff Strategy**: Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
- **Max Attempts**: 5 consecutive attempts before manual intervention
- **Session Preservation**: Maintains authentication across reconnections

## Message Protocol

### Message Structure

All WebSocket messages follow this standardized format:

```json
{
  "id": "unique-message-identifier",
  "type": "message-type-identifier",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    // Message-specific payload
  },
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": { /* Additional error context */ }
  }
}
```

### Required Fields

- `id`: Unique message identifier (string)
- `type`: Message type identifier (string)
- `timestamp`: ISO 8601 timestamp (string)

### Optional Fields

- `data`: Message payload (object)
- `error`: Error information (object, present only for error responses)

## API Endpoints

### HTTP Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600.123,
  "websocket": {
    "totalConnections": 5,
    "authenticatedConnections": 3,
    "totalUsers": 2,
    "gatewayConnections": 2
  }
}
```

#### API Status
```http
GET /api/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "api": "Charging WebSocket API",
    "version": "1.0.0",
    "websocketUrl": "ws://localhost:8082/ws",
    "config": {
      "heartbeatInterval": 30000,
      "sessionTimeout": 3600000,
      "gatewayUrl": "ws://localhost:8081"
    }
  }
}
```

#### Connection Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalConnections": 5,
    "authenticatedConnections": 3,
    "totalUsers": 2,
    "gatewayConnections": 2
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Message Types

### 1. Authentication Messages

#### auth_request
Initiates authentication with JWT token.

**Direction:** Client → Server

**Request:**
```json
{
  "id": "msg-001",
  "type": "auth_request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "user-uuid"
  }
}
```

**Response:**
```json
{
  "id": "msg-001-response",
  "type": "auth_response",
  "timestamp": "2024-01-15T10:30:01.000Z",
  "data": {
    "success": true,
    "userId": "user-uuid",
    "sessionId": "ws_session_abc123",
    "expiresAt": "2024-01-16T10:30:00.000Z",
    "message": "Authentication successful"
  }
}
```

### 2. Charging Control Messages

#### start_charging_request
Initiates a charging session.

**Direction:** Client → Server

**Request:**
```json
{
  "id": "msg-002",
  "type": "start_charging_request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "chargePointId": "CP_1760882403313_FAAEB99A",
    "connectorId": 1,
    "idTag": "USER_123",
    "userId": "user-uuid"
  }
}
```

**Response:**
```json
{
  "id": "msg-002-response",
  "type": "start_charging_response",
  "timestamp": "2024-01-15T10:30:02.000Z",
  "data": {
    "success": true,
    "transactionId": 12345,
    "connectorId": 1,
    "status": "Accepted",
    "message": "Charging started successfully"
  }
}
```

#### stop_charging_request
Terminates an active charging session.

**Direction:** Client → Server

**Request:**
```json
{
  "id": "msg-003",
  "type": "stop_charging_request",
  "timestamp": "2024-01-15T10:45:00.000Z",
  "data": {
    "chargePointId": "CP_1760882403313_FAAEB99A",
    "transactionId": 12345,
    "userId": "user-uuid",
    "reason": "UserStop"
  }
}
```

**Response:**
```json
{
  "id": "msg-003-response",
  "type": "stop_charging_response",
  "timestamp": "2024-01-15T10:45:02.000Z",
  "data": {
    "success": true,
    "transactionId": 12345,
    "status": "Accepted",
    "message": "Charging stopped successfully"
  }
}
```

### 3. Real-time Update Messages

#### charging_status_update
Provides real-time updates on connector status.

**Direction:** Server → Client

**Message:**
```json
{
  "id": "status-update-001",
  "type": "charging_status_update",
  "timestamp": "2024-01-15T10:31:00.000Z",
  "data": {
    "chargePointId": "CP_1760882403313_FAAEB99A",
    "connectorId": 1,
    "status": "Charging",
    "transactionId": 12345,
    "timestamp": "2024-01-15T10:31:00.000Z"
  }
}
```

#### meter_values_update
Delivers real-time metering data.

**Direction:** Server → Client

**Message:**
```json
{
  "id": "meter-update-001",
  "type": "meter_values_update",
  "timestamp": "2024-01-15T10:31:00.000Z",
  "data": {
    "chargePointId": "CP_1760882403313_FAAEB99A",
    "connectorId": 1,
    "transactionId": 12345,
    "meterValue": {
      "energyImportKWh": 15.234,
      "powerKw": 7.5,
      "voltage": 230.1,
      "current": 32.6,
      "timestamp": "2024-01-15T10:31:00.000Z",
      "stateOfCharge": 75
    }
  }
}
```

### 4. System Messages

#### heartbeat
Maintains connection liveliness.

**Direction:** Bidirectional

**Request:**
```json
{
  "id": "heartbeat-001",
  "type": "heartbeat",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Response:**
```json
{
  "id": "heartbeat-001-response",
  "type": "heartbeat",
  "timestamp": "2024-01-15T10:30:00.100Z"
}
```

## Error Handling

### Error Message Format

All error responses follow this format:

```json
{
  "id": "error-001",
  "type": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {
      "field": "value",
      "additionalContext": "..."
    }
  }
}
```

### Common Error Codes

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `NOT_AUTHENTICATED` | Client not authenticated | Send valid auth_request |
| `INVALID_TOKEN` | JWT token invalid/expired | Obtain fresh token |
| `MISSING_PARAMETERS` | Required parameters missing | Include all required fields |
| `INVALID_REQUEST` | Request format invalid | Check message structure |
| `GATEWAY_ERROR` | OCPP gateway communication failed | Check gateway status |
| `CHARGE_POINT_OFFLINE` | Charge point not connected | Verify charge point status |
| `TRANSACTION_NOT_FOUND` | Transaction ID invalid | Check active transactions |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Reduce request frequency |

### Error Recovery Strategies

1. **Authentication Errors**: Obtain fresh JWT token and re-authenticate
2. **Network Errors**: Automatic reconnection will attempt recovery
3. **Gateway Errors**: Check gateway service status and retry
4. **Validation Errors**: Correct request format and retry

## Rate Limiting

### Limits

- **Connection Rate**: 10 connections per minute per IP
- **Message Rate**: 100 messages per minute per authenticated user
- **Authentication Attempts**: 5 attempts per minute per IP

### Rate Limit Headers

When rate limits are approached, the server includes these headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642248600
```

### Backpressure Handling

Clients should implement exponential backoff when rate limited:

```javascript
async function sendMessageWithBackoff(message) {
  let attempt = 0;
  const maxAttempts = 5;
  
  while (attempt < maxAttempts) {
    try {
      return await send(message);
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await sleep(delay);
        attempt++;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retry attempts exceeded');
}
```

## Security

### Authentication

- **JWT Validation**: Signature verification and expiration checking
- **Session Management**: Automatic session timeout after inactivity
- **Token Refresh**: Clients should refresh tokens before expiration

### Authorization

- **User Isolation**: Users can only access their own charging sessions
- **Resource Validation**: Charge point access validation
- **Operation Logging**: All charging operations are logged for audit

### Transport Security

- **Production**: Use WSS (WebSocket Secure) with valid SSL certificates
- **Development**: WS acceptable with localhost environments
- **CORS**: Configurable for allowed frontend origins

### Data Protection

- **Sensitive Data**: Tokens and user credentials are never logged
- **Message Sanitization**: Input validation prevents injection attacks
- **Connection Limits**: Prevents resource exhaustion attacks

## Examples

### JavaScript/Web Client

```javascript
class ChargingWebSocketClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.ws = null;
    this.messageId = 1;
    this.pendingCalls = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    
    return new Promise((resolve, reject) => {
      this.ws.onopen = async () => {
        await this.authenticate();
        resolve();
      };
      
      this.ws.onmessage = (event) => this.handleMessage(event.data);
      this.ws.onerror = reject;
    });
  }

  async authenticate() {
    const response = await this.sendMessage('auth_request', {
      token: this.token
    });
    
    if (!response.data.success) {
      throw new Error('Authentication failed');
    }
  }

  async startCharging(chargePointId, connectorId, idTag) {
    return this.sendMessage('start_charging_request', {
      chargePointId,
      connectorId,
      idTag
    });
  }

  async stopCharging(chargePointId, transactionId) {
    return this.sendMessage('stop_charging_request', {
      chargePointId,
      transactionId
    });
  }

  async sendMessage(type, data) {
    const messageId = this.getNextMessageId();
    const message = {
      id: messageId,
      type,
      timestamp: new Date().toISOString(),
      data
    };

    return new Promise((resolve, reject) => {
      this.pendingCalls.set(messageId, { resolve, reject });
      
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(messageId);
        reject(new Error('Timeout'));
      }, 30000);

      this.ws.send(JSON.stringify(message));
      
      // Handle response in message handler
      this.pendingCalls.get(messageId).timeout = timeout;
    });
  }

  handleMessage(data) {
    const message = JSON.parse(data);
    
    // Handle response to pending call
    if (this.pendingCalls.has(message.id)) {
      const pending = this.pendingCalls.get(message.id);
      clearTimeout(pending.timeout);
      this.pendingCalls.delete(message.id);
      
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message);
      }
      return;
    }
    
    // Handle real-time updates
    switch (message.type) {
      case 'charging_status_update':
        console.log('Status update:', message.data);
        break;
      case 'meter_values_update':
        console.log('Meter values:', message.data);
        break;
    }
  }

  getNextMessageId() {
    return (this.messageId++).toString();
  }
}

// Usage
const client = new ChargingWebSocketClient('ws://localhost:8082/ws', 'your-jwt-token');

async function example() {
  try {
    await client.connect();
    
    // Start charging
    const startResponse = await client.startCharging('CP_001', 1, 'USER_123');
    console.log('Charging started:', startResponse.data);
    
    // Stop charging after 10 seconds
    setTimeout(async () => {
      const stopResponse = await client.stopCharging('CP_001', 12345);
      console.log('Charging stopped:', stopResponse.data);
    }, 10000);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

### React Native Hook

```javascript
import { useEffect, useRef, useState } from 'react';

export function useChargingWebSocket(url, token) {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [meterValues, setMeterValues] = useState(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url, token]);

  const connectWebSocket = () => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      setIsConnected(true);
      setStatus('Connected');
      authenticate();
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      setIsAuthenticated(false);
      setStatus('Disconnected');
    };
  };

  const authenticate = () => {
    ws.current.send(JSON.stringify({
      id: '1',
      type: 'auth_request',
      timestamp: new Date().toISOString(),
      data: { token }
    }));
  };

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'auth_response':
        setIsAuthenticated(message.data.success);
        break;
      case 'charging_status_update':
        setStatus(message.data.status);
        break;
      case 'meter_values_update':
        setMeterValues(message.data.meterValue);
        break;
    }
  };

  const startCharging = (chargePointId, connectorId, idTag) => {
    ws.current.send(JSON.stringify({
      id: Date.now().toString(),
      type: 'start_charging_request',
      timestamp: new Date().toISOString(),
      data: { chargePointId, connectorId, idTag }
    }));
  };

  const stopCharging = (chargePointId, transactionId) => {
    ws.current.send(JSON.stringify({
      id: Date.now().toString(),
      type: 'stop_charging_request',
      timestamp: new Date().toISOString(),
      data: { chargePointId, transactionId }
    }));
  };

  return {
    isConnected,
    isAuthenticated,
    status,
    meterValues,
    startCharging,
    stopCharging
  };
}
```

## Testing

### Unit Tests

```javascript
// Example test using Jest
describe('Charging WebSocket API', () => {
  let client;
  
  beforeEach(() => {
    client = new ChargingWebSocketClient('ws://localhost:8082/ws', 'test-token');
  });

  test('should authenticate successfully', async () => {
    await client.connect();
    await expect(client.authenticate()).resolves.not.toThrow();
  });

  test('should start charging session', async () => {
    await client.connect();
    await client.authenticate();
    
    const response = await client.startCharging('CP_001', 1, 'USER_123');
    expect(response.data.success).toBe(true);
    expect(response.data.transactionId).toBeDefined();
  });

  test('should handle authentication failure', async () => {
    const invalidClient = new ChargingWebSocketClient('ws://localhost:8082/ws', 'invalid-token');
    await invalidClient.connect();
    
    await expect(invalidClient.authenticate()).rejects.toThrow('Authentication failed');
  });
});
```

### Integration Tests

```javascript
// Example integration test
describe('Charging Flow Integration', () => {
  test('complete charging workflow', async () => {
    const client = new ChargingWebSocketClient('ws://localhost:8082/ws', 'valid-jwt-token');
    
    // Connect and authenticate
    await client.connect();
    await client.authenticate();
    
    // Start charging
    const startResponse = await client.startCharging('CP_TEST', 1, 'TEST_USER');
    expect(startResponse.data.success).toBe(true);
    const transactionId = startResponse.data.transactionId;
    
    // Wait for status updates
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Stop charging
    const stopResponse = await client.stopCharging('CP_TEST', transactionId);
    expect(stopResponse.data.success).toBe(true);
    
    client.disconnect();
  }, 30000);
});
```

### Load Testing

```javascript
// Example load test using Artillery
// artillery-config.yml
config:
  target: 'ws://localhost:8082/ws'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"

scenarios:
  - name: "Charging session simulation"
    engine: ws
    flow:
      - connect:
          target: '/ws'
      - send: '{"id":"1","type":"auth_request","timestamp":"2024-01-15T10:30:00.000Z","data":{"token":"test-token"}}'
      - think: 1
      - send: '{"id":"2","type":"start_charging_request","timestamp":"2024-01-15T10:30:01.000Z","data":{"chargePointId":"CP_001","connectorId":1,"idTag":"USER_123"}}'
      - think: 5
      - send: '{"id":"3","type":"stop_charging_request","timestamp":"2024-01-15T10:30:06.000Z","data":{"chargePointId":"CP_001","transactionId":12345}}'
      - disconnect
```

## Troubleshooting

### Common Issues

#### Connection Issues

**Problem**: Cannot establish WebSocket connection
**Symptoms**: Connection timeout, immediate disconnect, or connection refused

**Solutions**:
1. Verify server is running: `curl http://localhost:8082/health`
2. Check URL format: `ws://host:port/ws`
3. Verify firewall settings
4. Check network connectivity
5. Validate CORS configuration

#### Authentication Problems

**Problem**: Authentication consistently fails
**Symptoms**: `auth_response` with `success: false`

**Solutions**:
1. Verify JWT token is valid and not expired
2. Check JWT secret matches between services
3. Ensure token contains required claims (`userId`, `exp`)
4. Verify token format (3 parts separated by dots)

#### Charging Control Failures

**Problem**: Start/stop charging requests fail
**Symptoms**: Error responses with gateway-related error codes

**Solutions**:
1. Verify OCPP gateway is accessible
2. Check charge point connectivity
3. Validate charge point ID and connector ID
4. Ensure user is authorized for the charge point

#### Performance Issues

**Problem**: Slow responses or timeouts
**Symptoms**: Messages taking >30 seconds to respond

**Solutions**:
1. Check server resource usage (CPU, memory)
2. Monitor connection count
3. Verify network latency
4. Review gateway performance
5. Consider connection pooling

### Debug Tools

#### WebSocket Debugging

```javascript
// Enhanced logging for debugging
class DebuggingWebSocketClient extends ChargingWebSocketClient {
  connect() {
    console.log(`🔗 Connecting to ${this.url}`);
    return super.connect();
  }

  async sendMessage(type, data) {
    console.log(`📤 Sending ${type}:`, JSON.stringify(data, null, 2));
    const start = Date.now();
    
    try {
      const response = await super.sendMessage(type, data);
      const duration = Date.now() - start;
      console.log(`📥 Response received in ${duration}ms:`, JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`❌ Error after ${duration}ms:`, error.message);
      throw error;
    }
  }
}
```

#### Server Logs

```bash
# View real-time logs
tail -f logs/app.log

# Filter by error level
grep -i error logs/app.log

# Monitor connection events
grep "WebSocket" logs/app.log

# Check authentication events
grep "auth" logs/app.log
```

#### Health Monitoring

```javascript
// Health check utility
async function checkApiHealth() {
  try {
    const response = await fetch('http://localhost:8082/health');
    const health = await response.json();
    
    console.log('API Health:', health.status);
    console.log('Active Connections:', health.websocket.totalConnections);
    console.log('Authenticated Users:', health.websocket.totalUsers);
    console.log('Gateway Connections:', health.websocket.gatewayConnections);
    
    return health.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

// Periodic health monitoring
setInterval(async () => {
  const isHealthy = await checkApiHealth();
  if (!isHealthy) {
    console.warn('⚠️ API health check failed');
  }
}, 60000);
```

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Maintainer**: SuperApp Team  
**Contact**: support@superapp.com