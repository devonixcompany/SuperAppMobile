# OCPP + CSMS Integration Guide

## 🔌 OCPP (Open Charge Point Protocol) Integration

This guide explains how to integrate OCPP with the SuperApp microservices architecture.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Charge Point  │◄──►│  OCPP Gateway   │◄──►│  API Gateway    │
│   (Hardware)    │    │  (WebSocket)    │    │   (REST API)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Charge Point    │
                       │ Service         │
                       │ (Business Logic)│
                       └─────────────────┘
```

## 📋 Supported OCPP Versions

- **OCPP 1.6** - Legacy protocol (JSON over WebSocket)
- **OCPP 2.0.1** - Modern protocol (JSON over WebSocket)
- **OCPP 2.1** - Latest version (JSON over WebSocket)

## 🚀 Quick Start

### 1. Start Services

```bash
# Start all microservices
docker-compose up -d

# Or start specific OCPP services
docker-compose up ocpp-gateway charge-point
```

### 2. Test with OCPP Simulator

```bash
# Run the built-in OCPP simulator
bun run tools/ocpp-simulator.ts SIM001 1.6

# Custom charge point ID and version
bun run tools/ocpp-simulator.ts CP001 2.0.1 ws://localhost:4000/ocpp
```

### 3. Verify Connection

```bash
# Check OCPP Gateway health
curl http://localhost:4000/health

# View active connections
curl http://localhost:4000/connections
```

## 🔌 WebSocket Connection

### Connection URL Format

```
ws://localhost:4000/ocpp?chargePointId=YOUR_ID&version=1.6
```

### Parameters

- `chargePointId`: Unique identifier for the charge point
- `version`: OCPP version (1.6, 2.0.1, or 2.1)

### Example Connection (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:4000/ocpp?chargePointId=CP001&version=1.6');

ws.onopen = () => {
  console.log('Connected to OCPP server');

  // Send boot notification
  const bootNotification = [2, "1", "BootNotification", {
    chargePointVendor: "ExampleVendor",
    chargePointModel: "ExampleModel",
    chargePointSerialNumber: "CP001-001"
  }];

  ws.send(JSON.stringify(bootNotification));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## 📡 OCPP Message Format

### CALL Message (Request)

```json
[2, "messageId", "ActionName", { payload }]
```

### CALL_RESULT Message (Response)

```json
[3, "messageId", { responsePayload }]
```

### CALL_ERROR Message (Error)

```json
[4, "messageId", "ErrorCode", "ErrorDescription", { errorDetails }]
```

## 🔧 Supported OCPP 1.6 Messages

### Core Messages

| Message | Description | Status |
|---------|-------------|--------|
| `BootNotification` | Charge point registration | ✅ Implemented |
| `Heartbeat` | Keep-alive ping | ✅ Implemented |
| `Authorize` | RFID tag authorization | ✅ Implemented |
| `StartTransaction` | Begin charging session | ✅ Implemented |
| `StopTransaction` | End charging session | ✅ Implemented |
| `StatusNotification` | Connector status updates | 🔄 Planned |
| `MeterValues` | Energy consumption data | 🔄 Planned |

### Remote Control Messages

| Message | Description | Status |
|---------|-------------|--------|
| `RemoteStartTransaction` | Remote start charging | 🔄 Planned |
| `RemoteStopTransaction` | Remote stop charging | 🔄 Planned |
| `UnlockConnector` | Unlock connector | 🔄 Planned |
| `Reset` | Reset charge point | 🔄 Planned |
| `ChangeAvailability` | Change connector status | 🔄 Planned |
| `ClearCache` | Clear authorization cache | 🔄 Planned |

### Configuration Messages

| Message | Description | Status |
|---------|-------------|--------|
| `GetConfiguration` | Read configuration values | 🔄 Planned |
| `ChangeConfiguration` | Update configuration | 🔄 Planned |
| `GetLocalListVersion` | Get authorization list version | 🔄 Planned |
| `SendLocalList` | Update authorization list | 🔄 Planned |

## 🏢 Service Endpoints

### OCPP Gateway Service (Port 4000)

- **Health Check**: `GET /health`
- **Active Connections**: `GET /connections`
- **Connection Statistics**: `GET /statistics`
- **Send Message**: `POST /connections/{chargePointId}/send`
- **Disconnect Charge Point**: `DELETE /connections/{chargePointId}`

### Charge Point Service (Port 4001)

- **Health Check**: `GET /health`
- **List Charge Points**: `GET /charge-points`
- **Get Charge Point**: `GET /charge-points/{id}`
- **Create Charge Point**: `POST /charge-points`
- **List Transactions**: `GET /transactions`
- **Get Transaction**: `GET /transactions/{id}`

## 🗄️ Database Schema

### Charge Points Table

```sql
CREATE TABLE charge_points (
  id VARCHAR(255) PRIMARY KEY,
  charge_point_id VARCHAR(255) UNIQUE NOT NULL,
  vendor VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  serial_number VARCHAR(255),
  firmware_version VARCHAR(255),
  ocpp_version VARCHAR(10) DEFAULT '1.6',
  status VARCHAR(50) DEFAULT 'DISCONNECTED',
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Connectors Table

```sql
CREATE TABLE connectors (
  id VARCHAR(255) PRIMARY KEY,
  charge_point_id VARCHAR(255) NOT NULL,
  connector_id INTEGER NOT NULL,
  type VARCHAR(50) DEFAULT 'TYPE_2',
  status VARCHAR(50) DEFAULT 'AVAILABLE',
  max_current INTEGER DEFAULT 32,
  max_power INTEGER DEFAULT 22000,
  FOREIGN KEY (charge_point_id) REFERENCES charge_points(id)
);
```

### Transactions Table

```sql
CREATE TABLE transactions (
  id VARCHAR(255) PRIMARY KEY,
  transaction_id INTEGER UNIQUE NOT NULL,
  charge_point_id VARCHAR(255) NOT NULL,
  connector_id INTEGER NOT NULL,
  id_tag VARCHAR(255) NOT NULL,
  start_timestamp TIMESTAMP NOT NULL,
  stop_timestamp TIMESTAMP,
  start_meter_value INTEGER NOT NULL,
  stop_meter_value INTEGER,
  energy_consumed DECIMAL(10,3),
  status VARCHAR(50) DEFAULT 'STARTED',
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (charge_point_id) REFERENCES charge_points(id)
);
```

## 🧪 Testing

### Unit Tests

```bash
# Run OCPP Gateway tests
cd services/ocpp-gateway
bun test

# Run Charge Point Service tests
cd services/charge-point
bun test
```

### Integration Tests

```bash
# Test OCPP message flow
bun run tools/test-ocpp-flow.ts

# Test multiple charge points
bun run tools/multi-cp-simulator.ts
```

### End-to-End Tests

```bash
# Start full stack
docker-compose up -d

# Run end-to-end test suite
bun run tests/e2e/ocpp-e2e.test.ts
```

## 🔍 Monitoring & Debugging

### Logs

```bash
# View OCPP Gateway logs
docker-compose logs -f ocpp-gateway

# View Charge Point Service logs
docker-compose logs -f charge-point

# View all logs
docker-compose logs -f
```

### Metrics

The system provides the following metrics:

- Active charge point connections
- Message counts by type
- Transaction statistics
- Error rates
- Response times

Access metrics at: `GET /statistics`

### Health Checks

```bash
# OCPP Gateway
curl http://localhost:4000/health

# Charge Point Service
curl http://localhost:4001/health

# Overall system
curl http://localhost:3000/services
```

## 🚨 Error Handling

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `NotImplemented` | Action not supported | Check OCPP version compatibility |
| `InternalError` | Server error | Check logs and retry |
| `ProtocolError` | Invalid message format | Validate message structure |
| `SecurityError` | Authentication failed | Check credentials |

### Error Response Format

```json
[4, "messageId", "ErrorCode", "Error description", {}]
```

## 🔒 Security Considerations

### Authentication

- Charge points authenticate via `BootNotification`
- ID tags validated via `Authorize` message
- API endpoints protected via JWT tokens

### Security Best Practices

1. **Use WSS (WebSocket Secure)** in production
2. **Validate all incoming messages**
3. **Rate limit connections and messages**
4. **Monitor for suspicious activity**
5. **Regular firmware updates for charge points**

## 🚀 Deployment

### Production Configuration

```yaml
# docker-compose.prod.yml
services:
  ocpp-gateway:
    image: superapp/ocpp-gateway:latest
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=info
    deploy:
      replicas: 3
```

### Scaling

- **Horizontal scaling**: Multiple OCPP Gateway instances
- **Load balancing**: WebSocket-aware load balancer
- **Session affinity**: Sticky sessions for charge point connections

## 📚 Additional Resources

- [OCPP 1.6 Specification](https://www.openchargealliance.org/protocols/ocpp-1-6/)
- [OCPP 2.0.1 Specification](https://www.openchargealliance.org/protocols/ocpp-2-0-1/)
- [WebSocket API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [SuperApp Architecture Guide](./microservices-architecture.md)

## 🆘 Troubleshooting

### Common Issues

1. **Connection refused**
   - Check if OCPP Gateway is running
   - Verify port 4000 is accessible

2. **Message parsing errors**
   - Validate JSON format
   - Check OCPP message structure

3. **Authentication failures**
   - Verify charge point credentials
   - Check `BootNotification` payload

4. **High latency**
   - Check network connectivity
   - Monitor system resources

### Debug Mode

Enable debug logging:

```bash
# Set log level to debug
export LOG_LEVEL=debug

# Run service with verbose output
bun run --inspect src/index.ts
```