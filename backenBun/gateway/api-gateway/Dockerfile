# =========================================
# API Gateway Dockerfile
# =========================================

FROM superapp/base:latest

# Set service environment variables
ENV NODE_ENV=production
ENV SERVICE_NAME=api-gateway
ENV PORT=3000

# Copy service source code
COPY ./gateway/api-gateway ./

# Install service dependencies
RUN bun install

# Copy shared utilities (already in base image)
# COPY ./shared ./shared  # Already copied in base image

# API Gateway doesn't need Prisma client generation
# It communicates with other services via HTTP/gRPC

# Expose service port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start service
CMD ["bun", "run", "start"]