# =========================================
# SuperApp Microservices Makefile
# =========================================

.PHONY: help build build-base build-services clean-services run dev stop logs reset-db generate-prisma setup lint test clean

# Default target
help:
	@echo "SuperApp Microservices Commands:"
	@echo ""
	@echo "Setup & Build:"
	@echo "  setup          - Install dependencies and setup project"
	@echo "  build-base     - Build base Docker image with shared dependencies"
	@echo "  build-services - Build all service Docker images"
	@echo "  build          - Build base and all services"
	@echo "  clean-services - Remove all service Docker images"
	@echo ""
	@echo "Development:"
	@echo "  dev            - Start all services in development mode"
	@echo "  run            - Start all services in production mode"
	@echo "  stop           - Stop all services"
	@echo "  logs [service] - Show logs for all services or specific service"
	@echo ""
	@echo "Database:"
	@echo "  reset-db       - Reset database and run migrations"
	@echo "  generate-prisma - Generate Prisma client from shared schema"
	@echo "  migrate        - Run database migrations"
	@echo "  seed           - Seed database with sample data"
	@echo ""
	@echo "Maintenance:"
	@echo "  lint           - Lint all services"
	@echo "  test           - Run tests for all services"
	@echo "  clean          - Clean Docker resources and node_modules"

# =========================================
# Setup Commands
# =========================================

setup:
	@echo "🔧 Setting up SuperApp project..."
	@bun install
	@mkdir -p shared/prisma/migrations
	@mkdir -p logs
	@cp shared/prisma/.env.example shared/prisma/.env 2>/dev/null || echo "DATABASE_URL=\"postgresql://postgres:password@localhost:5432/superapp_db\"" > shared/prisma/.env
	@echo "✅ Setup complete!"

# =========================================
# Build Commands
# =========================================

build-base:
	@echo "🏗️  Building base Docker image..."
	@DOCKER_BUILDKIT=1 docker build \
		--target service-template \
		-t superapp/base:latest \
		-f Dockerfile.base \
		.

build-services: build-base
	@echo "🐳 Building all service images..."
	@services="auth-service user-service station-service charge-point billing-service driver-service monitoring-service ocpp-gateway"; \
	for service in $$services; do \
		echo "Building $$service..."; \
		DOCKER_BUILDKIT=1 docker build \
			--build-arg SERVICE=$$service \
			-t superapp/$$service:latest \
			-f services/$$service/Dockerfile \
			. || exit 1; \
	done
	@echo "✅ All services built successfully!"

build: build-services

# =========================================
# Docker Commands
# =========================================

clean-services:
	@echo "🧹 Cleaning service images..."
	@docker rmi -f $$(docker images "superapp/*" -q) 2>/dev/null || echo "No service images to clean"
	@docker rmi -f superapp/base:latest 2>/dev/null || echo "No base image to clean"
	@echo "✅ Service images cleaned!"

run:
	@echo "🚀 Starting all services..."
	@docker-compose -f docker-compose.services.yml up --build -d

dev:
	@echo "🛠️  Starting services in development mode..."
	@docker-compose -f docker-compose.services.yml up --build

stop:
	@echo "⏹️  Stopping all services..."
	@docker-compose -f docker-compose.services.yml down

logs:
	@if [ -n "$(service)" ]; then \
		echo "📋 Logs for $(service)..."; \
		docker-compose -f docker-compose.services.yml logs -f $(service); \
	else \
		echo "📋 Logs for all services..."; \
		docker-compose -f docker-compose.services.yml logs -f; \
	fi

# =========================================
# Database Commands
# =========================================

generate-prisma:
	@echo "🔄 Generating Prisma client..."
	@cd shared/prisma && bunx prisma generate
	@echo "✅ Prisma client generated!"

migrate:
	@echo "🗄️  Running database migrations..."
	@cd shared/prisma && bunx prisma migrate dev
	@echo "✅ Migrations completed!"

seed:
	@echo "🌱 Seeding database..."
	@cd shared/prisma && bunx prisma db seed
	@echo "✅ Database seeded!"

reset-db:
	@echo "🔄 Resetting database..."
	@cd shared/prisma && bunx prisma migrate reset
	@echo "✅ Database reset complete!"

# =========================================
# Development Commands
# =========================================

lint:
	@echo "🔍 Linting all services..."
	@for service in services/*/; do \
		service_name=$$(basename "$$service"); \
		if [ -f "$$service/package.json" ]; then \
			echo "Linting $$service_name..."; \
			cd "$$service" && bun lint || echo "⚠️  Lint failed for $$service_name"; \
			cd ../..; \
		fi; \
	done

test:
	@echo "🧪 Running tests for all services..."
	@for service in services/*/; do \
		service_name=$$(basename "$$service"); \
		if [ -f "$$service/package.json" ]; then \
			echo "Testing $$service_name..."; \
			cd "$$service" && bun test || echo "⚠️  Tests failed for $$service_name"; \
			cd ../..; \
		fi; \
	done

# =========================================
# Utility Commands
# =========================================

ps:
	@echo "📊 Service status:"
	@docker-compose -f docker-compose.services.yml ps

exec:
	@if [ -z "$(service)" ]; then \
		echo "Usage: make exec service=<service-name>"; \
		exit 1; \
	fi
	@echo "🔧 Executing into $(service)..."
	@docker-compose -f docker-compose.services.yml exec $(service) /bin/bash

# =========================================
# Clean Commands
# =========================================

clean: clean-services
	@echo "🧹 Cleaning up..."
	@docker-compose -f docker-compose.services.yml down -v
	@docker system prune -f
	@echo "✅ Cleanup complete!"

# =========================================
# Development Utilities
# =========================================

watch-services:
	@echo "👀 Watching for changes..."
	@docker-compose -f docker-compose.services.yml up --build --force-recreate

restart-service:
	@if [ -z "$(service)" ]; then \
		echo "Usage: make restart-service service=<service-name>"; \
		exit 1; \
	fi
	@echo "🔄 Restarting $(service)..."
	@docker-compose -f docker-compose.services.yml restart $(service)

pull-latest:
	@echo "📥 Pulling latest base images..."
	@docker pull oven/bun:1
	@docker pull postgres:15-alpine
	@echo "✅ Base images updated!"

# Quick development shortcuts
dev-setup: setup build-base
quick-start: setup build-base dev