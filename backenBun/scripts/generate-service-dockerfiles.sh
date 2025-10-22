#!/bin/bash

# =========================================
# Generate Service Dockerfiles Script
# =========================================

set -e

# Services array
services=(
    "user-service:3003"
    "charge-point:3004"
    "billing-service:3005"
    "driver-service:3006"
    "monitoring-service:3007"
    "ocpp-gateway:8080"
)

# Template content
cat > /tmp/dockerfile-template.txt << 'EOF'
# =========================================
# ${SERVICE_NAME^^} Service Dockerfile
# =========================================

# Build arguments
ARG SERVICE=${SERVICE_NAME}

# Use the pre-built base image
FROM superapp/base:latest AS base

# Service-specific stage
FROM base AS ${SERVICE_NAME}

# Set service environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE}
ENV PORT=${PORT}

# Copy service source code
COPY ./services/${SERVICE} ./

# Copy service package.json and install service-specific dependencies
COPY ./services/${SERVICE}/package.json ./service-package.json
RUN bun install --frozen-lockfile

# Copy shared utilities (already in base image)
# COPY ./shared ./shared  # Already copied in base image

# Generate Prisma client for this service (uses shared schema)
RUN cd ../shared/prisma && bunx prisma generate

# Expose service port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the service
CMD ["bun", "run", "start"]
EOF

echo "🐳 Generating Dockerfiles for services..."

for service_info in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"

    dockerfile_path="services/$service_name/Dockerfile"

    echo "Generating $dockerfile_path..."

    # Generate Dockerfile using envsubst
    SERVICE_NAME="$service_name" PORT="$port" envsubst < /tmp/dockerfile-template.txt > "$dockerfile_path"

    echo "✅ Generated $dockerfile_path"
done

echo "🎉 All service Dockerfiles generated!"

# Clean up
rm /tmp/dockerfile-template.txt