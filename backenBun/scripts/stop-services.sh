#!/bin/bash

# SuperApp Backend - Services Stop Script
echo "🛑 Stopping SuperApp Backend Services..."

# Function to stop service by PID file
stop_service() {
    local service_name=$1
    local pid_file=".pids/${service_name}.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "   Stopping $service_name (PID: $pid)..."
            kill $pid
            rm "$pid_file"
        else
            echo "   $service_name (PID: $pid) is not running"
            rm "$pid_file"
        fi
    else
        echo "   $service_name PID file not found"
    fi
}

# Stop services by PID files
stop_service "api-gateway"
stop_service "user-service"
stop_service "auth-service"
stop_service "product-service"
stop_service "order-service"

# Kill any remaining processes
echo "   Cleaning up any remaining processes..."
pkill -f "bun run.*index.ts" || true

echo ""
echo "✅ All services have been stopped!"
echo ""
echo "📝 To view logs: tail -f logs/*.log"
echo "🚀 To restart: ./scripts/start-services.sh"