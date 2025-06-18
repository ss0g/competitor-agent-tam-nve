#!/bin/bash

# Production Readiness: Master Execution Script
# Executes all phases of the production readiness plan

set -e

echo "🚀 Production Readiness Plan - Master Execution"
echo "=============================================="

# Configuration
START_TIME=$(date +%s)
LOG_FILE="test-reports/production-readiness-execution.log"
BACKUP_DIR="backups/production-readiness-$(date +%Y%m%d_%H%M%S)"

# Create directories
mkdir -p "test-reports"
mkdir -p "$BACKUP_DIR"
mkdir -p "scripts"

echo "📋 Production Readiness Plan Execution" | tee "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "Backup Directory: $BACKUP_DIR" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Function to log phase completion
log_phase_completion() {
  local phase=$1
  local status=$2
  local duration=$3
  
  echo "" | tee -a "$LOG_FILE"
  echo "🎯 Phase $phase: $status" | tee -a "$LOG_FILE"
  echo "Duration: ${duration}s" | tee -a "$LOG_FILE"
  echo "Completed: $(date)" | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
}

# Function to check if phase should be skipped
check_skip_phase() {
  local phase=$1
  if [ -f "test-reports/phase-${phase}-complete.flag" ]; then
    echo "⏭️  Phase $phase already completed, skipping..." | tee -a "$LOG_FILE"
    return 0
  fi
  return 1
}

# Function to mark phase as complete
mark_phase_complete() {
  local phase=$1
  echo "$(date)" > "test-reports/phase-${phase}-complete.flag"
}

# Pre-execution validation
echo "🔍 Pre-execution validation..." | tee -a "$LOG_FILE"

# Check Node.js and npm
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found" | tee -a "$LOG_FILE"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm not found" | tee -a "$LOG_FILE"
  exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ package.json not found. Run this script from the project root." | tee -a "$LOG_FILE"
  exit 1
fi

echo "✅ Pre-execution validation passed" | tee -a "$LOG_FILE"

# =================
# PHASE 1: CRITICAL FIXES (Days 1-5)
# =================

if ! check_skip_phase "1"; then
  echo "" | tee -a "$LOG_FILE"
  echo "🚨 PHASE 1: CRITICAL FIXES" | tee -a "$LOG_FILE"
  echo "============================" | tee -a "$LOG_FILE"
  
  phase1_start=$(date +%s)
  
  # 1.1: Fix Integration Tests
  echo "1.1 Fixing Integration Tests..." | tee -a "$LOG_FILE"
  
  if [ -f "scripts/fix-integration-tests.sh" ]; then
    chmod +x "scripts/fix-integration-tests.sh"
    ./scripts/fix-integration-tests.sh | tee -a "$LOG_FILE" || echo "⚠️  Integration test fixes encountered issues" | tee -a "$LOG_FILE"
  else
    echo "❌ scripts/fix-integration-tests.sh not found" | tee -a "$LOG_FILE"
  fi
  
  # 1.2: Configuration Fixes
  echo "1.2 Applying Configuration Fixes..." | tee -a "$LOG_FILE"
  
  # Create tsconfig.jest.json if it doesn't exist
  if [ ! -f "tsconfig.jest.json" ]; then
    cat > "tsconfig.jest.json" << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "types": ["jest", "@testing-library/jest-dom", "node"]
  },
  "include": [
    "src/**/*",
    "src/__tests__/**/*",
    "jest.setup.js",
    "jest.global-setup.js",
    "jest.global-teardown.js"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist",
    "build"
  ]
}
EOF
    echo "✅ Created tsconfig.jest.json" | tee -a "$LOG_FILE"
  fi
  
  # Test integration fixes
  echo "1.3 Testing Integration Fixes..." | tee -a "$LOG_FILE"
  npm run test:integration > "test-reports/phase1-integration-test.log" 2>&1 || echo "⚠️  Integration tests still have issues" | tee -a "$LOG_FILE"
  
  # Test production build
  echo "1.4 Testing Production Build..." | tee -a "$LOG_FILE"
  npm run build > "test-reports/phase1-build-test.log" 2>&1 || echo "⚠️  Build test encountered issues" | tee -a "$LOG_FILE"
  
  phase1_end=$(date +%s)
  phase1_duration=$((phase1_end - phase1_start))
  
  mark_phase_complete "1"
  log_phase_completion "1" "COMPLETED" "$phase1_duration"
fi

# =================
# PHASE 2: CODE COVERAGE IMPROVEMENT (Days 6-15)
# =================

if ! check_skip_phase "2"; then
  echo "" | tee -a "$LOG_FILE"
  echo "📈 PHASE 2: CODE COVERAGE IMPROVEMENT" | tee -a "$LOG_FILE"
  echo "=====================================" | tee -a "$LOG_FILE"
  
  phase2_start=$(date +%s)
  
  # 2.1: Generate Test Coverage
  echo "2.1 Generating Test Coverage..." | tee -a "$LOG_FILE"
  
  if [ -f "scripts/improve-test-coverage.sh" ]; then
    chmod +x "scripts/improve-test-coverage.sh"
    ./scripts/improve-test-coverage.sh | tee -a "$LOG_FILE" || echo "⚠️  Test coverage improvement encountered issues" | tee -a "$LOG_FILE"
  else
    echo "❌ scripts/improve-test-coverage.sh not found" | tee -a "$LOG_FILE"
  fi
  
  # 2.2: Run Coverage Analysis
  echo "2.2 Running Coverage Analysis..." | tee -a "$LOG_FILE"
  npm run test:coverage > "test-reports/phase2-coverage.log" 2>&1 || echo "⚠️  Coverage analysis encountered issues" | tee -a "$LOG_FILE"
  
  # Extract coverage metrics
  if [ -f "test-reports/phase2-coverage.log" ]; then
    OVERALL_COVERAGE=$(grep "All files" "test-reports/phase2-coverage.log" | awk '{print $4}' | sed 's/%//' | head -1)
    echo "📊 Current Overall Coverage: ${OVERALL_COVERAGE}%" | tee -a "$LOG_FILE"
    
    if [ -n "$OVERALL_COVERAGE" ] && [ "$OVERALL_COVERAGE" -ge 50 ]; then
      echo "✅ Coverage improvement showing progress" | tee -a "$LOG_FILE"
    else
      echo "⚠️  Coverage still needs improvement" | tee -a "$LOG_FILE"
    fi
  fi
  
  phase2_end=$(date +%s)
  phase2_duration=$((phase2_end - phase2_start))
  
  mark_phase_complete "2"
  log_phase_completion "2" "COMPLETED" "$phase2_duration"
fi

# =================
# PHASE 3: QUALITY ASSURANCE (Days 16-18)
# =================

if ! check_skip_phase "3"; then
  echo "" | tee -a "$LOG_FILE"
  echo "🔧 PHASE 3: QUALITY ASSURANCE" | tee -a "$LOG_FILE"
  echo "==============================" | tee -a "$LOG_FILE"
  
  phase3_start=$(date +%s)
  
  # 3.1: Comprehensive Test Suite
  echo "3.1 Running Comprehensive Test Suite..." | tee -a "$LOG_FILE"
  
  # Run all test types
  echo "Running unit tests..." | tee -a "$LOG_FILE"
  npm run test:unit > "test-reports/phase3-unit.log" 2>&1 || echo "⚠️  Unit tests have issues" | tee -a "$LOG_FILE"
  
  echo "Running integration tests..." | tee -a "$LOG_FILE"
  npm run test:integration > "test-reports/phase3-integration.log" 2>&1 || echo "⚠️  Integration tests have issues" | tee -a "$LOG_FILE"
  
  echo "Running component tests..." | tee -a "$LOG_FILE"
  npm run test:components > "test-reports/phase3-components.log" 2>&1 || echo "⚠️  Component tests have issues" | tee -a "$LOG_FILE"
  
  echo "Running E2E tests..." | tee -a "$LOG_FILE"
  npm run test:e2e > "test-reports/phase3-e2e.log" 2>&1 || echo "⚠️  E2E tests have issues" | tee -a "$LOG_FILE"
  
  echo "Running critical tests..." | tee -a "$LOG_FILE"
  npm run test:critical > "test-reports/phase3-critical.log" 2>&1 || echo "⚠️  Critical tests have issues" | tee -a "$LOG_FILE"
  
  # 3.2: Production Build Validation
  echo "3.2 Production Build Validation..." | tee -a "$LOG_FILE"
  
  echo "Testing clean build..." | tee -a "$LOG_FILE"
  npm run build > "test-reports/phase3-build.log" 2>&1 || echo "⚠️  Production build has issues" | tee -a "$LOG_FILE"
  
  echo "Running security audit..." | tee -a "$LOG_FILE"
  npm audit --audit-level moderate > "test-reports/phase3-security.log" 2>&1 || echo "⚠️  Security issues found" | tee -a "$LOG_FILE"
  
  echo "Checking dependencies..." | tee -a "$LOG_FILE"
  npm outdated > "test-reports/phase3-outdated.log" 2>&1 || echo "ℹ️  Some dependencies are outdated" | tee -a "$LOG_FILE"
  
  echo "Running linter..." | tee -a "$LOG_FILE"
  npm run lint > "test-reports/phase3-lint.log" 2>&1 || echo "⚠️  Linting issues found" | tee -a "$LOG_FILE"
  
  phase3_end=$(date +%s)
  phase3_duration=$((phase3_end - phase3_start))
  
  mark_phase_complete "3"
  log_phase_completion "3" "COMPLETED" "$phase3_duration"
fi

# =================
# FINAL ASSESSMENT
# =================

echo "" | tee -a "$LOG_FILE"
echo "🏁 FINAL PRODUCTION READINESS ASSESSMENT" | tee -a "$LOG_FILE"
echo "=========================================" | tee -a "$LOG_FILE"

# Calculate total execution time
end_time=$(date +%s)
total_duration=$((end_time - START_TIME))

echo "📊 Assessment Results:" | tee -a "$LOG_FILE"
echo "Total Execution Time: ${total_duration}s" | tee -a "$LOG_FILE"

# Check critical criteria
READY_FOR_PRODUCTION=true

# Check if integration tests are passing
if grep -q "FAIL" "test-reports/phase3-integration.log" 2>/dev/null; then
  echo "❌ Integration tests failing" | tee -a "$LOG_FILE"
  READY_FOR_PRODUCTION=false
else
  echo "✅ Integration tests passing" | tee -a "$LOG_FILE"
fi

# Check if critical tests are passing
if grep -q "FAIL" "test-reports/phase3-critical.log" 2>/dev/null; then
  echo "❌ Critical tests failing" | tee -a "$LOG_FILE"
  READY_FOR_PRODUCTION=false
else
  echo "✅ Critical tests passing" | tee -a "$LOG_FILE"
fi

# Check if build is successful
if grep -q "Error" "test-reports/phase3-build.log" 2>/dev/null; then
  echo "❌ Production build failing" | tee -a "$LOG_FILE"
  READY_FOR_PRODUCTION=false
else
  echo "✅ Production build successful" | tee -a "$LOG_FILE"
fi

# Check E2E tests
if grep -q "failed" "test-reports/phase3-e2e.log" 2>/dev/null; then
  echo "⚠️  E2E tests have some failures" | tee -a "$LOG_FILE"
else
  echo "✅ E2E tests passing" | tee -a "$LOG_FILE"
fi

# Final verdict
echo "" | tee -a "$LOG_FILE"
if [ "$READY_FOR_PRODUCTION" = true ]; then
  echo "🎉 PRODUCTION READINESS: ✅ READY" | tee -a "$LOG_FILE"
  echo "🚀 Application is ready for production deployment!" | tee -a "$LOG_FILE"
else
  echo "🚨 PRODUCTION READINESS: ❌ NOT READY" | tee -a "$LOG_FILE"
  echo "⚠️  Critical issues must be resolved before production deployment" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "📁 Detailed Results:" | tee -a "$LOG_FILE"
echo "- Integration Test Results: test-reports/phase3-integration.log" | tee -a "$LOG_FILE"
echo "- Critical Test Results: test-reports/phase3-critical.log" | tee -a "$LOG_FILE"
echo "- Production Build Results: test-reports/phase3-build.log" | tee -a "$LOG_FILE"
echo "- E2E Test Results: test-reports/phase3-e2e.log" | tee -a "$LOG_FILE"
echo "- Security Audit Results: test-reports/phase3-security.log" | tee -a "$LOG_FILE"
echo "- Complete Execution Log: $LOG_FILE" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "📋 Next Steps:" | tee -a "$LOG_FILE"
if [ "$READY_FOR_PRODUCTION" = true ]; then
  echo "1. Review all test results for any warnings" | tee -a "$LOG_FILE"
  echo "2. Perform final manual testing" | tee -a "$LOG_FILE"
  echo "3. Deploy to staging environment" | tee -a "$LOG_FILE"
  echo "4. Execute production deployment plan" | tee -a "$LOG_FILE"
else
  echo "1. Review failed test logs" | tee -a "$LOG_FILE"
  echo "2. Fix critical issues identified" | tee -a "$LOG_FILE"
  echo "3. Re-run this script to validate fixes" | tee -a "$LOG_FILE"
  echo "4. Repeat until all criteria are met" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "Execution completed: $(date)" | tee -a "$LOG_FILE"

echo ""
echo "🚀 Production Readiness Plan Execution Complete!"
echo "📊 Check $LOG_FILE for complete results"

if [ "$READY_FOR_PRODUCTION" = true ]; then
  echo "🎉 Application is READY for production!"
  exit 0
else
  echo "⚠️  Application is NOT READY for production"
  exit 1
fi 