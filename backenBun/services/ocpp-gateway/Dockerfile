FROM superapp/base:latest

# Copy service source code
COPY ./services/ocpp-gateway ./

# Install service dependencies
RUN bun install

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Start the service
CMD ["bun", "run", "start"]
