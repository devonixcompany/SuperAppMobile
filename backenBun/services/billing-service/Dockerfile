FROM superapp/base:latest

# Copy service source code
COPY ./services/billing-service ./

# Install service dependencies
RUN bun install

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# Start the service
CMD ["bun", "run", "start"]
