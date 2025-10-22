#!/bin/bash

echo "🔧 Fixing dependencies for all services..."

# Install dependencies for each service
services=("user-service" "auth-service" "station-service" "billing-service" "monitoring-service" "charge-point" "ocpp-gateway")

for service in "${services[@]}"; do
    if [ -d "services/$service" ]; then
        echo "📦 Installing dependencies for $service..."
        cd "services/$service"
        bun install
        cd ../..
    fi
done

# Install dependencies for gateway
if [ -d "gateway/api-gateway" ]; then
    echo "📦 Installing dependencies for api-gateway..."
    cd "gateway/api-gateway"
    bun install
    cd ../..
fi

# Generate Prisma clients for services that use Prisma
prisma_services=("user-service" "auth-service" "station-service")

for service in "${prisma_services[@]}"; do
    if [ -d "services/$service" ]; then
        echo "🗄️ Generating Prisma client for $service..."
        cd "services/$service"
        bunx prisma generate
        cd ../..
    fi
done

echo "✅ Dependencies fixed successfully!"