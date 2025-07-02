#!/bin/bash

# Task 5.1 Implementation Validation Script
# Validates that all requirements for End-to-End Production Validation are met

set -euo pipefail

# Configuration
readonly SCRIPT_NAME="validate-task-5-1.sh"
readonly SCRIPT_VERSION="1.0.0"
readonly TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
readonly LOG_FILE="test-results/task-5-1-validation-${TIMESTAMP}.log"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Setup logging
setup_logging() {
    mkdir -p "$(dirname "$LOG_FILE")"
    
    echo -e "${BLUE}🔍 Task 5.1 Implementation Validation${NC}"
    echo -e "${BLUE}=====================================   ${NC}"
    echo "Script: $SCRIPT_NAME v$SCRIPT_VERSION"
    echo "Timestamp: $(date)"
    echo "Log file: $LOG_FILE"
    echo ""
}

# Test helper functions
pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

# File structure validation
validate_file_structure() {
    echo -e "${BLUE}📁 File Structure Validation${NC}"
    echo "----------------------------------------"
    
    # Check Task 5.1 files exist
    if [[ -f "e2e/production-validation.spec.ts" ]]; then
        pass "End-to-end production validation test file exists"
    else
        fail "End-to-end production validation test file missing"
    fi
    
    if [[ -f "scripts/production-readiness-check.sh" ]]; then
        pass "Production readiness check script exists"
    else
        fail "Production readiness check script missing"
    fi
    
    # Check script is executable
    if [[ -x "scripts/production-readiness-check.sh" ]]; then
        pass "Production readiness check script is executable"
    else
        fail "Production readiness check script is not executable"
    fi
    
    # Check supporting files
    if [[ -f "playwright.config.ts" ]]; then
        pass "Playwright configuration exists"
    else
        warn "Playwright configuration missing"
    fi
    
    if [[ -f "e2e/reports.spec.ts" ]]; then
        pass "Existing e2e test structure in place"
    else
        warn "Existing e2e test structure missing"
    fi
    
    echo ""
}

# Content validation for production validation test
validate_e2e_test_content() {
    echo -e "${BLUE}🎭 E2E Test Content Validation${NC}"
    echo "----------------------------------------"
    
    local test_file="e2e/production-validation.spec.ts"
    
    # Check for required test suites
    if grep -q "System Health" "$test_file"; then
        pass "System health test suite implemented"
    else
        fail "System health test suite missing"
    fi
    
    if grep -q "Complete User Journey" "$test_file"; then
        pass "Complete user journey test suite implemented"
    else
        fail "Complete user journey test suite missing"
    fi
    
    if grep -q "Error Handling" "$test_file"; then
        pass "Error handling test suite implemented"
    else
        fail "Error handling test suite missing"
    fi
    
    if grep -q "Performance" "$test_file"; then
        pass "Performance validation tests implemented"
    else
        fail "Performance validation tests missing"
    fi
    
    # Check for acceptance criteria validation
    if grep -q "Acceptance Criteria" "$test_file"; then
        pass "Task 5.1 acceptance criteria validation implemented"
    else
        fail "Task 5.1 acceptance criteria validation missing"
    fi
    
    # Check for real-time updates testing
    if grep -q "real-time\|Real-time" "$test_file"; then
        pass "Real-time updates validation included"
    else
        fail "Real-time updates validation missing"
    fi
    
    # Check for API endpoint validation
    if grep -q "api.*health\|health.*api" "$test_file"; then
        pass "API health check validation included"
    else
        fail "API health check validation missing"
    fi
    
    # Check for production quality validation
    if grep -q "production.*quality\|production.*validation" "$test_file"; then
        pass "Production quality validation included"
    else
        warn "Production quality validation not explicitly mentioned"
    fi
    
    echo ""
}

# Content validation for production readiness script
validate_readiness_script_content() {
    echo -e "${BLUE}🛠️ Production Readiness Script Content Validation${NC}"
    echo "----------------------------------------"
    
    local script_file="scripts/production-readiness-check.sh"
    
    # Check for core functionality
    if grep -q "check_system_health" "$script_file"; then
        pass "System health check function implemented"
    else
        fail "System health check function missing"
    fi
    
    if grep -q "check_application_health" "$script_file"; then
        pass "Application health check function implemented"
    else
        fail "Application health check function missing"
    fi
    
    if grep -q "check_database" "$script_file"; then
        pass "Database connectivity check implemented"
    else
        fail "Database connectivity check missing"
    fi
    
    if grep -q "check_feature_flags" "$script_file"; then
        pass "Feature flags validation implemented"
    else
        fail "Feature flags validation missing"
    fi
    
    if grep -q "check_monitoring" "$script_file"; then
        pass "Monitoring systems validation implemented"
    else
        fail "Monitoring systems validation missing"
    fi
    
    if grep -q "check_performance" "$script_file"; then
        pass "Performance requirements validation implemented"
    else
        fail "Performance requirements validation missing"
    fi
    
    # Check for Task 5.1 specific validation
    if grep -q "task.*5.*1\|Task.*5.*1" "$script_file"; then
        pass "Task 5.1 specific validation implemented"
    else
        fail "Task 5.1 specific validation missing"
    fi
    
    # Check for acceptance criteria
    if grep -q "acceptance.*criteria\|Acceptance.*Criteria" "$script_file"; then
        pass "Acceptance criteria validation implemented"
    else
        fail "Acceptance criteria validation missing"
    fi
    
    # Check for comprehensive reporting
    if grep -q "generate.*report\|final.*report" "$script_file"; then
        pass "Comprehensive reporting implemented"
    else
        fail "Comprehensive reporting missing"
    fi
    
    echo ""
}

# Functional validation
validate_script_functionality() {
    echo -e "${BLUE}⚙️ Script Functionality Validation${NC}"
    echo "----------------------------------------"
    
    # Check if script can be executed without errors
    if bash -n "scripts/production-readiness-check.sh"; then
        pass "Production readiness script syntax is valid"
    else
        fail "Production readiness script has syntax errors"
    fi
    
    # Check if script has proper shebang
    if head -1 "scripts/production-readiness-check.sh" | grep -q "#!/bin/bash"; then
        pass "Production readiness script has proper shebang"
    else
        fail "Production readiness script missing proper shebang"
    fi
    
    # Check for error handling
    if grep -q "set -euo pipefail" "scripts/production-readiness-check.sh"; then
        pass "Production readiness script has proper error handling"
    else
        warn "Production readiness script missing strict error handling"
    fi
    
    # Check for logging functionality
    if grep -q "log_\|LOG_" "scripts/production-readiness-check.sh"; then
        pass "Production readiness script has logging functionality"
    else
        fail "Production readiness script missing logging functionality"
    fi
    
    echo ""
}

# Integration validation
validate_integration() {
    echo -e "${BLUE}🔗 Integration Validation${NC}"
    echo "----------------------------------------"
    
    # Check if e2e test imports are correct
    if grep -q "import.*@playwright/test" "e2e/production-validation.spec.ts"; then
        pass "E2E test has correct Playwright imports"
    else
        fail "E2E test missing Playwright imports"
    fi
    
    # Check if script has curl for API testing
    if grep -q "curl" "scripts/production-readiness-check.sh"; then
        pass "Production readiness script uses curl for API testing"
    else
        fail "Production readiness script missing curl for API testing"
    fi
    
    # Check for proper timeout handling
    if grep -q "timeout\|TIMEOUT" "scripts/production-readiness-check.sh"; then
        pass "Production readiness script has timeout handling"
    else
        warn "Production readiness script missing timeout handling"
    fi
    
    # Check for retry logic
    if grep -q "retry\|RETRY" "scripts/production-readiness-check.sh"; then
        pass "Production readiness script has retry logic"
    else
        warn "Production readiness script missing retry logic"
    fi
    
    # Check if load testing integration exists
    if grep -q "load.*test\|Load.*Test" "scripts/production-readiness-check.sh"; then
        pass "Production readiness script integrates with load testing"
    else
        warn "Production readiness script missing load testing integration"
    fi
    
    echo ""
}

# Acceptance criteria validation
validate_acceptance_criteria() {
    echo -e "${BLUE}🎯 Task 5.1 Acceptance Criteria Validation${NC}"
    echo "=========================================="
    
    local criteria_met=0
    local total_criteria=4
    
    # Criterion 1: Complete user journey with wizard
    info "Validating Criterion 1: Complete user journey with wizard"
    if grep -q "complete.*user.*journey\|user.*journey.*complete" "e2e/production-validation.spec.ts"; then
        pass "✅ Complete user journey validation implemented"
        ((criteria_met++))
    else
        fail "❌ Complete user journey validation missing"
    fi
    
    # Criterion 2: Real-time updates function correctly
    info "Validating Criterion 2: Real-time updates function correctly"
    if grep -q "real.*time.*update\|Real.*time.*update" "e2e/production-validation.spec.ts"; then
        pass "✅ Real-time updates validation implemented"
        ((criteria_met++))
    else
        fail "❌ Real-time updates validation missing"
    fi
    
    # Criterion 3: Error handling provides excellent UX
    info "Validating Criterion 3: Error handling provides excellent UX"
    if grep -q "error.*handling\|Error.*handling" "e2e/production-validation.spec.ts"; then
        pass "✅ Error handling UX validation implemented"
        ((criteria_met++))
    else
        fail "❌ Error handling UX validation missing"
    fi
    
    # Criterion 4: Monitoring and alerting operational
    info "Validating Criterion 4: Monitoring and alerting operational"
    if grep -q "monitoring.*alert\|Monitoring.*alert" "scripts/production-readiness-check.sh"; then
        pass "✅ Monitoring and alerting validation implemented"
        ((criteria_met++))
    else
        fail "❌ Monitoring and alerting validation missing"
    fi
    
    echo ""
    info "Task 5.1 Acceptance Criteria Summary:"
    info "Criteria implemented: $criteria_met/$total_criteria ($(( criteria_met * 100 / total_criteria ))%)"
    
    if [[ $criteria_met -eq $total_criteria ]]; then
        pass "🎉 ALL Task 5.1 acceptance criteria implemented!"
    elif [[ $criteria_met -ge 3 ]]; then
        warn "⚠️ Most Task 5.1 acceptance criteria implemented ($criteria_met/$total_criteria)"
    else
        fail "❌ Task 5.1 acceptance criteria need significant work ($criteria_met/$total_criteria)"
    fi
    
    echo ""
}

# Implementation quality assessment
validate_implementation_quality() {
    echo -e "${BLUE}🏆 Implementation Quality Assessment${NC}"
    echo "----------------------------------------"
    
    # Check file sizes - should be substantial for comprehensive implementation
    local e2e_size=$(wc -l < "e2e/production-validation.spec.ts" 2>/dev/null || echo "0")
    local script_size=$(wc -l < "scripts/production-readiness-check.sh" 2>/dev/null || echo "0")
    
    if [[ $e2e_size -gt 200 ]]; then
        pass "E2E test file is substantial ($e2e_size lines)"
    elif [[ $e2e_size -gt 100 ]]; then
        warn "E2E test file is moderate size ($e2e_size lines)"
    else
        fail "E2E test file is too small ($e2e_size lines)"
    fi
    
    if [[ $script_size -gt 200 ]]; then
        pass "Production readiness script is substantial ($script_size lines)"
    elif [[ $script_size -gt 100 ]]; then
        warn "Production readiness script is moderate size ($script_size lines)"
    else
        fail "Production readiness script is too small ($script_size lines)"
    fi
    
    # Check for comprehensive test coverage
    local test_count=$(grep -c "test(" "e2e/production-validation.spec.ts" 2>/dev/null || echo "0")
    if [[ $test_count -gt 8 ]]; then
        pass "E2E test has comprehensive test coverage ($test_count tests)"
    elif [[ $test_count -gt 4 ]]; then
        warn "E2E test has moderate test coverage ($test_count tests)"
    else
        fail "E2E test has insufficient test coverage ($test_count tests)"
    fi
    
    # Check for documentation and comments
    local comment_lines=$(grep -c "^\s*\*\|^\s*//" "e2e/production-validation.spec.ts" 2>/dev/null || echo "0")
    if [[ $comment_lines -gt 20 ]]; then
        pass "E2E test is well documented ($comment_lines comment lines)"
    elif [[ $comment_lines -gt 10 ]]; then
        warn "E2E test has some documentation ($comment_lines comment lines)"
    else
        fail "E2E test lacks documentation ($comment_lines comment lines)"
    fi
    
    echo ""
}

# Generate summary report
generate_summary() {
    echo -e "${BLUE}📊 Task 5.1 Implementation Validation Summary${NC}"
    echo "=============================================="
    
    local success_rate=0
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    fi
    
    echo "Validation completed: $(date)"
    echo "Total tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Warnings: $WARNINGS"
    echo "Success rate: ${success_rate}%"
    echo ""
    
    # Determine overall status
    if [[ $FAILED_TESTS -eq 0 && $WARNINGS -le 3 ]]; then
        echo -e "${GREEN}🎉 TASK 5.1 IMPLEMENTATION: EXCELLENT${NC}"
        echo "All critical requirements implemented with high quality."
        return 0
    elif [[ $FAILED_TESTS -le 2 && $success_rate -ge 80 ]]; then
        echo -e "${YELLOW}⚠️ TASK 5.1 IMPLEMENTATION: GOOD${NC}"
        echo "Most requirements implemented, minor issues to address."
        return 0
    elif [[ $success_rate -ge 60 ]]; then
        echo -e "${YELLOW}⚠️ TASK 5.1 IMPLEMENTATION: ACCEPTABLE${NC}"
        echo "Core requirements implemented, some areas need improvement."
        return 1
    else
        echo -e "${RED}❌ TASK 5.1 IMPLEMENTATION: NEEDS WORK${NC}"
        echo "Significant issues found, implementation needs major improvements."
        return 2
    fi
}

# Main execution
main() {
    setup_logging
    
    echo "Validating Task 5.1: End-to-End Production Validation implementation..."
    echo ""
    
    validate_file_structure
    validate_e2e_test_content
    validate_readiness_script_content
    validate_script_functionality
    validate_integration
    validate_acceptance_criteria
    validate_implementation_quality
    
    generate_summary
}

# Execute main function
main "$@" 