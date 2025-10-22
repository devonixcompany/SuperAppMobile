#!/bin/bash

# SuperApp Backend - Services Startup Script
echo "🚀 Starting SuperApp Backend Services..."

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready on port $port..."

    while [ $attempt -le $max_attempts ]; do
        if check_port $port; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ $service_name failed to start within expected time"
    return 1
}

# Stop any existing services
echo "🛑 Stopping existing services..."
pkill -f "bun run.*index.ts" || true
sleep 2

# Start services in background
echo "🔧 Starting services..."

# Product Service
cd services/product-service
echo "   Starting Product Service (Port 3003)..."
bun run src/index.ts > ../../logs/product-service.log 2>&1 &
PRODUCT_PID=$!
echo "   Product Service PID: $PRODUCT_PID"

# Order Service
cd ../order-service
echo "   Starting Order Service (Port 3004)..."
bun run src/index.ts > ../../logs/order-service.log 2>&1 &
ORDER_PID=$!
echo "   Order Service PID: $ORDER_PID"

# User Service
cd ../user-service
echo "   Starting User Service (Port 3001)..."
bun run src/index.ts > ../../logs/user-service.log 2>&1 &
USER_PID=$!
echo "   User Service PID: $USER_PID"

# Auth Service
cd ../auth-service
echo "   Starting Auth Service (Port 3002)..."
bun run src/index.ts > ../../logs/auth-service.log 2>&1 &
AUTH_PID=$!
echo "   Auth Service PID: $AUTH_PID"

# API Gateway
cd ../../gateway/api-gateway
echo "   Starting API Gateway (Port 3000)..."
bun run src/index.ts > ../../logs/api-gateway.log 2>&1 &
GATEWAY_PID=$!
echo "   API Gateway PID: $GATEWAY_PID"

# Save PIDs
cd ../..
echo $PRODUCT_PID > .pids/product-service.pid
echo $ORDER_PID > .pids/order-service.pid
echo $USER_PID > .pids/user-service.pid
echo $AUTH_PID > .pids/auth-service.pid
echo $GATEWAY_PID > .pids/api-gateway.pid

# Wait for services to be ready
echo ""
echo "⏱️  Waiting for all services to be ready..."
mkdir -p logs .pids

wait_for_service 3003 "Product Service"
wait_for_service 3004 "Order Service"
wait_for_service 3001 "User Service"
wait_for_service 3002 "Auth Service"
wait_for_service 3000 "API Gateway"

echo ""
echo "🎉 All services are running!"
echo ""
echo "📊 Service URLs:"
echo "   🚪 API Gateway:     http://localhost:3000"
echo "   👥 User Service:    http://localhost:3001"
echo "   🔐 Auth Service:    http://localhost:3002"
echo "   🛍️ Product Service: http://localhost:3003"
echo "   📦 Order Service:   http://localhost:3004"
echo ""
echo "🏥 Health Checks:"
echo "   Gateway:   curl http://localhost:3000/health"
echo "   Users:     curl http://localhost:3001/health"
echo "   Auth:      curl http://localhost:3002/health"
echo "   Products:  curl http://localhost:3003/health"
echo "   Orders:    curl http://localhost:3004/health"
echo ""
echo "📝 Logs:"
echo "   API Gateway: tail -f logs/api-gateway.log"
echo "   User Service: tail -f logs/user-service.log"
echo "   Auth Service: tail -f logs/auth-service.log"
echo "   Product Service: tail -f logs/product-service.log"
echo "   Order Service: tail -f logs/order-service.log"
echo ""
echo "🛑 To stop all services: ./scripts/stop-services.sh"