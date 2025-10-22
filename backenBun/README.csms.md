# 🚗⚡ CSMS Backend - Charging Station Management System

A modern, scalable CSMS (Charging Station Management System) built with Bun and Elysia.js using microservices architecture.

## 🏗️ CSMS Architecture Overview

### 📋 Part 1: CSMS Core Services (Ports 3001-3004)

| Service | Port | Database | Function |
|---------|------|----------|----------|
| 🚗️ **Station Management** | 3001 | `csms_stations` | Station registration • Configuration • Location |
| 👨‍💼 **Driver Management** | 3002 | `csms_drivers` | Driver profiles • RFID tags • Membership |
| 💰 **Billing Service** | 3003 | `csms_billing` | Pricing • Invoices • Payment processing |
| 📊 **Monitoring Service** | 3004 | `csms_monitoring` | Real-time monitoring • Analytics • Alerts |

### 🔌 Part 2: OCPP Protocol Layer (Ports 4000-4001)

| Service | Port | Protocol | Function |
|---------|------|----------|---------|
| 🚗️ **OCPP Gateway** | 4000 | WebSocket | OCPP protocol handling • Connection management |
| 🔌 **Charge Point Service** | 4001 | REST | Charge point data • Transaction management |

### 🚪 Part 3: API Gateway (Port 3000)

| Service | Port | Function |
|---------|------|---------|
| 🚪 **API Gateway** | 3000 | Single entry point • Service discovery • Authentication |

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Bun (for local development)
- Node.js 18+ (optional)

### CSMS Development Setup

1. **Start CSMS services with Docker Compose:**
```bash
docker-compose -f docker-compose.csms.yml up -d
```

2. **Install dependencies for local development:**
```bash
# Install root dependencies
bun install

# Install service dependencies
cd services/station-service && bun install
cd ../driver-service && bun install
cd ../billing-service && bun install
cd ../monitoring-service && bun install
cd ../charge-point && bun install
cd ../ocpp-gateway && bun install
cd ../../gateway/api-gateway && bun install
```

### CSMS Service URLs

#### Core Services
- **API Gateway**: http://localhost:3000
- **Station Management**: http://localhost:3001
- **Driver Management**: http://localhost:3002
- **Billing Service**: http://localhost:3003
- **Monitoring Service**: http://localhost:3004

#### OCPP Services
- **OCPP Gateway**: http://localhost:4000
- **Charge Point Service**: http://localhost:4001

#### Infrastructure
- **Consul UI**: http://localhost:8500
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📡 CSMS API Endpoints

### 🚗️ Station Management (Port 3001)

- `GET /stations` - List all charging stations
- `GET /stations/:id` - Get station details
- `POST /stations` - Register new station
- `PUT /stations/:id` - Update station
- `DELETE /stations/:id` - Remove station
- `GET /connectors/station/:stationId` - Get station connectors
- `PUT /connectors/station/:stationId/:connectorId` - Update connector

### 👨‍💼 Driver Management (Port 3002)

- `GET /drivers` - List all drivers
- `GET /drivers/:id` - Get driver details
- `POST /drivers` - Register new driver
- `GET /rfid-cards` - List RFID cards
- `GET /rfid-cards/:cardId` - Get RFID card details
- `POST /rfid-cards/validate` - Validate RFID card

### 💰 Billing Service (Port 3003)

- `GET /charging-sessions` - List charging sessions
- `GET /charging-sessions/:id` - Get session details
- `POST /charging-sessions` - Create new session
- `PUT /charging-sessions/:id/complete` - Complete session
- `GET /invoices` - List invoices
- `GET /invoices/:id` - Get invoice details
- `GET /pricing/tariffs` - Get pricing tariffs
- `GET /pricing/calculate` - Calculate charging cost

### 📊 Monitoring Service (Port 3004)

- `GET /stations/status` - Get all stations status
- `GET /stations/:stationId/metrics` - Get station metrics
- `GET /alerts` - List active alerts
- `POST /alerts/:id/acknowledge` - Acknowledge alert
- `GET /analytics/dashboard` - Get dashboard analytics
- `GET /analytics/usage` - Get usage analytics
- `GET /real-time/connections` - Get real-time connections
- `GET /real-time/events` - Get real-time events

### 🔌 OCPP Gateway (Port 4000)

- `GET /health` - OCPP Gateway health
- `GET /connections` - Active charge point connections
- `GET /connections/:chargePointId` - Charge point connections
- `POST /connections/:chargePointId/send` - Send OCPP message
- `DELETE /connections/:chargePointId` - Disconnect charge point
- `WebSocket: ws://localhost:4000/ocpp?chargePointId=ID&version=1.6`

## 🧪 CSMS Testing

### Comprehensive Test Suite

Run complete architecture and compliance tests:

```bash
# Test 12 Factor compliance + Architecture + OCPP implementation
./tests/test-csms-ocpp-architecture.sh

# Start services for integration testing
docker-compose -f docker-compose.csms.yml up -d

# Wait for services to be ready
sleep 30

# Run end-to-end integration tests
./tests/test-e2e-integration.sh
```

### OCPP Simulator Test

```bash
# Run built-in OCPP simulator
bun run tools/ocpp-simulator.ts CP001 1.6

# Custom charge point ID and version
bun run tools/ocpp-simulator.ts CP001 2.0.1 ws://localhost:4000/ocpp
```

### Health Checks

```bash
# All services health
curl http://localhost:3000/services

# Individual services
curl http://localhost:3001/health  # Station Management
curl http://localhost:3002/health  # Driver Management
curl http://localhost:3003/health  # Billing Service
curl http://localhost:3004/health  # Monitoring Service
curl http://localhost:4000/health  # OCPP Gateway
curl http://localhost:4001/health  # Charge Point Service
```

### 12 Factor App Compliance

Our CSMS architecture fully complies with [12 Factor App](https://12factor.net/) principles. See detailed compliance documentation:

- [12 Factor App Compliance Guide](docs/12-factor-app-compliance.md)
- [Testing Guide](docs/testing-guide.md)

## 🗄️ CSMS Database Schema

### csms_stations Database
- **stations** - Charging station information
- **connectors** - Station connectors
- **charge_points** - Hardware charge point details

### csms_drivers Database
- **drivers** - Driver profiles and membership
- **rfid_cards** - RFID card management

### csms_billing Database
- **charging_sessions** - Charging session records
- **invoices** - Billing invoices
- **pricing_tiers** - Pricing and tariff information

### csms_monitoring Database
- **station_metrics** - Performance metrics
- **alerts** - System alerts and notifications
- **usage_analytics** - Usage statistics

### csms_charge_points Database
- **transactions** - OCPP transactions
- **meter_values** - Energy consumption data
- **ocpp_messages** - Protocol message logs

## 🔧 Configuration

### Environment Variables

Create a `.env` file for CSMS:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/csms_stations
REDIS_URL=redis://localhost:6379

# OCPP
OCPP_HEARTBEAT_INTERVAL=60
OCPP_WEBSOCKET_PORT=4000

# Service URLs
STATION_SERVICE_URL=http://localhost:3001
DRIVER_SERVICE_URL=http://localhost:3002
BILLING_SERVICE_URL=http://localhost:3003
MONITORING_SERVICE_URL=http://localhost:3004
```

## 🚀 CSMS Deployment

### Development Mode

```bash
# Start all CSMS services
docker-compose -f docker-compose.csms.yml up -d

# View logs
docker-compose -f docker-compose.csms.yml logs -f

# Stop services
docker-compose -f docker-compose.csms.yml down
```

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.csms.yml build

# Start production services
docker-compose -f docker-compose.csms.yml up -d

# Scale services
docker-compose -f docker-compose.csms.yml up -d --scale station-service=3
```

## 📊 CSMS Monitoring & Observability

### Health Monitoring

All CSMS services expose `/health` endpoints for monitoring:

```bash
# Check all services
for port in 3000 3001 3002 3003 3004 4000 4001; do
  curl -s http://localhost:$port/health | jq '.service, .message'
done
```

### Real-time Monitoring

Access monitoring dashboard at: http://localhost:3004/analytics/dashboard

### OCPP Connection Monitoring

View active charge point connections:
```bash
curl http://localhost:4000/connections | jq '.data'
```

## 🔒 CSMS Security

### Authentication
- JWT token-based API authentication
- RFID card validation for charging
- Service-to-service authentication

### Network Security
- WSS (WebSocket Secure) for OCPP connections
- API rate limiting
- CORS protection

## 🎯 CSMS Business Features

### 🚗️ Station Management
- Complete station lifecycle management
- Real-time configuration updates
- Location-based station search
- Multi-connector station support

### 👨‍💼 Driver Management
- Multi-tier membership system
- RFID card management
- Usage history tracking
- Mobile app integration

### 💰 Billing & Payment
- Flexible pricing models
- Real-time cost calculation
- Automated invoicing
- Multiple payment methods

### 📊 Monitoring & Analytics
- Real-time station monitoring
- Predictive maintenance alerts
- Usage analytics and reporting
- Business intelligence dashboard

## 📚 Documentation

- **CSMS Architecture**: `docs/csms-core-architecture.md`
- **OCPP Integration**: `docs/ocpp-integration-guide.md`
- **API Documentation**: Available via Swagger/OpenAPI

This CSMS system provides a complete solution for managing electric vehicle charging infrastructure! 🎯