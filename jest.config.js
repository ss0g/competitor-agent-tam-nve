/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Enhanced transform ignore patterns - Fix 4.1
  // Ensure ts-jest is prioritized over babel and avoid transformation conflicts
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
    // Prevent babel from processing TypeScript declaration files
    '\\.d\\.ts$',
  ],
  
  // Disable babel parsing in favor of ts-jest
  extensionsToTreatAsEsm: [],
  
  // Global setup and configuration
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
  
  // Performance optimizations
  maxWorkers: process.env.CI ? 2 : '50%', // Reduced parallelism in CI
  testTimeout: 30000, // Increased timeout for CI/CD stability
  workerIdleMemoryLimit: '1GB', // Memory management for CI
  
  // Path mapping - enhanced for better resolution with specific Prisma fix
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    // Specific Prisma mapping to fix module resolution
    '^@/lib/prisma$': '<rootDir>/src/lib/prisma',
  },
  
  // Enhanced TypeScript support - Fix 4.1 optimization
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
      isolatedModules: true,
      useESM: false,
      // Disable Babel parsing for TypeScript files
      babelConfig: false,
    }],
    // Only use babel-jest for pure JavaScript files
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Prioritize TypeScript extensions to ensure ts-jest handles them first
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/dist/', '/build/'],
  
  // Enhanced globals configuration - Fix 3.1
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: false,
      tsconfig: 'tsconfig.jest.json',
    },
  },
  
  // Multiple test environments for different test types
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/services/(.*)$': '<rootDir>/src/services/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/lib/prisma$': '<rootDir>/src/lib/prisma',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
          isolatedModules: true,
          useESM: false,
          babelConfig: false,
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/services/(.*)$': '<rootDir>/src/services/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/lib/prisma$': '<rootDir>/src/lib/prisma',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
          isolatedModules: true,
          useESM: false,
          babelConfig: false,
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
    },
    {
      displayName: 'component',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/__tests__/components/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/services/(.*)$': '<rootDir>/src/services/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/lib/prisma$': '<rootDir>/src/lib/prisma',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
          isolatedModules: true,
          useESM: false,
          babelConfig: false,
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/e2e/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/services/(.*)$': '<rootDir>/src/services/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/lib/prisma$': '<rootDir>/src/lib/prisma',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
          isolatedModules: true,
          useESM: false,
          babelConfig: false,
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
    },
    {
      displayName: 'performance',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/performance/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/services/(.*)$': '<rootDir>/src/services/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/lib/prisma$': '<rootDir>/src/lib/prisma',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
          isolatedModules: true,
          useESM: false,
          babelConfig: false,
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
    },
    {
      displayName: 'regression',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/regression/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/services/(.*)$': '<rootDir>/src/services/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@/lib/prisma$': '<rootDir>/src/lib/prisma',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
          isolatedModules: true,
          useESM: false,
          babelConfig: false,
        }],
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
    }
  ],
  
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/types/**/*',
    '!src/__tests__/**/*',
    '!src/**/index.ts', // Exclude barrel exports
  ],
  
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/lib/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  
  // Enhanced reporting
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports',
      filename: 'regression-test-report.html',
      openReport: false,
      expand: false, // Don't expand all test results for better performance
    }],
    ['jest-junit', {
      outputDirectory: './test-reports',
      outputName: 'junit.xml',
    }],
  ],
  
  // Enhanced caching for performance
  cache: true,
  cacheDirectory: './node_modules/.cache/jest',
  
  // Improved mock handling - Fix 3.1 enhancement
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Performance optimizations
  detectOpenHandles: false, // Disable for better performance in CI
  forceExit: false, // Let Jest exit gracefully
  verbose: true,
  
  // Retry configuration for flaky tests
  testRetryTimes: process.env.CI ? 2 : 0, // Retry failed tests in CI
  bail: false, // Continue running tests even after failures
}; 