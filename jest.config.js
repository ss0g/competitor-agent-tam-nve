/** @type {import('ts-jest').JestConfigWithTsJest} */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Working Jest configuration for Phase 2
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Module resolution - Fix 1.1: Enhanced ES module mappings
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^cheerio$': 'jest-mock',
    '^puppeteer$': 'jest-mock',
    // ES Module mappings for problematic packages
    '^uuid$': 'uuid',
    '^p-limit$': 'p-limit',
    '^msgpackr$': 'msgpackr',
    '^yocto-queue$': 'yocto-queue',
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
  
  // Transform ES modules - Fix 1.1: Complete ES module support
  transformIgnorePatterns: [
    'node_modules/(?!(p-limit|msgpackr|uuid|yocto-queue|cheerio|launchdarkly-node-server-sdk|@\\w+)/)',
  ],
  
  // ES Module support - Fix 1.1: Complete configuration
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  preset: 'ts-jest/presets/default-esm',
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        module: 'esnext'
      }
    }
  },
  
  // Fix 1.1: Additional ES module support
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true
    }]
  },
  
  // Enable dynamic imports and other ES features
  resolver: undefined,
  
  // Global setup/teardown
  globalSetup: '<rootDir>/src/__tests__/setup/globalSetup.js',
  globalTeardown: '<rootDir>/src/__tests__/setup/globalTeardown.js',
  
  // Clean mocks
  clearMocks: true,
  restoreMocks: true,
};

module.exports = createJestConfig(customJestConfig); 