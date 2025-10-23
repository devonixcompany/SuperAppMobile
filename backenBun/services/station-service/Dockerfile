FROM superapp/base:latest

# Copy service source code
COPY ./services/station-service ./

# Install service dependencies
RUN bun install

# Generate Prisma client
# RUN bunx prisma generate

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the service
CMD ["bun", "run", "start"]