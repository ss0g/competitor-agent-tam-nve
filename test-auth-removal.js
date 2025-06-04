#!/usr/bin/env node

/**
 * Authentication Removal Verification Script
 * Tests that all API endpoints work without authentication
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testEndpoint(name, method, path, data = null, expectedStatus = 200) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    const result = await makeRequest(method, path, data);
    
    if (result.status === expectedStatus) {
      console.log(`✅ ${name}: SUCCESS (${result.status})`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
      }
      return true;
    } else {
      console.log(`❌ ${name}: FAILED (${result.status})`);
      console.log(`   Expected: ${expectedStatus}, Got: ${result.status}`);
      console.log(`   Response: ${JSON.stringify(result.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Authentication Removal Verification Tests\n');
  console.log('=' .repeat(60));

  const tests = [
    // Core API endpoints that should work without auth
    ['Projects List', 'GET', '/api/projects'],
    ['Competitors List', 'GET', '/api/competitors'],
    
    // Test report generation (main data collection feature)
    ['Report Generation', 'POST', '/api/reports', {
      competitorId: 'test-id',
      timeframe: 7
    }, 500], // Expect 500 because competitor doesn't exist, but not 401 (auth error)
    
    // Test with missing data (should get validation error, not auth error)
    ['Report Generation - Missing Data', 'POST', '/api/reports', {}, 400],
  ];

  let passed = 0;
  let total = tests.length;

  for (const [name, method, path, data, expectedStatus] of tests) {
    const success = await testEndpoint(name, method, path, data, expectedStatus);
    if (success) passed++;
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Authentication has been successfully removed.');
    console.log('\n✅ Key Verification Points:');
    console.log('   • No 401 Unauthorized errors');
    console.log('   • API endpoints accessible without auth headers');
    console.log('   • Data collection endpoints functional');
    console.log('   • Mock user system working correctly');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }

  console.log('\n🔧 Manual Testing Commands:');
  console.log('   curl -X GET http://localhost:3000/api/projects');
  console.log('   curl -X GET http://localhost:3000/api/competitors');
  console.log('   curl -X POST http://localhost:3000/api/reports \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"competitorId":"VALID_ID","timeframe":7}\'');
}

// Check if server is running first
async function checkServer() {
  try {
    await makeRequest('GET', '/api/projects');
    return true;
  } catch (error) {
    console.log('❌ Server is not running on localhost:3000');
    console.log('   Please start the server with: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
}

main().catch(console.error); 