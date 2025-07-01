/**
 * Lightweight Unit Test Setup - Phase 2 Performance Optimization
 * Minimal setup for fast unit test execution
 */

// Minimal global setup for unit tests
global.console = {
  ...console,
  // Reduce console noise in tests for better performance
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error // Keep errors visible
};

// Fast mock implementations - removed global logger mock due to module resolution
// Individual tests can mock logger as needed

// Mock Prisma for all unit tests
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    reportSchedule: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    report: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    productSnapshot: {
      findFirst: jest.fn(),
      findMany: jest.fn()
    }
  })),
  ReportScheduleFrequency: {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY'
  },
  ReportScheduleStatus: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    PAUSED: 'PAUSED'
  }
}));

// Configure test timeout
jest.setTimeout(15000);

// Global test performance tracking
if (process.env.NODE_ENV === 'test') {
  global.testStartTime = Date.now();
  
  afterEach(() => {
    // Clean up after each test for consistent performance
    jest.clearAllMocks();
  });
} 