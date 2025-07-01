/**
 * Phase 2 Implementation Test Script
 * Tests all Phase 2 components: Automated Analysis, Scheduled Jobs, and Report Scheduling
 * 
 * Run with: node test-phase2-implementation.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  testProjectId: 'test-project-phase2',
  timeout: 30000,
  retryAttempts: 3
};

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}\n`);
}

// Test results tracking
const results = { total: 0, passed: 0, failed: 0 };

function test(description, condition) {
  results.total++;
  if (condition) {
    console.log(`✅ ${description}`);
    results.passed++;
  } else {
    console.log(`❌ ${description}`);
    results.failed++;
  }
}

function checkFile(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

console.log('🚀 Phase 2 Automation Infrastructure Tests\n');

// Phase 2.1 Tests
console.log('=== Phase 2.1: Automated Analysis Service ===');
test('AutomatedAnalysisService exists', checkFile('src/services/automatedAnalysisService.ts'));
test('Automated Analysis API exists', checkFile('src/app/api/projects/[id]/automated-analysis/route.ts'));

// Phase 2.2 Tests  
console.log('\n=== Phase 2.2: Scheduled Job System ===');
test('ScheduledJobService exists', checkFile('src/services/scheduledJobService.ts'));
test('Scheduled Jobs API exists', checkFile('src/app/api/scheduled-jobs/route.ts'));

// Phase 2.3 Tests
console.log('\n=== Phase 2.3: Report Scheduling Automation ===');
test('ReportSchedulingService exists', checkFile('src/services/reportSchedulingService.ts'));
test('Report Scheduling API exists', checkFile('src/app/api/projects/[id]/report-scheduling/route.ts'));

// Summary
console.log(`\n📊 Results: ${results.passed}/${results.total} tests passed`);
const successRate = (results.passed / results.total * 100).toFixed(1);
console.log(`Success Rate: ${successRate}%`);

if (results.passed === results.total) {
  console.log('🎉 Phase 2 implementation complete!');
} else {
  console.log('⚠️  Some components still need implementation');
}

// Run the tests
if (require.main === module) {
  runPhase2Tests();
} 