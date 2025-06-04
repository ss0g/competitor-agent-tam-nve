/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Global setup and configuration
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
  
  // Path mapping - enhanced for better resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  
  // TypeScript transformation
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  
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
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
        }],
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
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
        }],
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
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
        }],
      },
    },
    {
      displayName: 'regression',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/regression/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      testTimeout: 60000, // Longer timeout for regression tests
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/services/(.*)$': '<rootDir>/src/services/$1',
        '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
        }],
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
    }],
    ['jest-junit', {
      outputDirectory: './test-reports',
      outputName: 'junit.xml',
    }],
  ],
  
  // Test result cache for performance
  cache: true,
  cacheDirectory: './node_modules/.cache/jest',
}; 