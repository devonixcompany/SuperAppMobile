# 🚀 CSMS Quick Reference Guide

Quick reference for testing CSMS + OCPP + Microservices Architecture with 12 Factor App compliance.

## ⚡ Quick Commands

### Start CSMS System

```bash
# Start all CSMS services
npm run dev

# Or using docker compose directly
docker compose -f docker-compose.csms.yml up -d
```

### Run Tests

```bash
# Test architecture and 12 Factor compliance (no services needed)
npm run test:architecture

# Run integration tests (services must be running)
npm run test:integration

# Run all tests (starts services automatically)
npm run test:all

# Test OCPP protocol with simulator
npm run test:simulator
```

### Health Checks

```bash
# Check all services via API Gateway
npm run health:check

# Or manually check each service
curl http://localhost:3001/health  # Station Service
curl http://localhost:3002/health  # Driver Service
curl http://localhost:3003/health  # Billing Service
curl http://localhost:3004/health  # Monitoring Service
curl http://localhost:4000/health  # OCPP Gateway
```

### View Logs

```bash
# All services
npm run logs

# Specific service
docker compose -f docker-compose.csms.yml logs -f station-service
```

### Stop Services

```bash
# Stop all services
npm run stop

# Stop and remove volumes
npm run clean
```

---

## 📊 Testing Checklist

### ✅ Before Running Tests

1. **Ensure Docker is running**
   ```bash
   docker --version
   docker compose version
   ```

2. **Check available ports**
   ```bash
   lsof -i :3000 -i :3001 -i :3002 -i :3003 -i :3004 -i :4000
   ```

3. **Clean previous state (optional)**
   ```bash
   npm run clean
   ```

### ✅ Architecture Tests (Without Services)

```bash
# Test 12 Factor compliance
./tests/test-csms-ocpp-architecture.sh

# Expected: 27/29 tests pass
# - Tests microservices structure
# - Validates 12 Factor principles
# - Checks OCPP implementation
# - Verifies documentation
```

**What it validates:**
- ✅ 12 Factor App compliance (all factors)
- ✅ Microservices architecture
- ✅ OCPP protocol implementation
- ✅ Service structure and organization
- ✅ Documentation completeness

### ✅ Integration Tests (With Running Services)

```bash
# 1. Start services
npm run dev

# 2. Wait for services to be ready
sleep 30

# 3. Run integration tests
./tests/test-e2e-integration.sh
```

**What it tests:**
- ✅ Complete EV charging session flow
- ✅ OCPP WebSocket communication
- ✅ Microservices integration
- ✅ 12 Factor principles in practice

### ✅ OCPP Protocol Testing

```bash
# Test OCPP 1.6
bun run tools/ocpp-simulator.ts CP001 1.6

# Test OCPP 2.0.1
bun run tools/ocpp-simulator.ts CP002 2.0.1

# Custom WebSocket URL
bun run tools/ocpp-simulator.ts CP003 1.6 ws://localhost:4000/ocpp
```

**OCPP Messages Tested:**
- BootNotification
- Heartbeat
- StatusNotification
- Authorize (RFID)
- StartTransaction
- MeterValues
- StopTransaction

---

## 🎯 Service Port Reference

| Service | Port | Health Check | Purpose |
|---------|------|--------------|---------|
| API Gateway | 3000 | http://localhost:3000/health | Single entry point |
| Station Service | 3001 | http://localhost:3001/health | Station management |
| Driver Service | 3002 | http://localhost:3002/health | Driver & RFID |
| Billing Service | 3003 | http://localhost:3003/health | Billing & invoices |
| Monitoring Service | 3004 | http://localhost:3004/health | Analytics & alerts |
| OCPP Gateway | 4000 | http://localhost:4000/health | OCPP WebSocket |
| Charge Point | 4001 | http://localhost:4001/health | Charge point data |

---

## 📚 12 Factor Principles Quick Check

| Factor | Test Command | Expected Result |
|--------|--------------|-----------------|
| I. Codebase | `git status` | Git repository |
| II. Dependencies | `cat services/*/package.json` | Explicit dependencies |
| III. Config | `docker compose config` | Environment variables |
| IV. Backing Services | `docker compose ps postgres redis` | Running databases |
| V. Build/Release/Run | `make build && npm run dev` | Separate stages |
| VI. Processes | `docker compose up --scale station-service=3` | Stateless scaling |
| VII. Port Binding | `curl localhost:3001/health` | Self-contained services |
| VIII. Concurrency | `docker compose ps` | Multiple instances |
| IX. Disposability | `docker compose restart station-service` | Fast restart |
| X. Dev/Prod Parity | `docker compose config` | Same stack |
| XI. Logs | `docker compose logs` | Stdout/stderr streams |
| XII. Admin Processes | `bun run tools/ocpp-simulator.ts` | One-off tasks |

---

## 🔧 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose -f docker-compose.csms.yml logs

# Rebuild services
docker compose -f docker-compose.csms.yml build --no-cache

# Restart everything
npm run clean && npm run dev
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in docker-compose.csms.yml
```

### Tests Failing

```bash
# Verify services are running
docker compose -f docker-compose.csms.yml ps

# Check service health
for port in 3001 3002 3003 3004 4000; do
  curl http://localhost:$port/health || echo "Port $port not responding"
done

# View service logs
docker compose -f docker-compose.csms.yml logs station-service
```

### Database Connection Issues

```bash
# Check database is running
docker compose -f docker-compose.csms.yml ps postgres

# Connect to database
docker compose -f docker-compose.csms.yml exec postgres psql -U postgres

# Reset database
docker compose -f docker-compose.csms.yml down -v
docker compose -f docker-compose.csms.yml up -d postgres
```

---

## 📖 Documentation Links

- [12 Factor App Compliance](docs/12-factor-app-compliance.md)
- [Testing Guide](docs/testing-guide.md)
- [Deployment & Scalability](docs/deployment-scalability-guide.md)
- [CSMS Architecture](docs/csms-core-architecture.md)
- [OCPP Integration](docs/ocpp-integration-guide.md)
- [Main README](README.csms.md)

---

## 🎉 Quick Test Workflow

**For Development:**
```bash
# 1. Test architecture (fast, no services needed)
npm run test:architecture

# 2. Start services
npm run dev

# 3. Verify health
npm run health:check

# 4. Test OCPP
npm run test:simulator

# 5. Run integration tests
npm run test:integration
```

**For CI/CD:**
```bash
# Run all tests automatically
npm run test:all
```

**For Production Deployment:**
```bash
# 1. Run tests
npm run test:architecture

# 2. Build production images
npm run build

# 3. Deploy
NODE_ENV=production npm run start

# 4. Verify deployment
npm run test:integration
```

---

## 🏆 Success Criteria

**Architecture Tests:** 27/29 tests passing ✅  
**Integration Tests:** All scenarios complete ✅  
**OCPP Tests:** All protocol messages working ✅  
**12 Factor Compliance:** All factors implemented ✅

---

**🎯 Your CSMS + OCPP + Microservices system is ready for testing!**
