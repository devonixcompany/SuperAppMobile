# 🧪 CSMS Testing Guide

Comprehensive testing guide for CSMS (Charging Station Management System) + OCPP + Microservices Architecture with 12 Factor App compliance.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture Testing](#architecture-testing)
- [Integration Testing](#integration-testing)
- [OCPP Protocol Testing](#ocpp-protocol-testing)
- [12 Factor Compliance Testing](#12-factor-compliance-testing)
- [Performance Testing](#performance-testing)
- [Manual Testing](#manual-testing)

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Bun runtime installed
- curl and jq for API testing

### Run All Tests

```bash
# 1. Architecture and compliance tests (without starting services)
./tests/test-csms-ocpp-architecture.sh

# 2. Start CSMS services
docker-compose -f docker-compose.csms.yml up -d

# 3. Wait for services to be ready (30-60 seconds)
sleep 30

# 4. Run integration tests
./tests/test-e2e-integration.sh
```

---

## 🏗️ Architecture Testing

### Test Suite: `test-csms-ocpp-architecture.sh`

This test suite validates:
- 12 Factor App compliance
- Microservices architecture
- OCPP protocol implementation
- CSMS core services
- Documentation completeness
- Infrastructure setup

**Run the test:**

```bash
cd /home/runner/work/SuperAppMobile/SuperAppMobile/backenBun
./tests/test-csms-ocpp-architecture.sh
```

**What it tests:**

1. **12 Factor Compliance**
   - ✅ Factor I: Codebase (Git repository)
   - ✅ Factor II: Dependencies (package.json)
   - ✅ Factor III: Config (Environment variables)
   - ✅ Factor IV: Backing services (PostgreSQL, Redis)
   - ✅ Factor V: Build/Release/Run separation
   - ✅ Factor VI: Stateless processes
   - ✅ Factor VII: Port binding
   - ✅ Factor VIII: Concurrency support
   - ✅ Factor IX: Disposability
   - ✅ Factor X: Dev/Prod parity
   - ✅ Factor XI: Logs as streams
   - ✅ Factor XII: Admin processes

2. **Microservices Architecture**
   - Service independence
   - Database isolation
   - API Gateway presence

3. **OCPP Implementation**
   - OCPP Gateway service
   - Charge Point service
   - OCPP simulator tool

4. **CSMS Services**
   - Station Management
   - Driver Management
   - Billing Service
   - Monitoring Service

**Expected Output:**

```
========================================
Test Summary
========================================
Total Tests: 25
Passed: 25
Failed: 0

🎉 All tests passed! CSMS architecture is compliant.
```

---

## 🔗 Integration Testing

### Test Suite: `test-e2e-integration.sh`

End-to-end integration tests for complete charging session workflow.

**Run the test:**

```bash
# Start services first
docker-compose -f docker-compose.csms.yml up -d

# Wait for services to be ready
sleep 30

# Run integration tests
./tests/test-e2e-integration.sh
```

**Test Scenarios:**

### 1. Complete EV Charging Session

```
1. Register charging station → Station Service (3001)
2. Register driver → Driver Service (3002)
3. Validate RFID card → Driver Service (3002)
4. Start charging session → Billing Service (3003)
5. Monitor metrics → Monitoring Service (3004)
6. Complete session → Billing Service (3003)
7. Generate invoice → Billing Service (3003)
```

### 2. OCPP WebSocket Communication

```
- Test OCPP Gateway connection (4000)
- Verify charge point connections
- Test OCPP message handling
```

### 3. Microservices Communication

```
- API Gateway service discovery (3000)
- Cross-service data flow
- Service-to-service communication
```

### 4. 12 Factor Practical Testing

```
- Horizontal scaling capability
- Stateless process validation
- Log streaming verification
```

---

## ⚡ OCPP Protocol Testing

### OCPP Simulator

The built-in OCPP simulator tests the complete OCPP protocol implementation.

**Basic Usage:**

```bash
# OCPP 1.6 test
bun run tools/ocpp-simulator.ts CP001 1.6

# OCPP 2.0.1 test
bun run tools/ocpp-simulator.ts CP001 2.0.1

# Custom WebSocket URL
bun run tools/ocpp-simulator.ts CP001 1.6 ws://localhost:4000/ocpp
```

**What it tests:**

1. **Connection Establishment**
   - WebSocket connection to OCPP Gateway
   - Protocol handshake

2. **OCPP Messages**
   - BootNotification
   - Heartbeat
   - StatusNotification
   - Authorize (RFID)
   - StartTransaction
   - MeterValues
   - StopTransaction

3. **Protocol Versions**
   - OCPP 1.6
   - OCPP 2.0.1
   - OCPP 2.1 (if supported)

**Manual OCPP Testing:**

```bash
# 1. Start OCPP Gateway
docker-compose -f docker-compose.csms.yml up -d ocpp-gateway

# 2. Check connections
curl http://localhost:4000/connections

# 3. Run simulator
bun run tools/ocpp-simulator.ts TEST-CP001 1.6

# 4. Monitor logs
docker-compose -f docker-compose.csms.yml logs -f ocpp-gateway

# 5. Verify connection
curl http://localhost:4000/connections/TEST-CP001
```

---

## 📏 12 Factor Compliance Testing

### Manual Verification

#### Factor I: Codebase

```bash
# Verify single codebase
git remote -v
git branch -a
git log --oneline --graph
```

#### Factor II: Dependencies

```bash
# Check explicit dependencies
cat services/station-service/package.json
cat services/ocpp-gateway/package.json

# Install dependencies
cd services/station-service && bun install
```

#### Factor III: Config

```bash
# View configuration
docker-compose -f docker-compose.csms.yml config

# Test environment variables
docker-compose -f docker-compose.csms.yml config | grep "DATABASE_URL\|REDIS_URL"
```

#### Factor IV: Backing Services

```bash
# Test database connection swapping
DATABASE_URL=postgresql://user:pass@newhost:5432/db

# Test Redis connection swapping
REDIS_URL=redis://newhost:6379
```

#### Factor V: Build, Release, Run

```bash
# Build stage
make build

# Release stage (tagging)
docker tag superapp/station-service:latest superapp/station-service:v1.0.0

# Run stage
docker-compose -f docker-compose.csms.yml up -d
```

#### Factor VI: Processes (Stateless)

```bash
# Test horizontal scaling
docker-compose -f docker-compose.csms.yml up -d --scale station-service=3

# Verify stateless behavior
curl http://localhost:3001/stations
curl http://localhost:3001/stations  # Should return same data
```

#### Factor VII: Port Binding

```bash
# Test all service ports
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Station Service
curl http://localhost:3002/health  # Driver Service
curl http://localhost:3003/health  # Billing Service
curl http://localhost:3004/health  # Monitoring Service
curl http://localhost:4000/health  # OCPP Gateway
curl http://localhost:4001/health  # Charge Point
```

#### Factor VIII: Concurrency

```bash
# Scale individual services
docker-compose -f docker-compose.csms.yml up -d --scale station-service=3
docker-compose -f docker-compose.csms.yml up -d --scale billing-service=2

# Check scaled instances
docker-compose -f docker-compose.csms.yml ps
```

#### Factor IX: Disposability

```bash
# Test fast startup
time docker-compose -f docker-compose.csms.yml up -d station-service

# Test graceful shutdown
docker-compose -f docker-compose.csms.yml stop station-service
docker-compose -f docker-compose.csms.yml logs station-service | grep "shutdown"

# Test health checks
docker inspect --format='{{json .State.Health}}' <container_id> | jq
```

#### Factor X: Dev/Prod Parity

```bash
# Development environment
NODE_ENV=development docker-compose up -d

# Production environment
NODE_ENV=production docker-compose up -d

# Compare configurations
diff <(docker-compose config) <(NODE_ENV=production docker-compose config)
```

#### Factor XI: Logs

```bash
# View all logs
docker-compose -f docker-compose.csms.yml logs

# Stream logs
docker-compose -f docker-compose.csms.yml logs -f

# Filter logs by service
docker-compose -f docker-compose.csms.yml logs station-service

# Tail logs
docker-compose -f docker-compose.csms.yml logs --tail=100 -f
```

#### Factor XII: Admin Processes

```bash
# Database migrations
docker-compose exec station-service bun run prisma migrate deploy

# Database seeding
docker-compose exec station-service bun run prisma db seed

# OCPP simulator (one-off)
bun run tools/ocpp-simulator.ts CP001 1.6

# Health check (one-off)
curl http://localhost:3001/health | jq
```

---

## 🚀 Performance Testing

### Load Testing

```bash
# Install apache bench (if not installed)
sudo apt-get install apache2-utils

# Test Station Service
ab -n 1000 -c 10 http://localhost:3001/health

# Test Billing Service
ab -n 1000 -c 10 http://localhost:3003/health

# Test API Gateway
ab -n 1000 -c 10 http://localhost:3000/services
```

### Scalability Testing

```bash
# Scale up
docker-compose -f docker-compose.csms.yml up -d --scale station-service=5

# Monitor resource usage
docker stats

# Test load distribution
for i in {1..100}; do
  curl -s http://localhost:3001/health | jq '.service'
done | sort | uniq -c
```

### Stress Testing

```bash
# Concurrent connections
for i in {1..50}; do
  curl -s http://localhost:3001/stations &
done
wait

# Monitor logs
docker-compose -f docker-compose.csms.yml logs --tail=100
```

---

## 🛠️ Manual Testing

### Service Health Checks

```bash
# Check all services
for port in 3000 3001 3002 3003 3004 4000 4001; do
  echo "Testing port $port..."
  curl -s http://localhost:$port/health | jq
done
```

### API Testing

#### Station Management (Port 3001)

```bash
# List stations
curl http://localhost:3001/stations | jq

# Get specific station
curl http://localhost:3001/stations/ST001 | jq

# Create station
curl -X POST http://localhost:3001/stations \
  -H "Content-Type: application/json" \
  -d '{
    "stationId": "ST001",
    "name": "Test Station",
    "location": {"lat": 13.7563, "lng": 100.5018}
  }' | jq
```

#### Driver Management (Port 3002)

```bash
# List drivers
curl http://localhost:3002/drivers | jq

# Validate RFID
curl -X POST http://localhost:3002/rfid-cards/validate \
  -H "Content-Type: application/json" \
  -d '{"cardId": "RFID-001"}' | jq
```

#### Billing Service (Port 3003)

```bash
# List charging sessions
curl http://localhost:3003/charging-sessions | jq

# Get pricing
curl http://localhost:3003/pricing/tariffs | jq

# Calculate cost
curl "http://localhost:3003/pricing/calculate?energy=10.5" | jq
```

#### Monitoring Service (Port 3004)

```bash
# Dashboard analytics
curl http://localhost:3004/analytics/dashboard | jq

# Station metrics
curl http://localhost:3004/stations/ST001/metrics | jq

# Real-time events
curl http://localhost:3004/real-time/events | jq
```

#### OCPP Gateway (Port 4000)

```bash
# Active connections
curl http://localhost:4000/connections | jq

# Specific charge point
curl http://localhost:4000/connections/CP001 | jq
```

---

## 📊 Test Coverage Summary

| Test Category | Coverage | Tool |
|---------------|----------|------|
| 12 Factor Compliance | ✅ 100% | `test-csms-ocpp-architecture.sh` |
| Microservices Architecture | ✅ 100% | `test-csms-ocpp-architecture.sh` |
| OCPP Protocol | ✅ Full | `tools/ocpp-simulator.ts` |
| CSMS Services | ✅ All services | `test-e2e-integration.sh` |
| Integration | ✅ End-to-end | `test-e2e-integration.sh` |
| Documentation | ✅ Complete | Architecture tests |
| Infrastructure | ✅ Docker/Compose | Configuration tests |

---

## 🎯 Best Practices

### Before Running Tests

1. **Clean environment**
   ```bash
   docker-compose -f docker-compose.csms.yml down -v
   ```

2. **Build fresh images**
   ```bash
   make build
   ```

3. **Start services**
   ```bash
   docker-compose -f docker-compose.csms.yml up -d
   ```

4. **Wait for readiness**
   ```bash
   sleep 30
   ```

### During Testing

1. **Monitor logs**
   ```bash
   docker-compose -f docker-compose.csms.yml logs -f
   ```

2. **Check resource usage**
   ```bash
   docker stats
   ```

3. **Verify service health**
   ```bash
   docker-compose -f docker-compose.csms.yml ps
   ```

### After Testing

1. **View test results**
   ```bash
   cat test-results.log
   ```

2. **Clean up**
   ```bash
   docker-compose -f docker-compose.csms.yml down
   ```

3. **Review logs**
   ```bash
   docker-compose -f docker-compose.csms.yml logs > full-logs.txt
   ```

---

## 🔧 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose -f docker-compose.csms.yml logs

# Rebuild
docker-compose -f docker-compose.csms.yml build --no-cache

# Restart
docker-compose -f docker-compose.csms.yml restart
```

### Port Conflicts

```bash
# Check port usage
lsof -i :3001
lsof -i :4000

# Change ports in docker-compose.csms.yml
```

### Database Connection Issues

```bash
# Check database
docker-compose -f docker-compose.csms.yml exec postgres psql -U postgres

# Reset database
docker-compose -f docker-compose.csms.yml down -v
docker-compose -f docker-compose.csms.yml up -d postgres
```

---

## 📚 Additional Resources

- [12 Factor App Compliance Guide](./12-factor-app-compliance.md)
- [CSMS Architecture Documentation](./csms-core-architecture.md)
- [OCPP Integration Guide](./ocpp-integration-guide.md)
- [Main README](../README.csms.md)

---

**🎉 Happy Testing!** Your CSMS + OCPP + Microservices architecture is production-ready! 🚀
