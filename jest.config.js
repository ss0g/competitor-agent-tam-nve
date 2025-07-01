/** @type {import('ts-jest').JestConfigWithTsJest} */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Working Jest configuration for Phase 2
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^cheerio$': 'jest-mock',
    '^puppeteer$': 'jest-mock',
  },
  
  // Performance optimizations
  maxWorkers: '50%',
  testTimeout: 30000,
  cache: true,
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '<rootDir>/src/**/*.(test|spec).[jt]s?(x)'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*',
    '!**/node_modules/**'
  ],
  
  // Transform ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(cheerio|@\\w+)/)',
  ],
  
  // Global setup/teardown
  globalSetup: '<rootDir>/src/__tests__/setup/globalSetup.js',
  globalTeardown: '<rootDir>/src/__tests__/setup/globalTeardown.js',
  
  // Clean mocks
  clearMocks: true,
  restoreMocks: true,
};

module.exports = createJestConfig(customJestConfig); 