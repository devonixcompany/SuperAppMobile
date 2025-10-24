# 🎯 12 Factor App Compliance - CSMS Microservices

This document outlines how our CSMS (Charging Station Management System) microservices architecture adheres to the [12 Factor App](https://12factor.net/) principles.

## 📋 12 Factor Principles Checklist

- [x] **I. Codebase** - One codebase tracked in revision control, many deploys
- [x] **II. Dependencies** - Explicitly declare and isolate dependencies
- [x] **III. Config** - Store config in the environment
- [x] **IV. Backing Services** - Treat backing services as attached resources
- [x] **V. Build, Release, Run** - Strictly separate build and run stages
- [x] **VI. Processes** - Execute the app as one or more stateless processes
- [x] **VII. Port Binding** - Export services via port binding
- [x] **VIII. Concurrency** - Scale out via the process model
- [x] **IX. Disposability** - Maximize robustness with fast startup and graceful shutdown
- [x] **X. Dev/Prod Parity** - Keep development, staging, and production as similar as possible
- [x] **XI. Logs** - Treat logs as event streams
- [x] **XII. Admin Processes** - Run admin/management tasks as one-off processes

---

## I. Codebase 📦

**Principle**: One codebase tracked in revision control, many deploys

### ✅ Implementation

- **Single Git Repository**: All CSMS microservices reside in one monorepo
- **Service Independence**: Each service can be deployed independently
- **Version Control**: Git tracks all changes with proper branching strategy

```bash
backenBun/
├── services/
│   ├── station-service/      # Independent service
│   ├── driver-service/       # Independent service
│   ├── billing-service/      # Independent service
│   ├── monitoring-service/   # Independent service
│   ├── charge-point/         # Independent service
│   └── ocpp-gateway/         # Independent service
└── gateway/
    └── api-gateway/          # Independent service
```

### 🧪 Testing

```bash
# Verify codebase structure
cd /home/runner/work/SuperAppMobile/SuperAppMobile/backenBun
git log --oneline --graph --all

# Check service independence
ls -la services/
```

---

## II. Dependencies 📚

**Principle**: Explicitly declare and isolate dependencies

### ✅ Implementation

Each service has its own `package.json` with explicitly declared dependencies:

**Station Service Dependencies** (`services/station-service/package.json`):
```json
{
  "dependencies": {
    "elysia": "latest",
    "@elysiajs/cors": "latest",
    "@prisma/client": "latest",
    "ioredis": "^5.3.2"
  }
}
```

**OCPP Gateway Dependencies** (`services/ocpp-gateway/package.json`):
```json
{
  "dependencies": {
    "elysia": "latest",
    "ws": "^8.16.0",
    "ioredis": "^5.3.2"
  }
}
```

### 🧪 Testing

```bash
# Verify dependencies are explicitly declared
cd services/station-service && bun install
cd ../driver-service && bun install
cd ../billing-service && bun install

# Check for dependency isolation
docker-compose -f docker-compose.csms.yml build
```

---

## III. Config 🔧

**Principle**: Store config in the environment

### ✅ Implementation

All configuration is stored in environment variables, never in code:

**Environment Variables** (`.env`):
```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@postgres:5432/csms_stations
REDIS_URL=redis://redis:6379

# Service Configuration
NODE_ENV=production
PORT=3001

# OCPP Configuration
OCPP_HEARTBEAT_INTERVAL=60
OCPP_WEBSOCKET_PORT=4000

# Service URLs
STATION_SERVICE_URL=http://station-service:3001
DRIVER_SERVICE_URL=http://driver-service:3002
BILLING_SERVICE_URL=http://billing-service:3003
MONITORING_SERVICE_URL=http://monitoring-service:3004
```

**Docker Compose Configuration**:
```yaml
environment:
  - NODE_ENV=development
  - DATABASE_URL=postgresql://postgres:password@postgres:5432/csms_stations
  - REDIS_URL=redis://redis:6379
```

### 🧪 Testing

```bash
# Test configuration loading
docker-compose -f docker-compose.csms.yml config

# Verify environment variable usage
grep -r "process.env" services/*/src/

# Test with different environments
NODE_ENV=development docker-compose up
NODE_ENV=production docker-compose up
```

---

## IV. Backing Services 🔌

**Principle**: Treat backing services as attached resources

### ✅ Implementation

All backing services (databases, caches) are treated as attached resources via URLs:

```typescript
// Database connection via URL
const databaseUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

// Redis connection via URL
const redisUrl = process.env.REDIS_URL;
const redis = new Redis(redisUrl);
```

**Backing Services**:
- **PostgreSQL**: `postgresql://postgres:password@postgres:5432/csms_stations`
- **Redis**: `redis://redis:6379`
- **Consul**: `http://consul:8500`

### 🧪 Testing

```bash
# Test service swapping
DATABASE_URL=postgresql://postgres:password@postgres:5432/csms_stations_test
REDIS_URL=redis://redis-test:6379

# Verify backing services are attachable/detachable
docker-compose -f docker-compose.csms.yml up postgres redis
```

---

## V. Build, Release, Run 🚀

**Principle**: Strictly separate build and run stages

### ✅ Implementation

**Build Stage**:
```bash
# Build Docker images
docker-compose -f docker-compose.csms.yml build
```

**Release Stage**:
```bash
# Tag and version images
docker tag station-service:latest station-service:v1.0.0
```

**Run Stage**:
```bash
# Run services
docker-compose -f docker-compose.csms.yml up -d
```

**Dockerfile Multi-Stage Build**:
```dockerfile
# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Production stage
FROM oven/bun:1 AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["bun", "run", "src/index.ts"]
```

### 🧪 Testing

```bash
# Test build stage
make build

# Test release stage (tagging)
docker tag superapp/station-service:latest superapp/station-service:v1.0.0

# Test run stage
make run
```

---

## VI. Processes ⚙️

**Principle**: Execute the app as one or more stateless processes

### ✅ Implementation

All services are stateless. State is stored in backing services (PostgreSQL, Redis):

```typescript
// ❌ BAD: Storing state in memory
let sessionData = {};

// ✅ GOOD: Storing state in Redis
await redis.set(`session:${sessionId}`, JSON.stringify(data));
```

**Stateless Services**:
- No session data stored in process memory
- All state persisted to PostgreSQL or Redis
- Services can be horizontally scaled without issues

### 🧪 Testing

```bash
# Test horizontal scaling (multiple instances)
docker-compose -f docker-compose.csms.yml up -d --scale station-service=3

# Verify no local state
curl http://localhost:3001/stations
curl http://localhost:3001/stations  # Should return same data
```

---

## VII. Port Binding 🔗

**Principle**: Export services via port binding

### ✅ Implementation

Each service binds to a specific port and is completely self-contained:

```typescript
// Station Service - Port 3001
const app = new Elysia()
  .get('/health', () => ({ status: 'healthy' }))
  .listen(3001);

// OCPP Gateway - Port 4000
const app = new Elysia()
  .ws('/ocpp', { /* handlers */ })
  .listen(4000);
```

**Port Mapping**:
- Station Management: `3001`
- Driver Management: `3002`
- Billing Service: `3003`
- Monitoring Service: `3004`
- OCPP Gateway: `4000`
- Charge Point: `4001`

### 🧪 Testing

```bash
# Test port binding
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:4000/health

# Verify each service is self-contained
docker-compose -f docker-compose.csms.yml ps
```

---

## VIII. Concurrency 🔄

**Principle**: Scale out via the process model

### ✅ Implementation

Services can be scaled horizontally using Docker Compose or Kubernetes:

```bash
# Scale station service to 3 instances
docker-compose -f docker-compose.csms.yml up -d --scale station-service=3

# Scale OCPP gateway to 2 instances
docker-compose -f docker-compose.csms.yml up -d --scale ocpp-gateway=2
```

**Load Balancing**:
```yaml
# API Gateway routes to multiple instances
services:
  station-service:
    deploy:
      replicas: 3
```

### 🧪 Testing

```bash
# Test horizontal scaling
make run
docker-compose -f docker-compose.csms.yml up -d --scale station-service=3

# Verify load distribution
for i in {1..10}; do curl http://localhost:3001/health; done
```

---

## IX. Disposability 💨

**Principle**: Maximize robustness with fast startup and graceful shutdown

### ✅ Implementation

**Fast Startup**:
```typescript
// Quick service initialization
const app = new Elysia()
  .onStart(() => console.log('🚀 Service started'))
  .listen(3001);
```

**Graceful Shutdown**:
```typescript
// Handle shutdown signals
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
```

**Docker Health Checks**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### 🧪 Testing

```bash
# Test fast startup
time docker-compose -f docker-compose.csms.yml up -d

# Test graceful shutdown
docker-compose -f docker-compose.csms.yml stop
docker-compose -f docker-compose.csms.yml logs | grep "shutting down"

# Test health checks
docker inspect --format='{{json .State.Health}}' <container_id>
```

---

## X. Dev/Prod Parity 🔄

**Principle**: Keep development, staging, and production as similar as possible

### ✅ Implementation

**Same Technology Stack**:
- Development: Docker Compose + PostgreSQL + Redis
- Production: Docker Compose/Kubernetes + PostgreSQL + Redis

**Same Deployment Process**:
```bash
# Development
docker-compose -f docker-compose.csms.yml up -d

# Production
docker-compose -f docker-compose.csms.yml up -d
```

**Environment Parity**:
- Same Docker images for dev/staging/prod
- Same database schema (PostgreSQL 15)
- Same backing services (Redis 7)

### 🧪 Testing

```bash
# Test development environment
NODE_ENV=development docker-compose up

# Test production environment
NODE_ENV=production docker-compose up

# Compare configurations
docker-compose -f docker-compose.csms.yml config
```

---

## XI. Logs 📝

**Principle**: Treat logs as event streams

### ✅ Implementation

Services write logs to stdout/stderr, never to files:

```typescript
// Structured logging to stdout
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  service: 'station-service',
  message: 'Station registered',
  stationId: 'ST001'
}));
```

**Log Aggregation**:
```bash
# View logs from all services
docker-compose -f docker-compose.csms.yml logs -f

# View logs from specific service
docker-compose -f docker-compose.csms.yml logs -f station-service
```

### 🧪 Testing

```bash
# Verify logs go to stdout
docker-compose -f docker-compose.csms.yml logs

# Test structured logging
docker-compose -f docker-compose.csms.yml logs | grep "station-service"

# Test log streaming
docker-compose -f docker-compose.csms.yml logs -f --tail=100
```

---

## XII. Admin Processes 🛠️

**Principle**: Run admin/management tasks as one-off processes

### ✅ Implementation

**Database Migrations** (one-off process):
```bash
# Run migrations
docker-compose exec station-service bun run prisma migrate deploy

# Seed database
docker-compose exec station-service bun run prisma db seed
```

**OCPP Simulator** (one-off process):
```bash
# Run OCPP test simulator
bun run tools/ocpp-simulator.ts CP001 1.6
```

**Health Checks** (one-off process):
```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

### 🧪 Testing

```bash
# Test database migration
docker-compose exec postgres psql -U postgres -d csms_stations -c "\dt"

# Test one-off admin scripts
bun run tools/ocpp-simulator.ts CP001 1.6

# Test maintenance tasks
docker-compose exec station-service bun run scripts/cleanup.ts
```

---

## 🧪 Comprehensive Testing Guide

### 1. Test All 12 Factors

Run the complete test suite:

```bash
cd /home/runner/work/SuperAppMobile/SuperAppMobile/backenBun

# Test Factor I: Codebase
git status
git log --oneline

# Test Factor II: Dependencies
make setup

# Test Factor III: Config
docker-compose -f docker-compose.csms.yml config

# Test Factor IV: Backing Services
docker-compose -f docker-compose.csms.yml up -d postgres redis

# Test Factor V: Build, Release, Run
make build
make run

# Test Factor VI: Processes
docker-compose -f docker-compose.csms.yml up -d --scale station-service=3

# Test Factor VII: Port Binding
curl http://localhost:3001/health
curl http://localhost:4000/health

# Test Factor VIII: Concurrency
docker-compose -f docker-compose.csms.yml ps

# Test Factor IX: Disposability
docker-compose -f docker-compose.csms.yml stop
docker-compose -f docker-compose.csms.yml up -d

# Test Factor X: Dev/Prod Parity
NODE_ENV=production docker-compose up -d

# Test Factor XI: Logs
docker-compose -f docker-compose.csms.yml logs -f

# Test Factor XII: Admin Processes
bun run tools/ocpp-simulator.ts CP001 1.6
```

### 2. CSMS + OCPP Integration Tests

```bash
# Start all CSMS services
docker-compose -f docker-compose.csms.yml up -d

# Wait for services to be healthy
sleep 30

# Test OCPP connection
bun run tools/ocpp-simulator.ts CP001 1.6

# Test CSMS endpoints
curl http://localhost:3001/stations
curl http://localhost:3002/drivers
curl http://localhost:3003/charging-sessions
curl http://localhost:3004/analytics/dashboard
```

### 3. Microservices Architecture Validation

```bash
# Verify service independence
docker-compose -f docker-compose.csms.yml ps

# Test service isolation
docker-compose stop station-service
curl http://localhost:3002/health  # Should still work

# Test service communication
docker-compose -f docker-compose.csms.yml logs | grep "service-to-service"
```

---

## 📊 Compliance Summary

| Factor | Status | Implementation | Testing |
|--------|--------|----------------|---------|
| I. Codebase | ✅ | Git monorepo | `git status` |
| II. Dependencies | ✅ | package.json per service | `bun install` |
| III. Config | ✅ | Environment variables | `docker-compose config` |
| IV. Backing Services | ✅ | URL-based connections | Service swapping |
| V. Build, Release, Run | ✅ | Docker multi-stage | `make build` |
| VI. Processes | ✅ | Stateless services | Horizontal scaling |
| VII. Port Binding | ✅ | Self-contained services | Port mapping |
| VIII. Concurrency | ✅ | Docker scale | `--scale` flag |
| IX. Disposability | ✅ | Fast startup/shutdown | Health checks |
| X. Dev/Prod Parity | ✅ | Same stack | Same Docker images |
| XI. Logs | ✅ | stdout/stderr | `docker-compose logs` |
| XII. Admin Processes | ✅ | One-off commands | Migration scripts |

---

## 🎯 Conclusion

Our CSMS microservices architecture **fully complies** with all 12 Factor App principles, ensuring:

- ✅ **Scalability**: Services can scale horizontally
- ✅ **Portability**: Same deployment across environments
- ✅ **Resilience**: Fast startup, graceful shutdown
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Cloud-Ready**: Optimized for containerized deployments

This makes our CSMS platform production-ready for modern cloud environments! 🚀
