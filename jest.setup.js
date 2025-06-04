const { TextEncoder, TextDecoder } = require('util');
const fs = require('fs');
const path = require('path');

// Import jest-dom matchers
require('@testing-library/jest-dom');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Enhanced test timeout for regression tests
if (process.env.npm_config_argv && process.env.npm_config_argv.includes('regression')) {
  jest.setTimeout(60000);
}

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test-key',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  NEXTAUTH_SECRET: 'test-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
};

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    query: {},
    pathname: '/',
    asPath: '/',
  }),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Prisma client - updated with correct module resolution
jest.mock('@/lib/prisma', () => {
  const mockPrismaClient = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    report: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    reportVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    competitor: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    analysis: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    analysisTrend: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    schedule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      upsert: jest.fn(),
    },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn().mockImplementation((fn) => fn(mockPrismaClient)),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockPrismaClient,
    prisma: mockPrismaClient,
  };
});

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockAnalysisContent = `Analysis Summary:
Comprehensive analysis of competitor changes completed.

Key Changes:
• Updated product pricing
• New feature announcement
• Website design refresh

Marketing Changes:
• Updated messaging on homepage
• New call-to-action buttons

Product Changes:
• Added mobile app support
• Enhanced user interface

Competitive Insights:
• Focus on mobile experience
• Price positioning strategy

Suggested Actions:
• Review our pricing strategy
• Consider mobile improvements`;

  return {
    BedrockRuntimeClient: jest.fn(() => ({
      send: jest.fn().mockImplementation((command) => {
        // Access command properties correctly - the command has the properties directly
        const modelId = command.modelId;
        
        // Determine if it's a Mistral model
        const isMistral = modelId?.includes('mistral');
        
        if (isMistral) {
          // Mistral format - return choices array with message content
          return Promise.resolve({
            body: new TextEncoder().encode(JSON.stringify({
              choices: [{
                message: {
                  content: mockAnalysisContent
                }
              }]
            }))
          });
        } else {
          // Claude format - return content array with text
          return Promise.resolve({
            body: new TextEncoder().encode(JSON.stringify({
              content: [{
                text: mockAnalysisContent
              }]
            }))
          });
        }
      }),
    })),
    InvokeModelCommand: jest.fn().mockImplementation((input) => ({
      ...input, // Spread all input properties directly onto the command
    })),
  };
});

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

// Mock file system operations for tests
const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;
const originalExistsSync = fs.existsSync;

global.mockFs = {
  reset: () => {
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
    fs.existsSync = originalExistsSync;
  },
  mockReadFile: (filePath, content) => {
    fs.readFileSync = jest.fn((path) => {
      if (path === filePath) return content;
      return originalReadFileSync(path);
    });
  },
  mockWriteFile: () => {
    fs.writeFileSync = jest.fn();
  },
  mockFileExists: (filePath, exists = true) => {
    fs.existsSync = jest.fn((path) => {
      if (path === filePath) return exists;
      return originalExistsSync(path);
    });
  },
};

// Global test utilities
global.testUtils = {
  createMockReport: (overrides = {}) => ({
    id: 'test-report-id',
    title: 'Test Report',
    content: 'Test content',
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
    projectId: 'test-project-id',
    ...overrides,
  }),
  
  createMockProject: (overrides = {}) => ({
    id: 'test-project-id',
    name: 'Test Project',
    description: 'Test description',
    competitors: ['competitor1.com', 'competitor2.com'],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  createMockAnalysis: (overrides = {}) => ({
    id: 'test-analysis-id',
    insights: ['Insight 1', 'Insight 2'],
    trends: ['Trend 1', 'Trend 2'],
    recommendations: ['Recommendation 1'],
    confidence: 0.85,
    ...overrides,
  }),
  
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  global.mockFs.reset();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 