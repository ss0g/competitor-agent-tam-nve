/**
 * Phase 1.3 Implementation Tests - Enhanced Project Creation API
 * 
 * Tests the implementation of:
 * - Auto-activation of projects (status: ACTIVE)
 * - Automatic product creation during project setup
 * - Smart scheduling trigger on project creation
 * - Validation for required product website field
 * - End-to-end integration with existing services
 */

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = `${BASE_URL}/api/projects`;

// Test utilities
function generateCorrelationId() {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Color utilities for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

/**
 * Test 1: Project Auto-Activation
 * Verifies that new projects are automatically activated (status: ACTIVE)
 */
async function testProjectAutoActivation() {
  logInfo('Testing project auto-activation...');
  
  const testProject = {
    name: `Test Auto-Activation ${Date.now()}`,
    description: 'Testing auto-activation of projects',
    productName: 'Test Product Auto-Activation',
    productWebsite: 'https://example-auto-activation.com',
    positioning: 'Testing auto-activation functionality',
    industry: 'Testing'
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProject)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    // Verify auto-activation
    if (result.status === 'ACTIVE') {
      logSuccess(`Project auto-activated: ${result.name} (ID: ${result.id})`);
      return { success: true, projectId: result.id, project: result };
    } else {
      logError(`Project not auto-activated. Status: ${result.status}`);
      return { success: false, error: `Expected ACTIVE status, got ${result.status}` };
    }

  } catch (error) {
    logError(`Project auto-activation test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Smart Scheduling Integration
 * Verifies that smart scheduling is triggered on project creation
 */
async function testSmartSchedulingIntegration() {
  logInfo('Testing smart scheduling integration...');
  
  const testProject = {
    name: `Test Smart Scheduling ${Date.now()}`,
    description: 'Testing smart scheduling trigger on project creation',
    productName: 'Test Product Smart Scheduling',
    productWebsite: 'https://example-smart-scheduling.com',
    positioning: 'Testing smart scheduling integration',
    industry: 'Testing'
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProject)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    // Verify smart scheduling status
    if (result.smartScheduling) {
      logSuccess(`Smart scheduling triggered: Tasks executed: ${result.smartScheduling.tasksExecuted}`);
      logInfo(`Smart scheduling details: ${JSON.stringify(result.smartScheduling, null, 2)}`);
      return { success: true, projectId: result.id, smartScheduling: result.smartScheduling };
    } else {
      logWarning('Smart scheduling status not found in response');
      return { success: false, error: 'Smart scheduling status missing from response' };
    }

  } catch (error) {
    logError(`Smart scheduling integration test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Product Website Validation
 * Verifies that productWebsite is required and validation works
 */
async function testProductWebsiteValidation() {
  logInfo('Testing product website validation...');
  
  const testProjectWithoutWebsite = {
    name: `Test Validation ${Date.now()}`,
    description: 'Testing validation without product website',
    productName: 'Test Product Without Website',
    // productWebsite: missing intentionally
    positioning: 'Testing validation',
    industry: 'Testing'
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProjectWithoutWebsite)
    });

    if (response.status === 400) {
      const error = await response.json();
      if (error.error && error.error.includes('Product website is required')) {
        logSuccess('Product website validation working correctly');
        return { success: true, validation: 'Product website required validation passed' };
      } else {
        logError(`Unexpected validation error: ${error.error}`);
        return { success: false, error: `Unexpected validation error: ${error.error}` };
      }
    } else {
      logError(`Expected validation error (400), got ${response.status}`);
      return { success: false, error: `Expected validation to fail, but got ${response.status}` };
    }

  } catch (error) {
    logError(`Product website validation test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: End-to-End Project Creation Flow
 * Tests the complete flow including product creation and smart scheduling
 */
async function testEndToEndProjectCreation() {
  logInfo('Testing end-to-end project creation flow...');
  
  const testProject = {
    name: `Test E2E Flow ${Date.now()}`,
    description: 'Testing complete end-to-end project creation',
    productName: 'Test Product E2E',
    productWebsite: 'https://example-e2e.com',
    positioning: 'Market leader in testing solutions',
    customerData: 'QA engineers and testing teams',
    userProblem: 'Need reliable testing frameworks',
    industry: 'Software Testing',
    autoAssignCompetitors: true,
    frequency: 'weekly',
    autoGenerateInitialReport: true
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProject)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    // Verify all components
    const checks = {
      projectCreated: !!result.id,
      autoActivated: result.status === 'ACTIVE',
      productCreated: !!result.product,
      smartSchedulingTriggered: !!result.smartScheduling,
      hasCorrelationId: !!result.correlationId
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    if (passedChecks === totalChecks) {
      logSuccess(`End-to-end flow completed successfully (${passedChecks}/${totalChecks} checks passed)`);
      logInfo(`Project ID: ${result.id}`);
      logInfo(`Product ID: ${result.product.id}`);
      logInfo(`Smart Scheduling Tasks: ${result.smartScheduling?.tasksExecuted || 0}`);
      return { success: true, projectId: result.id, result, checks };
    } else {
      logError(`End-to-end flow partially failed (${passedChecks}/${totalChecks} checks passed)`);
      logInfo(`Failed checks: ${Object.entries(checks).filter(([k,v]) => !v).map(([k,v]) => k).join(', ')}`);
      return { success: false, checks, partialResult: result };
    }

  } catch (error) {
    logError(`End-to-end project creation test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Smart Scheduling API Endpoint
 * Tests the smart scheduling endpoint directly after project creation
 */
async function testSmartSchedulingAPIEndpoint(projectId) {
  logInfo(`Testing smart scheduling API endpoint for project ${projectId}...`);
  
  try {
    // Wait a moment for project to be fully created
    await delay(1000);

    const response = await fetch(`${BASE_URL}/api/projects/${projectId}/smart-scheduling`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    if (result.triggered !== undefined) {
      logSuccess(`Smart scheduling API endpoint working: Triggered: ${result.triggered}, Tasks: ${result.tasksExecuted}`);
      return { success: true, result };
    } else {
      logError('Smart scheduling API endpoint response invalid');
      return { success: false, error: 'Invalid response structure' };
    }

  } catch (error) {
    logError(`Smart scheduling API endpoint test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runPhase13Tests() {
  console.log(`${colors.cyan}🚀 Starting Phase 1.3 Implementation Tests${colors.reset}`);
  console.log(`${colors.cyan}=================================================${colors.reset}\n`);

  const testResults = {
    autoActivation: null,
    smartSchedulingIntegration: null,
    websiteValidation: null,
    endToEndFlow: null,
    smartSchedulingAPI: null
  };

  // Test 1: Project Auto-Activation
  testResults.autoActivation = await testProjectAutoActivation();
  await delay(1000);

  // Test 2: Smart Scheduling Integration
  testResults.smartSchedulingIntegration = await testSmartSchedulingIntegration();
  await delay(1000);

  // Test 3: Product Website Validation
  testResults.websiteValidation = await testProductWebsiteValidation();
  await delay(1000);

  // Test 4: End-to-End Project Creation Flow
  testResults.endToEndFlow = await testEndToEndProjectCreation();
  await delay(1000);

  // Test 5: Smart Scheduling API Endpoint (if we have a project ID)
  if (testResults.endToEndFlow?.success && testResults.endToEndFlow.projectId) {
    testResults.smartSchedulingAPI = await testSmartSchedulingAPIEndpoint(testResults.endToEndFlow.projectId);
  }

  // Summary
  console.log(`\n${colors.cyan}📊 Phase 1.3 Test Results Summary${colors.reset}`);
  console.log(`${colors.cyan}===================================${colors.reset}`);

  const tests = [
    { name: 'Project Auto-Activation', result: testResults.autoActivation },
    { name: 'Smart Scheduling Integration', result: testResults.smartSchedulingIntegration },
    { name: 'Product Website Validation', result: testResults.websiteValidation },
    { name: 'End-to-End Project Creation', result: testResults.endToEndFlow },
    { name: 'Smart Scheduling API Endpoint', result: testResults.smartSchedulingAPI }
  ];

  let passedTests = 0;
  tests.forEach(test => {
    if (test.result?.success) {
      logSuccess(`${test.name}: PASSED`);
      passedTests++;
    } else {
      logError(`${test.name}: FAILED`);
      if (test.result?.error) {
        console.log(`   Error: ${test.result.error}`);
      }
    }
  });

  const totalTests = tests.filter(t => t.result !== null).length;
  const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

  console.log(`\n${colors.cyan}🎯 Overall Results: ${passedTests}/${totalTests} tests passed (${successRate}%)${colors.reset}`);

  if (passedTests === totalTests) {
    logSuccess('🎉 Phase 1.3 Implementation: ALL TESTS PASSED! 🎉');
    console.log(`${colors.green}✅ Enhanced Project Creation API is working correctly${colors.reset}`);
    console.log(`${colors.green}✅ Auto-activation implemented successfully${colors.reset}`);
    console.log(`${colors.green}✅ Smart scheduling integration functional${colors.reset}`);
    console.log(`${colors.green}✅ Product website validation working${colors.reset}`);
    console.log(`${colors.green}✅ End-to-end flow complete${colors.reset}`);
  } else {
    logWarning(`⚠️  Phase 1.3 Implementation: ${totalTests - passedTests} test(s) failed`);
    console.log(`${colors.yellow}Please review the failed tests and fix the implementation${colors.reset}`);
  }

  return testResults;
}

// Run tests if called directly
if (require.main === module) {
  runPhase13Tests()
    .then(results => {
      console.log(`\n${colors.cyan}Test execution completed.${colors.reset}`);
      process.exit(0);
    })
    .catch(error => {
      logError(`Test execution failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  runPhase13Tests,
  testProjectAutoActivation,
  testSmartSchedulingIntegration,
  testProductWebsiteValidation,
  testEndToEndProjectCreation,
  testSmartSchedulingAPIEndpoint
}; 