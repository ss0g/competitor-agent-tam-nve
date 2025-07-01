/**
 * Global Test Setup - Phase 2 Performance Optimization
 * Minimal global setup for fast test execution
 */

module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXT_TELEMETRY_DISABLED = '1';
  
  // Disable console output for performance (except errors)
  if (!process.env.VERBOSE_TESTS) {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.warn = () => {};
  }
  
  // Create test directories if they don't exist
  const fs = require('fs');
  const path = require('path');
  
  const testDirs = [
    'test-reports',
    'test-reports/screenshots',
    'test-reports/artifacts'
  ];
  
  testDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  console.error('✅ Global test setup complete - Phase 2 optimized');
}; 