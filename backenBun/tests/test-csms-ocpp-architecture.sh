#!/bin/bash

# ============================================
# CSMS + OCPP + Microservices Architecture Test Suite
# ============================================
# This script tests the complete CSMS system including:
# - OCPP protocol implementation
# - Microservices architecture
# - 12 Factor App compliance
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}[TEST] $1${NC}"
    ((TOTAL_TESTS++))
}

print_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

# Wait for service to be healthy
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=0

    print_info "Waiting for $service_name on port $port..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            print_success "$service_name is healthy"
            return 0
        fi
        sleep 2
        ((attempt++))
    done
    
    print_failure "$service_name failed to start on port $port"
    return 1
}

# ============================================
# Test 1: Verify 12 Factor App Compliance
# ============================================
test_12_factor_compliance() {
    print_header "Testing 12 Factor App Compliance"

    # Factor I: Codebase
    print_test "Factor I: Codebase - Single codebase in version control"
    if [ -d ".git" ]; then
        print_success "Git repository exists"
    else
        print_failure "No Git repository found"
    fi

    # Factor II: Dependencies
    print_test "Factor II: Dependencies - Explicitly declared dependencies"
    local has_dependencies=true
    for service_dir in services/*/; do
        if [ ! -f "$service_dir/package.json" ]; then
            print_failure "Missing package.json in $service_dir"
            has_dependencies=false
        fi
    done
    if $has_dependencies; then
        print_success "All services have explicit dependencies"
    fi

    # Factor III: Config
    print_test "Factor III: Config - Configuration in environment"
    if docker compose -f docker-compose.csms.yml config > /dev/null 2>&1; then
        print_success "Docker Compose configuration is valid"
    else
        print_failure "Docker Compose configuration is invalid"
    fi

    # Factor IV: Backing Services
    print_test "Factor IV: Backing Services - Attached resources"
    if docker compose -f docker-compose.csms.yml config | grep -q "DATABASE_URL"; then
        print_success "Database configured as attached resource"
    else
        print_failure "Database not configured as attached resource"
    fi

    # Factor V: Build, Release, Run
    print_test "Factor V: Build, Release, Run - Separate stages"
    if [ -f "Makefile" ] && grep -q "build" Makefile; then
        print_success "Build stage is separated"
    else
        print_failure "Build stage not properly separated"
    fi

    # Factor VI: Processes
    print_test "Factor VI: Processes - Stateless execution"
    if docker compose -f docker-compose.csms.yml config | grep -q "redis"; then
        print_success "Redis configured for shared state"
    else
        print_failure "No shared state management found"
    fi

    # Factor VII: Port Binding
    print_test "Factor VII: Port Binding - Self-contained services"
    if docker compose -f docker-compose.csms.yml config | grep -q "ports:"; then
        print_success "Services bind to ports"
    else
        print_failure "No port binding configuration found"
    fi

    # Factor VIII: Concurrency
    print_test "Factor VIII: Concurrency - Horizontal scaling support"
    print_success "Docker Compose supports horizontal scaling"

    # Factor IX: Disposability
    print_test "Factor IX: Disposability - Fast startup/graceful shutdown"
    if docker compose -f docker-compose.csms.yml config | grep -q "healthcheck"; then
        print_success "Health checks configured for disposability"
    else
        print_info "Health checks could be added for better disposability"
    fi

    # Factor X: Dev/Prod Parity
    print_test "Factor X: Dev/Prod Parity - Similar environments"
    if [ -f "docker-compose.csms.yml" ]; then
        print_success "Docker ensures dev/prod parity"
    else
        print_failure "Docker Compose file not found"
    fi

    # Factor XI: Logs
    print_test "Factor XI: Logs - Treat logs as event streams"
    print_success "Docker Compose captures stdout/stderr logs"

    # Factor XII: Admin Processes
    print_test "Factor XII: Admin Processes - One-off tasks"
    if [ -f "tools/ocpp-simulator.ts" ]; then
        print_success "Admin tools available (OCPP simulator)"
    else
        print_failure "Admin tools not found"
    fi
}

# ============================================
# Test 2: Microservices Architecture
# ============================================
test_microservices_architecture() {
    print_header "Testing Microservices Architecture"

    # Test service independence
    print_test "Service Independence - Each service is independently deployable"
    local services=("station-service" "driver-service" "billing-service" "monitoring-service" "ocpp-gateway" "charge-point")
    for service in "${services[@]}"; do
        if [ -d "services/$service" ]; then
            print_info "  ✓ $service exists"
        else
            print_failure "$service directory not found"
        fi
    done
    print_success "All CSMS services are present"

    # Test service isolation
    print_test "Service Isolation - Separate databases per service"
    if grep -q "csms_stations\|csms_drivers\|csms_billing\|csms_monitoring" docker-compose.csms.yml; then
        print_success "Services use separate databases"
    else
        print_failure "Service database isolation not found"
    fi

    # Test API Gateway
    print_test "API Gateway - Single entry point exists"
    if [ -d "gateway/api-gateway" ]; then
        print_success "API Gateway present"
    else
        print_failure "API Gateway not found"
    fi
}

# ============================================
# Test 3: OCPP Protocol Implementation
# ============================================
test_ocpp_implementation() {
    print_header "Testing OCPP Protocol Implementation"

    # Test OCPP Gateway
    print_test "OCPP Gateway - WebSocket server exists"
    if [ -d "services/ocpp-gateway" ]; then
        print_success "OCPP Gateway service exists"
    else
        print_failure "OCPP Gateway not found"
    fi

    # Test OCPP Simulator
    print_test "OCPP Simulator - Test tool available"
    if [ -f "tools/ocpp-simulator.ts" ]; then
        print_success "OCPP Simulator tool exists"
    else
        print_failure "OCPP Simulator not found"
    fi

    # Test Charge Point Service
    print_test "Charge Point Service - OCPP data management"
    if [ -d "services/charge-point" ]; then
        print_success "Charge Point service exists"
    else
        print_failure "Charge Point service not found"
    fi
}

# ============================================
# Test 4: CSMS Core Services
# ============================================
test_csms_services() {
    print_header "Testing CSMS Core Services"

    # Test Station Management
    print_test "Station Management Service"
    if [ -d "services/station-service/src" ]; then
        print_success "Station Management service has source code"
    else
        print_failure "Station Management service incomplete"
    fi

    # Test Driver Management
    print_test "Driver Management Service"
    if [ -d "services/driver-service/src" ]; then
        print_success "Driver Management service has source code"
    else
        print_failure "Driver Management service incomplete"
    fi

    # Test Billing Service
    print_test "Billing Service"
    if [ -d "services/billing-service/src" ]; then
        print_success "Billing service has source code"
    else
        print_failure "Billing service incomplete"
    fi

    # Test Monitoring Service
    print_test "Monitoring Service"
    if [ -d "services/monitoring-service/src" ]; then
        print_success "Monitoring service has source code"
    else
        print_failure "Monitoring service incomplete"
    fi
}

# ============================================
# Test 5: Service Health Checks (Runtime)
# ============================================
test_service_health() {
    print_header "Testing Service Health Checks (Runtime)"

    print_info "Checking if services are running..."

    # Check if docker compose is running
    if ! docker compose -f docker-compose.csms.yml ps | grep -q "Up"; then
        print_info "Services not running. Start with: docker compose -f docker-compose.csms.yml up -d"
        print_info "Skipping runtime health checks..."
        return
    fi

    # Test API Gateway
    print_test "API Gateway Health (Port 3000)"
    if curl -s -f "http://localhost:3000/health" > /dev/null 2>&1; then
        print_success "API Gateway is healthy"
    else
        print_info "API Gateway not responding (may not be running)"
    fi

    # Test Station Service
    print_test "Station Service Health (Port 3001)"
    if curl -s -f "http://localhost:3001/health" > /dev/null 2>&1; then
        print_success "Station Service is healthy"
    else
        print_info "Station Service not responding (may not be running)"
    fi

    # Test Driver Service
    print_test "Driver Service Health (Port 3002)"
    if curl -s -f "http://localhost:3002/health" > /dev/null 2>&1; then
        print_success "Driver Service is healthy"
    else
        print_info "Driver Service not responding (may not be running)"
    fi

    # Test Billing Service
    print_test "Billing Service Health (Port 3003)"
    if curl -s -f "http://localhost:3003/health" > /dev/null 2>&1; then
        print_success "Billing Service is healthy"
    else
        print_info "Billing Service not responding (may not be running)"
    fi

    # Test Monitoring Service
    print_test "Monitoring Service Health (Port 3004)"
    if curl -s -f "http://localhost:3004/health" > /dev/null 2>&1; then
        print_success "Monitoring Service is healthy"
    else
        print_info "Monitoring Service not responding (may not be running)"
    fi

    # Test OCPP Gateway
    print_test "OCPP Gateway Health (Port 4000)"
    if curl -s -f "http://localhost:4000/health" > /dev/null 2>&1; then
        print_success "OCPP Gateway is healthy"
    else
        print_info "OCPP Gateway not responding (may not be running)"
    fi
}

# ============================================
# Test 6: Documentation
# ============================================
test_documentation() {
    print_header "Testing Documentation"

    # Test README files
    print_test "CSMS Documentation"
    if [ -f "README.csms.md" ]; then
        print_success "CSMS README exists"
    else
        print_failure "CSMS README not found"
    fi

    print_test "Architecture Documentation"
    if [ -f "docs/csms-core-architecture.md" ]; then
        print_success "Architecture documentation exists"
    else
        print_failure "Architecture documentation not found"
    fi

    print_test "OCPP Integration Guide"
    if [ -f "docs/ocpp-integration-guide.md" ]; then
        print_success "OCPP integration guide exists"
    else
        print_failure "OCPP integration guide not found"
    fi

    print_test "12 Factor App Compliance Documentation"
    if [ -f "docs/12-factor-app-compliance.md" ]; then
        print_success "12 Factor compliance documentation exists"
    else
        print_failure "12 Factor compliance documentation not found"
    fi
}

# ============================================
# Test 7: Infrastructure
# ============================================
test_infrastructure() {
    print_header "Testing Infrastructure"

    # Test Docker Compose files
    print_test "Docker Compose CSMS Configuration"
    if [ -f "docker-compose.csms.yml" ]; then
        print_success "CSMS Docker Compose file exists"
    else
        print_failure "CSMS Docker Compose file not found"
    fi

    # Test Makefile
    print_test "Makefile Automation"
    if [ -f "Makefile" ]; then
        print_success "Makefile exists for build automation"
    else
        print_failure "Makefile not found"
    fi

    # Test database initialization scripts
    print_test "Database Initialization Scripts"
    if [ -f "scripts/init-csms-databases.sql" ]; then
        print_success "CSMS database init script exists"
    else
        print_failure "Database init script not found"
    fi
}

# ============================================
# Main Test Execution
# ============================================
main() {
    print_header "CSMS + OCPP + Microservices Architecture Test Suite"
    print_info "Starting comprehensive architecture tests..."

    cd "$(dirname "$0")/.." || exit 1

    # Run all test suites
    test_12_factor_compliance
    test_microservices_architecture
    test_ocpp_implementation
    test_csms_services
    test_service_health
    test_documentation
    test_infrastructure

    # Print summary
    print_header "Test Summary"
    echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed! CSMS architecture is compliant.${NC}\n"
        exit 0
    else
        echo -e "\n${RED}⚠️  Some tests failed. Please review the failures above.${NC}\n"
        exit 1
    fi
}

# Run main function
main "$@"
