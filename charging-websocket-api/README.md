# 🔌 Charging WebSocket API

A robust WebSocket API for real-time electric vehicle charging control and monitoring. This service provides a bridge between frontend applications and OCPP-compliant charging stations, enabling seamless charging session management.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Message Types](#message-types)
- [Examples](#examples)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Core Functionality
- **Real-time WebSocket Communication**: Bidirectional communication between frontend and charging stations
- **OCPP Protocol Support**: Full compatibility with OCPP 1.6 protocol
- **Authentication & Authorization**: JWT-based security with session management
- **Charging Session Control**: Start, stop, and monitor charging sessions
- **Live Status Updates**: Real-time connector status and meter value updates
- **Automatic Reconnection**: Resilient connection handling with auto-reconnect

### Advanced Features
- **Multi-User Support**: Handle multiple concurrent users with proper isolation
- **Gateway Integration**: Seamless integration with existing OCPP gateway
- **Heartbeat Monitoring**: Keep connections alive and detect disconnections
- **Error Handling**: Comprehensive error reporting and recovery mechanisms
- **Performance Monitoring**: Built-in connection statistics and health monitoring

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    OCPP     ┌─────────────────┐
│   Frontend      │◄────────────────►│  WebSocket API  │◄────────────►│  OCPP Gateway   │
│   (Mobile/Web)  │                  │                 │   Protocol   │   (ws-gateway)  │
│                 │                  │                 │              │                 │
│ - React Native  │                  │ - Authentication│              │ - Charge Points │
│ - React Web     │                  │ - Session Mgmt  │              │ - OCPP 1.6      │
│ - Native Apps   │                  │ - Message Queue │              │ - Real-time     │
└─────────────────┘                  │ - Gateway Client│              │   Communication │
                                      └─────────────────┘              └─────────────────┘
                                                │
                                                ▼
                                      ┌─────────────────┐
                                      │   Backend API   │
                                      │   (backenBun)   │
                                      │                 │
                                      │ - User Auth     │
                                      │ - Charge Points │
                                      │ - Transactions  │
                                      └─────────────────┘
```

## 🚀 Installation

### Prerequisites
- Node.js 18+ 
- TypeScript 5+
- Access to OCPP Gateway (ws-gateway service)

### Clone and Install
```bash
# Navigate to the project directory
cd SuperAppMobile/charging-websocket-api

# Install dependencies
npm install

# Build the project
npm run build

# Or install and build in one step
npm install && npm run build
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Copy the example configuration
cp .env.example .env

# Edit the configuration
nano .env
```

### Key Configuration Options

```bash
# Server Configuration
WS_API_PORT=8082              # WebSocket API server port
WS_API_HOST=localhost         # Server host binding
NODE_ENV=development          # Environment mode

# Gateway Integration
WS_GATEWAY_URL=ws://localhost:8081    # OCPP Gateway WebSocket URL
WS_GATEWAY_API_KEY=your-gateway-key   # Gateway authentication key

# Security
JWT_SECRET=your-super-secret-jwt-key  # JWT signing secret
JWT_EXPIRES_IN=24h                     # Token expiration time

# Connection Settings
HEARTBEAT_INTERVAL=30000               # Heartbeat interval (ms)
SESSION_TIMEOUT=3600000                 # Session timeout (ms)
CONNECTION_TIMEOUT=300000               # Connection timeout (ms)
MAX_CONNECTIONS=1000                    # Maximum concurrent connections

# CORS
FRONTEND_URL=http://localhost:3000     # Allowed frontend origin
```

## 📖 Usage

### Starting the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start

# Check server status
curl http://localhost:8082/health
```

### Server Response Example
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

## 🔌 API Reference

### WebSocket Connection

**Endpoint:** `ws://localhost:8082/ws`

**Protocol:** WebSocket with JSON message format

### Message Format

All WebSocket messages follow this structure:
```json
{
  "id": "unique-message-id",
  "type": "message-type",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": { /* message-specific data */ },
  "error": { /* optional error information */ }
}
```

## 📨 Message Types

### Authentication

#### 1. Authenticate Request
```json
{
  "id": "msg-001",
  "type": "auth_request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "token": "jwt-token-here",
    "userId": "user-123"
  }
}
```

#### 2. Authenticate Response
```json
{
  "id": "msg-001-response",
  "type": "auth_response",
  "timestamp": "2024-01-15T10:30:01.000Z",
  "data": {
    "success": true,
    "userId": "user-123",
    "sessionId": "ws_session_abc123",
    "expiresAt": "2024-01-16T10:30:00.000Z",
    "message": "Authentication successful"
  }
}
```

### Charging Control

#### 3. Start Charging Request
```json
{
  "id": "msg-002",
  "type": "start_charging_request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "chargePointId": "CP_1760882403313_FAAEB99A",
    "connectorId": 1,
    "idTag": "USER_123",
    "userId": "user-123"
  }
}
```

#### 4. Start Charging Response
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

#### 5. Stop Charging Request
```json
{
  "id": "msg-003",
  "type": "stop_charging_request",
  "timestamp": "2024-01-15T10:45:00.000Z",
  "data": {
    "chargePointId": "CP_1760882403313_FAAEB99A",
    "transactionId": 12345,
    "userId": "user-123",
    "reason": "UserStop"
  }
}
```

#### 6. Stop Charging Response
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

### Real-time Updates

#### 7. Charging Status Update
```json
{
  "id": "update-001",
  "type": "charging_status_update",
  "timestamp": "2024-01-15T10:31:00.000Z",
  "data": {
    "chargePointId": "CP_1760882403313_FAAEB99A",
    "connectorId": 1,
    "status": "Charging",
    "transactionId": 12345
  }
}
```

#### 8. Meter Values Update
```json
{
  "id": "meter-001",
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

### System Messages

#### 9. Heartbeat
```json
{
  "id": "heartbeat-001",
  "type": "heartbeat",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### 10. Error Message
```json
{
  "id": "error-001",
  "type": "error",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": {
    "code": "NOT_AUTHENTICATED",
    "message": "Client not authenticated",
    "details": {
      "requiredAction": "Send auth_request with valid JWT token"
    }
  }
}
```

## 💻 Examples

### Frontend Implementation (JavaScript)

```javascript
// Simple WebSocket client for charging control
class ChargingClient {
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
        // Authenticate immediately after connection
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

// Usage example
const client = new ChargingClient('ws://localhost:8082/ws', 'your-jwt-token');

async function example() {
  try {
    await client.connect();
    
    // Start charging
    const startResponse = await client.startCharging('CP_001', 1, 'USER_123');
    console.log('Charging started:', startResponse);
    
    // Stop charging (after 10 seconds)
    setTimeout(async () => {
      const stopResponse = await client.stopCharging('CP_001', 12345);
      console.log('Charging stopped:', stopResponse);
    }, 10000);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

### React Native Integration

```javascript
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';

const ChargingControl = ({ token, chargePointId }) => {
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    ws.current = new WebSocket('ws://localhost:8082/ws');

    ws.current.onopen = () => {
      setIsConnected(true);
      setStatus('Connected');
      // Authenticate
      ws.current.send(JSON.stringify({
        id: '1',
        type: 'auth_request',
        timestamp: new Date().toISOString(),
        data: { token }
      }));
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      setIsCharging(false);
      setStatus('Disconnected');
    };
  };

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'charging_status_update':
        setStatus(message.data.status);
        setIsCharging(message.data.status === 'Charging');
        break;
      case 'start_charging_response':
        if (message.data.success) {
          Alert.alert('Success', 'Charging started!');
        } else {
          Alert.alert('Error', message.data.message);
        }
        break;
      case 'stop_charging_response':
        if (message.data.success) {
          Alert.alert('Success', 'Charging stopped!');
        } else {
          Alert.alert('Error', message.data.message);
        }
        break;
    }
  };

  const startCharging = () => {
    ws.current.send(JSON.stringify({
      id: Date.now().toString(),
      type: 'start_charging_request',
      timestamp: new Date().toISOString(),
      data: {
        chargePointId,
        connectorId: 1,
        idTag: 'USER_123'
      }
    }));
  };

  const stopCharging = () => {
    ws.current.send(JSON.stringify({
      id: Date.now().toString(),
      type: 'stop_charging_request',
      timestamp: new Date().toISOString(),
      data: {
        chargePointId,
        transactionId: 12345 // Get from actual session
      }
    }));
  };

  return (
    <View>
      <Text>Status: {status}</Text>
      <Text>Connected: {isConnected ? 'Yes' : 'No'}</Text>
      <Button 
        title="Start Charging" 
        onPress={startCharging}
        disabled={!isConnected || isCharging}
      />
      <Button 
        title="Stop Charging" 
        onPress={stopCharging}
        disabled={!isConnected || !isCharging}
      />
    </View>
  );
};

export default ChargingControl;
```

## 🛠️ Development

### Project Structure
```
src/
├── handlers/          # Message handlers
├── services/          # Core services
│   ├── auth.ts       # Authentication service
│   ├── config.ts     # Configuration management
│   ├── connectionManager.ts  # WebSocket connection manager
│   └── gatewayClient.ts      # OCPP Gateway client
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── index.ts          # Main server entry point
```

### Available Scripts

```bash
# Development
npm run dev           # Start with auto-reload

# Building
npm run build         # Compile TypeScript to JavaScript
npm run clean         # Clean build output

# Testing
npm test             # Run tests
npm run test:watch   # Watch mode testing

# Code Quality
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix linting issues
```

### Running Tests

```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export WS_API_PORT=8082
   export WS_API_HOST=0.0.0.0
   export JWT_SECRET=your-secure-production-secret
   ```

2. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

3. **Process Management (PM2)**
   ```bash
   # Install PM2
   npm install -g pm2

   # Start with PM2
   pm2 start ecosystem.config.js

   # Save PM2 configuration
   pm2 save

   # Setup PM2 startup script
   pm2 startup
   ```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8082

CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  charging-websocket-api:
    build: .
    ports:
      - "8082:8082"
    environment:
      - NODE_ENV=production
      - WS_API_PORT=8082
      - WS_GATEWAY_URL=ws://ws-gateway:8081
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - ws-gateway
    restart: unless-stopped

  ws-gateway:
    image: your-ocpp-gateway-image
    ports:
      - "8081:8081"
    restart: unless-stopped
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Connection Refused
**Problem**: Cannot connect to WebSocket server
**Solution**: 
- Check if server is running: `curl http://localhost:8082/health`
- Verify port configuration in `.env`
- Check firewall settings

#### 2. Authentication Fails
**Problem**: JWT token rejection
**Solution**:
- Verify JWT secret matches between services
- Check token expiration
- Ensure token is properly formatted

#### 3. Gateway Connection Issues
**Problem**: Cannot communicate with OCPP gateway
**Solution**:
- Check gateway URL configuration
- Verify gateway is running
- Check network connectivity
- Review gateway API key

#### 4. High Memory Usage
**Problem**: Memory leak over time
**Solution**:
- Monitor connection count
- Check for disconnected clients
- Review session cleanup
- Consider connection limits

### Debug Mode

Enable debug logging:
```bash
# Set environment variable
export DEBUG_WEBSOCKET=true

# Or add to .env
DEBUG_WEBSOCKET=true
```

### Health Checks

```bash
# Check API health
curl http://localhost:8082/health

# Check connection statistics
curl http://localhost:8082/api/stats

# Monitor WebSocket connections
watch -n 1 'curl -s http://localhost:8082/api/stats | jq .data'
```

### Logs and Monitoring

```bash
# View application logs
tail -f logs/app.log

# Monitor errors
grep -i error logs/app.log

# Check connection events
grep "WebSocket" logs/app.log
```

## 📝 Logging

The service provides comprehensive logging:

```javascript
// Log levels: error, warn, info, debug
logger.info('Client connected', { clientId, userId });
logger.error('Authentication failed', { error: err.message });
logger.debug('Message received', { type, data });
```

## 🔒 Security Considerations

1. **JWT Security**
   - Use strong secrets
   - Set appropriate expiration times
   - Rotate secrets regularly

2. **WebSocket Security**
   - Implement rate limiting
   - Validate all input
   - Monitor connection patterns

3. **Network Security**
   - Use HTTPS/WSS in production
   - Implement proper CORS policies
   - Configure firewall rules

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Maintainer**: SuperApp Team