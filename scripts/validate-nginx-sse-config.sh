#!/bin/bash

# Nginx SSE Gateway Configuration Validation Script
# Task 3.1: WebSocket/SSE Gateway Configuration

set -e

echo "🔍 Validating Task 3.1: WebSocket/SSE Gateway Configuration"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Validation counters
PASS=0
FAIL=0

echo
echo "1. Validating Nginx Configuration File"
echo "--------------------------------------"

# Check if nginx.conf exists
if [ -f "nginx/nginx.conf" ]; then
    print_status 0 "nginx/nginx.conf file exists"
    ((PASS++))
else
    print_status 1 "nginx/nginx.conf file is missing"
    ((FAIL++))
fi

# Check nginx configuration syntax (if nginx is available)
if command -v nginx >/dev/null 2>&1; then
    if nginx -t -c "$(pwd)/nginx/nginx.conf" >/dev/null 2>&1; then
        print_status 0 "Nginx configuration syntax is valid"
        ((PASS++))
    else
        print_status 1 "Nginx configuration syntax is invalid"
        ((FAIL++))
    fi
else
    print_warning "nginx command not available, skipping syntax check"
fi

echo
echo "2. Validating SSE-Specific Configuration"
echo "----------------------------------------"

# Check for SSE-specific settings in nginx.conf
SSE_PATTERNS=(
    "proxy_buffering off"
    "proxy_cache off"
    "text/event-stream"
    "initial-report-status/stream"
    "limit_req zone=sse"
    "proxy_read_timeout 24h"
    "Connection \"\""
)

for pattern in "${SSE_PATTERNS[@]}"; do
    if grep -q "$pattern" nginx/nginx.conf; then
        print_status 0 "Found SSE configuration: $pattern"
        ((PASS++))
    else
        print_status 1 "Missing SSE configuration: $pattern"
        ((FAIL++))
    fi
done

echo
echo "3. Validating WebSocket Configuration"
echo "------------------------------------"

WS_PATTERNS=(
    "proxy_set_header Upgrade"
    "proxy_set_header Connection \"upgrade\""
    "location /ws"
)

for pattern in "${WS_PATTERNS[@]}"; do
    if grep -q "$pattern" nginx/nginx.conf; then
        print_status 0 "Found WebSocket configuration: $pattern"
        ((PASS++))
    else
        print_status 1 "Missing WebSocket configuration: $pattern"
        ((FAIL++))
    fi
done

echo
echo "4. Validating Production Features"
echo "--------------------------------"

PROD_PATTERNS=(
    "limit_req_zone"
    "limit_conn_zone"
    "upstream app_backend"
    "keepalive"
    "gzip on"
    "add_header.*Security"
)

for pattern in "${PROD_PATTERNS[@]}"; do
    if grep -q "$pattern" nginx/nginx.conf; then
        print_status 0 "Found production feature: $pattern"
        ((PASS++))
    else
        print_status 1 "Missing production feature: $pattern"
        ((FAIL++))
    fi
done

echo
echo "5. Validating Docker Compose Configuration"
echo "------------------------------------------"

# Check if docker-compose.prod.yml has nginx service
if grep -q "nginx:" docker-compose.prod.yml; then
    print_status 0 "Nginx service defined in docker-compose.prod.yml"
    ((PASS++))
else
    print_status 1 "Nginx service missing in docker-compose.prod.yml"
    ((FAIL++))
fi

# Check if app port is not exposed (should use nginx proxy)
if grep -q "3000:3000" docker-compose.prod.yml; then
    print_status 1 "App port 3000 is still directly exposed (should use nginx proxy)"
    ((FAIL++))
else
    print_status 0 "App port properly proxied through nginx"
    ((PASS++))
fi

# Check for monitoring exporters
EXPORTERS=("node-exporter" "postgres-exporter" "redis-exporter" "nginx-exporter")

for exporter in "${EXPORTERS[@]}"; do
    if grep -q "$exporter:" docker-compose.prod.yml; then
        print_status 0 "Found monitoring exporter: $exporter"
        ((PASS++))
    else
        print_status 1 "Missing monitoring exporter: $exporter"
        ((FAIL++))
    fi
done

echo
echo "6. Validating Monitoring Integration"
echo "-----------------------------------"

# Check if prometheus.yml includes exporters
if [ -f "monitoring/prometheus.yml" ]; then
    print_status 0 "Prometheus configuration file exists"
    ((PASS++))
    
    for exporter in "${EXPORTERS[@]}"; do
        if grep -q "$exporter" monitoring/prometheus.yml; then
            print_status 0 "Prometheus configured for: $exporter"
            ((PASS++))
        else
            print_status 1 "Prometheus missing configuration for: $exporter"
            ((FAIL++))
        fi
    done
else
    print_status 1 "Prometheus configuration file missing"
    ((FAIL++))
fi

echo
echo "7. Testing Nginx Configuration (if Docker is available)"
echo "-------------------------------------------------------"

if command -v docker >/dev/null 2>&1; then
    print_info "Testing nginx configuration using Docker..."
    
    # Test nginx configuration
    if docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t >/dev/null 2>&1; then
        print_status 0 "Nginx configuration test passed in Docker"
        ((PASS++))
    else
        print_status 1 "Nginx configuration test failed in Docker"
        ((FAIL++))
        echo "Error details:"
        docker run --rm -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t
    fi
else
    print_warning "Docker not available, skipping container-based tests"
fi

echo
echo "8. Validating Security Headers"
echo "------------------------------"

SECURITY_HEADERS=(
    "X-Frame-Options"
    "X-Content-Type-Options"
    "X-XSS-Protection"
    "Referrer-Policy"
    "Content-Security-Policy"
)

for header in "${SECURITY_HEADERS[@]}"; do
    if grep -q "$header" nginx/nginx.conf; then
        print_status 0 "Found security header: $header"
        ((PASS++))
    else
        print_status 1 "Missing security header: $header"
        ((FAIL++))
    fi
done

echo
echo "9. Task 3.1 Acceptance Criteria Validation"
echo "==========================================="

# Check each acceptance criteria
echo "Checking acceptance criteria:"

AC1=0
if grep -q "proxy_buffering off" nginx/nginx.conf && grep -q "proxy_set_header Upgrade" nginx/nginx.conf; then
    print_status 0 "✓ Nginx WebSocket proxying configuration"
    ((AC1++))
else
    print_status 1 "✗ Nginx WebSocket proxying configuration"
fi

AC2=0
if grep -q "/nginx_status" nginx/nginx.conf && grep -q "sse.log" nginx/nginx.conf; then
    print_status 0 "✓ SSE connection health monitoring"
    ((AC2++))
else
    print_status 1 "✗ SSE connection health monitoring"
fi

AC3=0
if grep -q "proxy_read_timeout 24h" nginx/nginx.conf && grep -q "keepalive" nginx/nginx.conf; then
    print_status 0 "✓ Automatic reconnection handling"
    ((AC3++))
else
    print_status 1 "✗ Automatic reconnection handling"
fi

AC4=0
if grep -q "limit_req_zone" nginx/nginx.conf && grep -q "limit_conn_zone" nginx/nginx.conf; then
    print_status 0 "✓ Production-scale connection limits"
    ((AC4++))
else
    print_status 1 "✗ Production-scale connection limits"
fi

ACCEPTANCE_SCORE=$((AC1 + AC2 + AC3 + AC4))

echo
echo "============================================================"
echo "📊 VALIDATION SUMMARY"
echo "============================================================"
echo "Total Tests: $((PASS + FAIL))"
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo
echo "Acceptance Criteria: $ACCEPTANCE_SCORE/4"

if [ $ACCEPTANCE_SCORE -eq 4 ]; then
    echo -e "${GREEN}🎉 Task 3.1 - WebSocket/SSE Gateway Configuration: COMPLETED${NC}"
    echo -e "${GREEN}All acceptance criteria met!${NC}"
    exit 0
elif [ $ACCEPTANCE_SCORE -ge 3 ]; then
    echo -e "${YELLOW}⚠️  Task 3.1 - WebSocket/SSE Gateway Configuration: MOSTLY COMPLETE${NC}"
    echo -e "${YELLOW}Minor issues to address${NC}"
    exit 1
else
    echo -e "${RED}❌ Task 3.1 - WebSocket/SSE Gateway Configuration: NEEDS WORK${NC}"
    echo -e "${RED}Major issues need to be resolved${NC}"
    exit 2
fi 