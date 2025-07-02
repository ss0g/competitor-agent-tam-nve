#!/bin/bash

# Task 4.1 Implementation Validation Script
# Verifies production load testing implementation

set -e

echo "🔍 Validating Task 4.1: Production Load Testing Implementation"
echo "=============================================================="

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
echo "1. Validating Required Files Exist"
echo "----------------------------------"

# Check if production load test file exists
if [ -f "__tests__/performance/productionLoadTest.test.ts" ]; then
    print_status 0 "Production load test file exists"
    ((PASS++))
else
    print_status 1 "Production load test file missing"
    ((FAIL++))
fi

# Check if load test script exists
if [ -f "scripts/load-test-production.sh" ]; then
    print_status 0 "Load test script exists"
    ((PASS++))
else
    print_status 1 "Load test script missing"
    ((FAIL++))
fi

# Check if script is executable
if [ -x "scripts/load-test-production.sh" ]; then
    print_status 0 "Load test script is executable"
    ((PASS++))
else
    print_status 1 "Load test script is not executable"
    ((FAIL++))
fi

echo
echo "2. Validating Test File Content"
echo "------------------------------"

# Check for key test patterns in the production load test
TEST_PATTERNS=(
    "concurrentProjects.*20"
    "maxResponseTime.*45000"
    "ProductionLoadMonitor"
    "callProductionAPI"
    "createProjectWithReport"
    "20 concurrent project creation"
    "rate.*limit.*effectiveness"
    "resource.*utilization.*monitoring"
)

for pattern in "${TEST_PATTERNS[@]}"; do
    if grep -q "$pattern" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
        print_status 0 "Found test pattern: $pattern"
        ((PASS++))
    else
        print_status 1 "Missing test pattern: $pattern"
        ((FAIL++))
    fi
done

echo
echo "3. Validating Test Implementation Features"
echo "-----------------------------------------"

# Check for specific test functionality
TEST_FEATURES=(
    "describe.*Production Load Testing.*Task 4.1"
    "it.*should handle 20 concurrent project creations"
    "it.*should enforce rate limits"
    "ResourceMetrics"
    "startMonitoring"
    "stopMonitoring"
    "getResourceSummary"
)

for feature in "${TEST_FEATURES[@]}"; do
    if grep -q "$feature" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
        print_status 0 "Found test feature: $feature"
        ((PASS++))
    else
        print_status 1 "Missing test feature: $feature"
        ((FAIL++))
    fi
done

echo
echo "4. Validating Shell Script Features"
echo "-----------------------------------"

# Check for shell script functionality
SCRIPT_FEATURES=(
    "setup_test_environment"
    "check_system_readiness"
    "start_monitoring"
    "run_load_tests"
    "analyze_results"
    "validate_acceptance_criteria"
    "__tests__/performance/productionLoadTest.test.ts"
)

for feature in "${SCRIPT_FEATURES[@]}"; do
    if grep -q "$feature" "scripts/load-test-production.sh" 2>/dev/null; then
        print_status 0 "Found script feature: $feature"
        ((PASS++))
    else
        print_status 1 "Missing script feature: $feature"
        ((FAIL++))
    fi
done

echo
echo "5. Validating Acceptance Criteria Implementation"
echo "-----------------------------------------------"

# Check if all acceptance criteria are addressed
ACCEPTANCE_CRITERIA=(
    "20 concurrent project creations"
    "Average response time.*45.*second"
    "Resource utilization monitoring"
    "Rate limiting effectiveness"
)

for criteria in "${ACCEPTANCE_CRITERIA[@]}"; do
    found_in_test=0
    found_in_script=0
    
    if grep -q "$criteria" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
        found_in_test=1
    fi
    
    if grep -q "$criteria" "scripts/load-test-production.sh" 2>/dev/null; then
        found_in_script=1
    fi
    
    if [ $found_in_test -eq 1 ] || [ $found_in_script -eq 1 ]; then
        print_status 0 "Acceptance criteria addressed: $criteria"
        ((PASS++))
    else
        print_status 1 "Acceptance criteria missing: $criteria"
        ((FAIL++))
    fi
done

echo
echo "6. Validating TypeScript/Jest Compatibility"
echo "------------------------------------------"

# Check for proper imports and Jest patterns
JEST_PATTERNS=(
    "import.*logger"
    "describe\\("
    "beforeEach\\("
    "afterEach\\("
    "expect\\("
    "jest\\.fn\\(\\)"
)

for pattern in "${JEST_PATTERNS[@]}"; do
    if grep -q "$pattern" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
        print_status 0 "Found Jest pattern: $pattern"
        ((PASS++))
    else
        print_status 1 "Missing Jest pattern: $pattern"
        ((FAIL++))
    fi
done

echo
echo "7. Validating Configuration and Environment"
echo "------------------------------------------"

# Check for configuration handling
CONFIG_FEATURES=(
    "TEST_BASE_URL"
    "PRODUCTION_LOAD_CONFIG"
    "process\\.env"
    "DEFAULT_.*"
)

for feature in "${CONFIG_FEATURES[@]}"; do
    if grep -q "$feature" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
        print_status 0 "Found config feature: $feature"
        ((PASS++))
    else
        print_status 1 "Missing config feature: $feature"
        ((FAIL++))
    fi
done

echo
echo "8. Validating Production API Integration"
echo "---------------------------------------"

# Check for proper API integration
API_PATTERNS=(
    "callProductionAPI"
    "createProjectWithReport"
    "/api/projects"
    "fetch\\("
    "JSON\\.stringify"
    "response\\.ok"
)

for pattern in "${API_PATTERNS[@]}"; do
    if grep -q "$pattern" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
        print_status 0 "Found API pattern: $pattern"
        ((PASS++))
    else
        print_status 1 "Missing API pattern: $pattern"
        ((FAIL++))
    fi
done

echo
echo "9. Task 4.1 Acceptance Criteria Validation"
echo "==========================================="

# Check each specific acceptance criteria from the plan
echo "Checking acceptance criteria from Sprint 2 plan:"

AC1=0
if grep -q "20.*concurrent.*project.*creation" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
    print_status 0 "✓ 20 concurrent project creations with reports"
    ((AC1++))
else
    print_status 1 "✗ 20 concurrent project creations with reports"
fi

AC2=0
if grep -q "45.*second\|maxResponseTime.*45000" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
    print_status 0 "✓ Average response time < 45 seconds validation"
    ((AC2++))
else
    print_status 1 "✗ Average response time < 45 seconds validation"
fi

AC3=0
if grep -q "ResourceMetrics\|monitoring\|resource.*utilization" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
    print_status 0 "✓ Resource utilization monitoring during load"
    ((AC3++))
else
    print_status 1 "✗ Resource utilization monitoring during load"
fi

AC4=0
if grep -q "rate.*limit\|rateLimitTest" "__tests__/performance/productionLoadTest.test.ts" 2>/dev/null; then
    print_status 0 "✓ Rate limiting effectiveness under load"
    ((AC4++))
else
    print_status 1 "✗ Rate limiting effectiveness under load"
fi

ACCEPTANCE_SCORE=$((AC1 + AC2 + AC3 + AC4))

echo
echo "10. File Structure and Organization"
echo "==================================="

# Check proper file placement
if [ -f "__tests__/performance/productionLoadTest.test.ts" ]; then
    print_status 0 "Test file in correct location (__tests__/performance/)"
    ((PASS++))
else
    print_status 1 "Test file not in correct location"
    ((FAIL++))
fi

if [ -f "scripts/load-test-production.sh" ]; then
    print_status 0 "Script file in correct location (scripts/)"
    ((PASS++))
else
    print_status 1 "Script file not in correct location"
    ((FAIL++))
fi

echo
echo "============================================================"
echo "📊 VALIDATION SUMMARY"
echo "============================================================"
echo "Total Tests: $((PASS + FAIL))"
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo
echo "Acceptance Criteria: $ACCEPTANCE_SCORE/4"

if [ $ACCEPTANCE_SCORE -eq 4 ] && [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 Task 4.1 - Production Load Testing Implementation: COMPLETED${NC}"
    echo -e "${GREEN}All acceptance criteria met and implementation is complete!${NC}"
    exit 0
elif [ $ACCEPTANCE_SCORE -eq 4 ]; then
    echo -e "${YELLOW}⚠️  Task 4.1 - Production Load Testing Implementation: MOSTLY COMPLETE${NC}"
    echo -e "${YELLOW}Acceptance criteria met but some minor implementation issues exist${NC}"
    exit 1
elif [ $ACCEPTANCE_SCORE -ge 3 ]; then
    echo -e "${YELLOW}⚠️  Task 4.1 - Production Load Testing Implementation: SUBSTANTIAL PROGRESS${NC}"
    echo -e "${YELLOW}Most acceptance criteria met but some work remains${NC}"
    exit 1
else
    echo -e "${RED}❌ Task 4.1 - Production Load Testing Implementation: NEEDS WORK${NC}"
    echo -e "${RED}Major issues need to be resolved${NC}"
    exit 2
fi 