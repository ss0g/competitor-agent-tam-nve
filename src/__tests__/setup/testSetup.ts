/**
 * Phase 5.3: Global Test Setup
 * Automatically handles resource cleanup to prevent worker process issues
 */

import { setupTestEnvironment } from '../utils/testCleanup';

// Global test environment setup
setupTestEnvironment();

// Enhanced console methods for better test debugging
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Filter out known test warnings that are expected
  const message = args[0]?.toString() || '';
  
  if (
    message.includes('Warning: ReactDOM.render is deprecated') ||
    message.includes('Warning: componentWillReceiveProps has been renamed') ||
    message.includes('act(...)') ||
    message.includes('Not implemented: navigation')
  ) {
    return; // Suppress known React/Jest warnings
  }
  
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  
  if (
    message.includes('componentWillReceiveProps') ||
    message.includes('componentWillMount') ||
    message.includes('findDOMNode is deprecated')
  ) {
    return; // Suppress known React warnings
  }
  
  originalConsoleWarn(...args);
};

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Ensure proper cleanup on process exit
process.on('exit', () => {
  // Final cleanup
});

// Set longer timeout for tests that might need cleanup
jest.setTimeout(30000);

// Global test utilities
(global as any).testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  flushPromises: () => new Promise(resolve => setImmediate(resolve)),
}; 