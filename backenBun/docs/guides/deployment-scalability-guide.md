# 🚀 CSMS Deployment & Scalability Guide

Comprehensive guide for deploying and scaling the CSMS (Charging Station Management System) microservices architecture.

## 📋 Table of Contents

- [Deployment Strategies](#deployment-strategies)
- [Horizontal Scaling](#horizontal-scaling)
- [Configuration Management](#configuration-management)
- [Production Deployment](#production-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring & Observability](#monitoring--observability)
- [High Availability](#high-availability)
- [Performance Tuning](#performance-tuning)

---

## 🚀 Deployment Strategies

### Local Development

```bash
# Start all CSMS services
docker compose -f docker-compose.csms.yml up -d

# View logs
docker compose -f docker-compose.csms.yml logs -f

# Stop services
docker compose -f docker-compose.csms.yml down
```

### Staging Environment

```bash
# Build production images
docker compose -f docker-compose.csms.yml build

# Start with production configuration
NODE_ENV=staging docker compose -f docker-compose.csms.yml up -d

# Monitor service health
watch -n 2 'curl -s http://localhost:3000/services | jq'
```

### Production Deployment

```bash
# Build optimized production images
docker compose -f docker-compose.csms.yml build --no-cache

# Deploy with production settings
NODE_ENV=production docker compose -f docker-compose.csms.yml up -d

# Verify all services are healthy
for port in 3000 3001 3002 3003 3004 4000 4001; do
  curl -f http://localhost:$port/health
done
```

---

## ⚖️ Horizontal Scaling

### Scale Individual Services

```bash
# Scale Station Service to 3 instances
docker compose -f docker-compose.csms.yml up -d --scale station-service=3

# Scale multiple services
docker compose -f docker-compose.csms.yml up -d \
  --scale station-service=3 \
  --scale billing-service=2 \
  --scale monitoring-service=2

# Verify scaling
docker compose -f docker-compose.csms.yml ps
```

### Auto-scaling Configuration

**Docker Swarm Example:**

```yaml
# docker-compose.swarm.yml
services:
  station-service:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Load Balancing

Services automatically load balance when scaled horizontally. Docker's internal DNS provides round-robin load balancing:

```bash
# Test load distribution
for i in {1..10}; do
  curl -s http://localhost:3001/health | jq '.instance'
done | sort | uniq -c
```

---

## 🔧 Configuration Management

### Environment Variables

**Development (.env.development):**
```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/csms_stations
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
OCPP_HEARTBEAT_INTERVAL=60
```

**Production (.env.production):**
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:secure_password@db.example.com:5432/csms_stations
REDIS_URL=redis://redis.example.com:6379
LOG_LEVEL=info
OCPP_HEARTBEAT_INTERVAL=300
ENABLE_METRICS=true
ENABLE_TRACING=true
```

### Configuration Validation

```bash
# Validate Docker Compose configuration
docker compose -f docker-compose.csms.yml config

# Check environment variables are loaded
docker compose -f docker-compose.csms.yml config | grep "DATABASE_URL\|REDIS_URL"

# Test with different environments
NODE_ENV=production docker compose config
```

### Secrets Management

**Using Docker Secrets:**

```yaml
# docker-compose.csms.yml with secrets
services:
  station-service:
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt
```

**Using Environment Files:**

```bash
# Load from environment file
docker compose --env-file .env.production -f docker-compose.csms.yml up -d
```

---

## 🏭 Production Deployment

### Pre-deployment Checklist

- [ ] All tests passing (`./tests/test-csms-ocpp-architecture.sh`)
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] SSL/TLS certificates configured
- [ ] Monitoring tools set up
- [ ] Backup strategy in place
- [ ] Rollback plan prepared

### Deployment Steps

```bash
# 1. Build production images
make build

# 2. Tag images with version
docker tag superapp/station-service:latest superapp/station-service:v1.0.0
docker tag superapp/billing-service:latest superapp/billing-service:v1.0.0
# ... tag all services

# 3. Run database migrations
docker compose exec station-service bun run prisma migrate deploy

# 4. Deploy services
NODE_ENV=production docker compose -f docker-compose.csms.yml up -d

# 5. Verify deployment
./tests/test-e2e-integration.sh

# 6. Monitor logs
docker compose -f docker-compose.csms.yml logs -f --tail=100
```

### Blue-Green Deployment

```bash
# Start new version (green)
docker compose -f docker-compose.csms.yml up -d --scale station-service-new=3

# Test new version
curl http://localhost:3011/health  # New service port

# Switch traffic (update load balancer)
# ...

# Stop old version (blue)
docker compose -f docker-compose.csms.yml stop station-service

# Cleanup
docker compose -f docker-compose.csms.yml rm -f station-service
```

### Rolling Updates

```bash
# Update one service at a time
docker compose -f docker-compose.csms.yml up -d --no-deps --scale station-service=3 station-service

# Wait for health check
sleep 10

# Verify service is healthy
curl http://localhost:3001/health

# Repeat for other services
```

---

## ☸️ Kubernetes Deployment

### Kubernetes Manifests

**Deployment Example (station-service.yaml):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: station-service
  namespace: csms
spec:
  replicas: 3
  selector:
    matchLabels:
      app: station-service
  template:
    metadata:
      labels:
        app: station-service
    spec:
      containers:
      - name: station-service
        image: superapp/station-service:v1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: csms-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: csms-config
              key: redis-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: station-service
  namespace: csms
spec:
  selector:
    app: station-service
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

**Horizontal Pod Autoscaler:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: station-service-hpa
  namespace: csms
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: station-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace csms

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# Deploy services
kubectl apply -f k8s/station-service.yaml
kubectl apply -f k8s/billing-service.yaml
kubectl apply -f k8s/monitoring-service.yaml
kubectl apply -f k8s/ocpp-gateway.yaml

# Apply autoscaling
kubectl apply -f k8s/hpa.yaml

# Verify deployment
kubectl get pods -n csms
kubectl get services -n csms

# Check autoscaling
kubectl get hpa -n csms
```

---

## 📊 Monitoring & Observability

### Health Checks

**Kubernetes Probes:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

### Metrics Collection

**Prometheus Integration:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'csms-services'
    static_configs:
      - targets:
        - 'station-service:3001'
        - 'billing-service:3003'
        - 'monitoring-service:3004'
        - 'ocpp-gateway:4000'
    metrics_path: '/metrics'
```

### Log Aggregation

**ELK Stack (Elasticsearch, Logstash, Kibana):**

```yaml
# docker-compose.monitoring.yml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.10.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.10.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

### Distributed Tracing

**Jaeger Integration:**

```bash
# Start Jaeger
docker run -d --name jaeger \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest

# Access Jaeger UI
open http://localhost:16686
```

---

## 🔄 High Availability

### Database High Availability

**PostgreSQL Replication:**

```yaml
# Primary database
postgres-primary:
  image: postgres:15
  environment:
    POSTGRES_REPLICATION_MODE: master
    POSTGRES_REPLICATION_USER: replicator
    POSTGRES_REPLICATION_PASSWORD: repl_password

# Replica database
postgres-replica:
  image: postgres:15
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_MASTER_SERVICE: postgres-primary
    POSTGRES_REPLICATION_USER: replicator
    POSTGRES_REPLICATION_PASSWORD: repl_password
```

### Redis High Availability

**Redis Sentinel:**

```yaml
redis-master:
  image: redis:7-alpine
  command: redis-server --appendonly yes

redis-sentinel:
  image: redis:7-alpine
  command: redis-sentinel /etc/redis/sentinel.conf
  volumes:
    - ./sentinel.conf:/etc/redis/sentinel.conf
```

### Service Redundancy

```bash
# Deploy multiple instances of each service
docker compose -f docker-compose.csms.yml up -d \
  --scale station-service=3 \
  --scale driver-service=2 \
  --scale billing-service=3 \
  --scale monitoring-service=2 \
  --scale ocpp-gateway=2
```

---

## ⚡ Performance Tuning

### Resource Allocation

**Docker Compose:**

```yaml
services:
  station-service:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Database Connection Pooling

```typescript
// Prisma connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
  // Connection pool settings
  __internal: {
    engine: {
      connectionLimit: 100,
    },
  },
});
```

### Redis Caching Strategy

```typescript
// Cache frequently accessed data
const cacheKey = `station:${stationId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchFromDatabase(stationId);
await redis.set(cacheKey, JSON.stringify(data), 'EX', 300); // 5 min TTL
return data;
```

### Load Testing

```bash
# Install k6
brew install k6

# Run load test
k6 run --vus 100 --duration 30s loadtest.js

# Example loadtest.js
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  let res = http.get('http://localhost:3001/stations');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

---

## 🔐 Security Best Practices

### Network Security

```yaml
# docker-compose with network isolation
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access

services:
  api-gateway:
    networks:
      - frontend
      - backend
  
  station-service:
    networks:
      - backend  # Only internal network
```

### SSL/TLS Configuration

```bash
# Generate self-signed certificates (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./certs/key.pem \
  -out ./certs/cert.pem

# Use in production with Let's Encrypt
certbot certonly --standalone -d csms.example.com
```

### Rate Limiting

```typescript
// API Gateway rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 📝 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### During Deployment

- [ ] Start new version alongside old
- [ ] Run smoke tests
- [ ] Gradually shift traffic
- [ ] Monitor error rates and latency
- [ ] Verify all integrations working

### Post-Deployment

- [ ] Verify all services healthy
- [ ] Check metrics and logs
- [ ] Run integration tests
- [ ] Monitor for 24 hours
- [ ] Document any issues
- [ ] Update runbook if needed

---

## 🎯 Conclusion

This deployment and scalability guide ensures your CSMS microservices architecture can:

- ✅ **Scale horizontally** to handle increased load
- ✅ **Deploy reliably** across environments
- ✅ **Monitor effectively** for issues
- ✅ **Maintain high availability**
- ✅ **Optimize performance**
- ✅ **Secure properly** in production

Your CSMS platform is ready for enterprise-scale deployment! 🚀
