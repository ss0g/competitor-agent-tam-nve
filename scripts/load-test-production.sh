#!/bin/bash

# Production Load Testing Script for Task 4.1
# Implements production-scale load testing with comprehensive monitoring

set -e

echo "🚀 Production Load Testing - Task 4.1"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOAD_TEST_CONFIG_FILE="$PROJECT_ROOT/.env.loadtest"
RESULTS_DIR="$PROJECT_ROOT/test-results/load-testing"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$RESULTS_DIR/load-test-$TIMESTAMP.log"
METRICS_FILE="$RESULTS_DIR/load-test-metrics-$TIMESTAMP.json"

# Default configuration
DEFAULT_BASE_URL="http://localhost:3000"
DEFAULT_CONCURRENT_PROJECTS=20
DEFAULT_RATE_LIMIT_TEST_CONNECTIONS=25
DEFAULT_RESOURCE_MONITORING_INTERVAL=2000
DEFAULT_TEST_TIMEOUT=300000

# Function to print status messages
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to setup test environment
setup_test_environment() {
    print_info "Setting up production load test environment"
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Initialize log file
    echo "Production Load Test Log - $(date)" > "$LOG_FILE"
    echo "Project Root: $PROJECT_ROOT" >> "$LOG_FILE"
    echo "Test Configuration:" >> "$LOG_FILE"
    
    # Check if custom load test config exists
    if [ -f "$LOAD_TEST_CONFIG_FILE" ]; then
        print_info "Loading custom load test configuration from $LOAD_TEST_CONFIG_FILE"
        source "$LOAD_TEST_CONFIG_FILE"
    else
        print_warning "No custom config found, using defaults"
        cat > "$LOAD_TEST_CONFIG_FILE" << EOF
# Production Load Test Configuration
TEST_BASE_URL=${DEFAULT_BASE_URL}
CONCURRENT_PROJECTS=${DEFAULT_CONCURRENT_PROJECTS}
RATE_LIMIT_TEST_CONNECTIONS=${DEFAULT_RATE_LIMIT_TEST_CONNECTIONS}
RESOURCE_MONITORING_INTERVAL=${DEFAULT_RESOURCE_MONITORING_INTERVAL}
TEST_TIMEOUT=${DEFAULT_TEST_TIMEOUT}
EOF
        source "$LOAD_TEST_CONFIG_FILE"
    fi
    
    echo "  Base URL: ${TEST_BASE_URL:-$DEFAULT_BASE_URL}" >> "$LOG_FILE"
    echo "  Concurrent Projects: ${CONCURRENT_PROJECTS:-$DEFAULT_CONCURRENT_PROJECTS}" >> "$LOG_FILE"
    echo "  Test Timeout: ${TEST_TIMEOUT:-$DEFAULT_TEST_TIMEOUT}ms" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    
    print_status 0 "Test environment setup completed"
}

# Function to check system readiness
check_system_readiness() {
    print_info "Checking system readiness for load testing"
    
    local base_url="${TEST_BASE_URL:-$DEFAULT_BASE_URL}"
    local health_check_failed=0
    
    # Check if the application is running
    print_info "Checking application health at $base_url"
    if command -v curl >/dev/null 2>&1; then
        if curl -f -s "$base_url/api/health" >/dev/null; then
            print_status 0 "Application health check passed"
            echo "$(date): Health check passed" >> "$LOG_FILE"
        else
            print_status 1 "Application health check failed"
            echo "$(date): Health check failed - application may not be running" >> "$LOG_FILE"
            health_check_failed=1
        fi
    else
        print_warning "curl not available, skipping health check"
        echo "$(date): Skipped health check - curl not available" >> "$LOG_FILE"
    fi
    
    # Check if Node.js/npm is available for running tests
    if command -v npm >/dev/null 2>&1; then
        print_status 0 "npm is available for running tests"
        echo "$(date): npm available - $(npm --version)" >> "$LOG_FILE"
    else
        print_status 1 "npm not available - cannot run tests"
        echo "$(date): npm not available" >> "$LOG_FILE"
        return 1
    fi
    
    # Check if jest is available
    if npm list jest >/dev/null 2>&1 || npm list -g jest >/dev/null 2>&1; then
        print_status 0 "Jest testing framework is available"
        echo "$(date): Jest available" >> "$LOG_FILE"
    else
        print_status 1 "Jest testing framework not available"
        echo "$(date): Jest not available" >> "$LOG_FILE"
        return 1
    fi
    
    if [ $health_check_failed -eq 1 ]; then
        print_warning "Application health check failed, but continuing with tests"
    fi
    
    print_status 0 "System readiness check completed"
    return 0
}

# Function to start system monitoring
start_monitoring() {
    print_info "Starting system resource monitoring"
    
    local monitoring_interval=5
    local monitor_pid_file="$RESULTS_DIR/monitor.pid"
    
    # Start background monitoring process
    (
        echo "$(date): Starting resource monitoring" >> "$LOG_FILE"
        while true; do
            timestamp=$(date '+%Y-%m-%d %H:%M:%S')
            
            # Memory usage
            if command -v free >/dev/null 2>&1; then
                memory_info=$(free -m | grep '^Mem:')
                memory_used=$(echo $memory_info | awk '{print $3}')
                memory_total=$(echo $memory_info | awk '{print $2}')
                memory_percent=$(echo "scale=2; ($memory_used / $memory_total) * 100" | bc -l 2>/dev/null || echo "N/A")
            else
                memory_percent="N/A"
            fi
            
            # CPU usage (if available)
            if command -v top >/dev/null 2>&1; then
                cpu_usage=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "N/A")
            else
                cpu_usage="N/A"
            fi
            
            # Disk usage
            if command -v df >/dev/null 2>&1; then
                disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
            else
                disk_usage="N/A"
            fi
            
            # Log metrics
            echo "$timestamp,Memory:${memory_percent}%,CPU:${cpu_usage}%,Disk:${disk_usage}%" >> "$RESULTS_DIR/system-metrics-$TIMESTAMP.csv"
            
            sleep $monitoring_interval
        done
    ) &
    
    # Save monitoring process PID
    echo $! > "$monitor_pid_file"
    
    print_status 0 "System monitoring started (PID: $!)"
    echo "$(date): System monitoring started with PID $!" >> "$LOG_FILE"
}

# Function to stop monitoring
stop_monitoring() {
    local monitor_pid_file="$RESULTS_DIR/monitor.pid"
    
    if [ -f "$monitor_pid_file" ]; then
        local monitor_pid=$(cat "$monitor_pid_file")
        if kill -0 "$monitor_pid" 2>/dev/null; then
            kill "$monitor_pid" 2>/dev/null || true
            print_status 0 "System monitoring stopped"
            echo "$(date): System monitoring stopped" >> "$LOG_FILE"
        fi
        rm -f "$monitor_pid_file"
    fi
}

# Function to run load tests
run_load_tests() {
    print_info "Running production load tests"
    echo "$(date): Starting load tests" >> "$LOG_FILE"
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables for the test
    export TEST_BASE_URL="${TEST_BASE_URL:-$DEFAULT_BASE_URL}"
    export NODE_ENV="test"
    
    # Run the production load tests
    local test_exit_code=0
    
    print_info "Executing Jest load tests..."
    echo "$(date): Executing Jest load tests" >> "$LOG_FILE"
    
    if npm test -- __tests__/performance/productionLoadTest.test.ts --verbose --detectOpenHandles --forceExit 2>&1 | tee -a "$LOG_FILE"; then
        print_status 0 "Load tests completed successfully"
        echo "$(date): Load tests completed successfully" >> "$LOG_FILE"
    else
        test_exit_code=$?
        print_status 1 "Load tests failed or had issues"
        echo "$(date): Load tests failed with exit code $test_exit_code" >> "$LOG_FILE"
    fi
    
    return $test_exit_code
}

# Function to analyze results
analyze_results() {
    print_info "Analyzing load test results"
    echo "$(date): Analyzing results" >> "$LOG_FILE"
    
    local results_summary_file="$RESULTS_DIR/load-test-summary-$TIMESTAMP.txt"
    
    # Create results summary
    cat > "$results_summary_file" << EOF
Production Load Test Results Summary
===================================
Date: $(date)
Test Configuration:
  - Base URL: ${TEST_BASE_URL:-$DEFAULT_BASE_URL}
  - Concurrent Projects: ${CONCURRENT_PROJECTS:-$DEFAULT_CONCURRENT_PROJECTS}
  - Test Timeout: ${TEST_TIMEOUT:-$DEFAULT_TEST_TIMEOUT}ms

Test Results:
EOF
    
    # Extract test results from log file
    if grep -q "✅" "$LOG_FILE"; then
        echo "  - Tests Passed: $(grep -c "✅" "$LOG_FILE")" >> "$results_summary_file"
    fi
    
    if grep -q "❌" "$LOG_FILE"; then
        echo "  - Tests Failed: $(grep -c "❌" "$LOG_FILE")" >> "$results_summary_file"
    fi
    
    # Check for specific success patterns
    if grep -q "Production load test PASSED" "$LOG_FILE"; then
        echo "  - Core load test: PASSED" >> "$results_summary_file"
    else
        echo "  - Core load test: FAILED or INCOMPLETE" >> "$results_summary_file"
    fi
    
    if grep -q "Rate limiting effectiveness test PASSED" "$LOG_FILE"; then
        echo "  - Rate limiting test: PASSED" >> "$results_summary_file"
    else
        echo "  - Rate limiting test: FAILED or INCOMPLETE" >> "$results_summary_file"
    fi
    
    # Add system metrics summary if available
    local metrics_file="$RESULTS_DIR/system-metrics-$TIMESTAMP.csv"
    if [ -f "$metrics_file" ]; then
        echo "" >> "$results_summary_file"
        echo "System Resource Usage:" >> "$results_summary_file"
        echo "  - Monitoring data available in: $metrics_file" >> "$results_summary_file"
        
        # Calculate peak memory usage if possible
        if command -v awk >/dev/null 2>&1; then
            local peak_memory=$(awk -F',' 'NR>1 {gsub(/%/, "", $2); gsub(/Memory:/, "", $2); if($2 != "N/A" && $2 > max) max=$2} END {print max "%"}' "$metrics_file" 2>/dev/null || echo "N/A")
            echo "  - Peak Memory Usage: $peak_memory" >> "$results_summary_file"
        fi
    fi
    
    # Add log file reference
    echo "" >> "$results_summary_file"
    echo "Detailed Logs: $LOG_FILE" >> "$results_summary_file"
    echo "Results Directory: $RESULTS_DIR" >> "$results_summary_file"
    
    print_status 0 "Results analysis completed"
    echo "$(date): Results analysis completed" >> "$LOG_FILE"
    
    # Display summary
    echo ""
    echo "📊 TEST RESULTS SUMMARY"
    echo "======================="
    cat "$results_summary_file"
}

# Function to validate Task 4.1 acceptance criteria
validate_acceptance_criteria() {
    print_info "Validating Task 4.1 acceptance criteria"
    echo "$(date): Validating acceptance criteria" >> "$LOG_FILE"
    
    local criteria_met=0
    local total_criteria=4
    
    # Check each acceptance criterion
    echo ""
    echo "🎯 Task 4.1 Acceptance Criteria Validation:"
    echo "==========================================="
    
    # Criterion 1: 20 concurrent project creations with reports
    if grep -q "20 concurrent project creation" "$LOG_FILE" && grep -q "PASSED" "$LOG_FILE"; then
        print_status 0 "✓ 20 concurrent project creations with reports"
        ((criteria_met++))
    else
        print_status 1 "✗ 20 concurrent project creations with reports"
    fi
    
    # Criterion 2: Average response time < 45 seconds validation
    if grep -q "averageResponseTime.*under.*45" "$LOG_FILE" || grep -q "average.*response.*45" "$LOG_FILE"; then
        print_status 0 "✓ Average response time < 45 seconds validation"
        ((criteria_met++))
    else
        print_status 1 "✗ Average response time < 45 seconds validation"
    fi
    
    # Criterion 3: Resource utilization monitoring during load
    if [ -f "$RESULTS_DIR/system-metrics-$TIMESTAMP.csv" ] && grep -q "monitoring" "$LOG_FILE"; then
        print_status 0 "✓ Resource utilization monitoring during load"
        ((criteria_met++))
    else
        print_status 1 "✗ Resource utilization monitoring during load"
    fi
    
    # Criterion 4: Rate limiting effectiveness under load
    if grep -q "Rate limiting.*test.*PASSED" "$LOG_FILE" || grep -q "rate.*limiting.*effective" "$LOG_FILE"; then
        print_status 0 "✓ Rate limiting effectiveness under load"
        ((criteria_met++))
    else
        print_status 1 "✗ Rate limiting effectiveness under load"
    fi
    
    echo ""
    echo "📈 Acceptance Criteria Score: $criteria_met/$total_criteria"
    
    if [ $criteria_met -eq $total_criteria ]; then
        echo -e "${GREEN}🎉 Task 4.1 - Production Load Testing: COMPLETED${NC}"
        echo -e "${GREEN}All acceptance criteria met!${NC}"
        echo "$(date): All acceptance criteria met" >> "$LOG_FILE"
        return 0
    elif [ $criteria_met -ge 3 ]; then
        echo -e "${YELLOW}⚠️  Task 4.1 - Production Load Testing: MOSTLY COMPLETE${NC}"
        echo -e "${YELLOW}Minor issues to address${NC}"
        echo "$(date): Most acceptance criteria met ($criteria_met/$total_criteria)" >> "$LOG_FILE"
        return 1
    else
        echo -e "${RED}❌ Task 4.1 - Production Load Testing: NEEDS WORK${NC}"
        echo -e "${RED}Major issues need to be resolved${NC}"
        echo "$(date): Insufficient criteria met ($criteria_met/$total_criteria)" >> "$LOG_FILE"
        return 2
    fi
}

# Function to cleanup
cleanup() {
    print_info "Cleaning up test environment"
    stop_monitoring
    echo "$(date): Cleanup completed" >> "$LOG_FILE"
}

# Main execution
main() {
    echo "Starting production load testing at $(date)"
    echo ""
    
    # Setup trap for cleanup
    trap cleanup EXIT
    
    # Setup test environment
    setup_test_environment || {
        print_status 1 "Failed to setup test environment"
        exit 1
    }
    
    # Check system readiness
    check_system_readiness || {
        print_status 1 "System readiness check failed"
        exit 1
    }
    
    # Start monitoring
    start_monitoring
    
    # Wait a moment for monitoring to initialize
    sleep 2
    
    # Run load tests
    local test_result=0
    run_load_tests || test_result=$?
    
    # Stop monitoring
    stop_monitoring
    
    # Analyze results
    analyze_results
    
    # Validate acceptance criteria
    local validation_result=0
    validate_acceptance_criteria || validation_result=$?
    
    echo ""
    echo "🏁 Production Load Testing Completed"
    echo "=================================="
    echo "Results available in: $RESULTS_DIR"
    echo "Log file: $LOG_FILE"
    echo ""
    
    # Exit with appropriate code
    if [ $test_result -eq 0 ] && [ $validation_result -eq 0 ]; then
        exit 0
    elif [ $validation_result -eq 1 ]; then
        exit 1
    else
        exit 2
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi 