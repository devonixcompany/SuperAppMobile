# =========================================
# API Gateway Dockerfile
# =========================================

# Build arguments
ARG SERVICE=api-gateway

# Use the pre-built base image
FROM superapp/base:latest AS base

# Service-specific stage
FROM base AS api-gateway

# Set service environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE}
ENV PORT=3000

# Copy service source code
COPY ./gateway/${SERVICE} ./

# Copy service package.json and install service-specific dependencies
COPY ./gateway/${SERVICE}/package.json ./service-package.json
RUN bun install --frozen-lockfile

# Copy shared utilities (already in base image)
# COPY ./shared ./shared  # Already copied in base image

# API Gateway doesn't need Prisma client generation
# It communicates with other services via HTTP/gRPC

# Expose service port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the service
CMD ["bun", "run", "start"]