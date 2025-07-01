/**
 * Integration Test Setup - Phase 2 Performance Optimization
 * Setup for integration tests with minimal overhead
 */

// Mock external services for integration tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Configure longer timeout for integration tests
jest.setTimeout(60000);

// Setup test environment
global.console = {
  ...console,
  // Keep some console output for integration tests but reduce noise
  debug: jest.fn(),
  log: process.env.VERBOSE_TESTS ? console.log : jest.fn()
};

// Global cleanup after each integration test
afterEach(async () => {
  // Clean up any file system changes
  jest.clearAllMocks();
}); 