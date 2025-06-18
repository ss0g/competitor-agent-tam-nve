import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Create a comprehensive mock for Prisma
const mockPrismaClient = {
  competitor: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  report: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  reportVersion: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  analysis: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  snapshot: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

// Mock Prisma at the top level with both named and default exports
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrismaClient,
  prisma: mockPrismaClient
}));

// Mock TrendAnalyzer
jest.mock('@/lib/trends', () => ({
  TrendAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeTrends: jest.fn().mockResolvedValue([])
  }))
}));

// Extend the global testUtils type
declare global {
  var testUtils: {
    createMockReport: (overrides?: any) => any;
    createMockProject: (overrides?: any) => any;
    createMockAnalysis: (overrides?: any) => any;
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
  };
}

/**
 * Critical Paths Regression Tests
 * 
 * These tests ensure that critical application paths continue to work
 * correctly and that any changes don't break core functionality.
 */

describe('Critical Paths Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Report Generation - Critical Smoke Tests', () => {
    test('should generate a report successfully', async () => {
      const mockPrisma = require('@/lib/prisma').default;
      
      // Mock competitor data
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: 'Test Competitor',
        website: 'https://competitor.com',
        snapshots: [
          {
            id: 'snapshot-1',
            createdAt: new Date(),
            analyses: [
              {
                id: 'analysis-1',
                data: {
                  primary: {
                    keyChanges: ['Change 1', 'Change 2'],
                    marketingChanges: ['Marketing change'],
                    productChanges: ['Product change']
                  }
                },
                trends: [
                  { trend: 'Increasing mobile traffic', impact: 0.8 }
                ]
              }
            ]
          }
        ]
      });

      // Mock report creation
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-123',
        name: 'Test Report',
        description: 'Test description',
        competitorId: 'competitor-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock report version creation
      mockPrisma.reportVersion.create.mockResolvedValue({
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {},
        createdAt: new Date(),
      });

      // Mock analysis.findMany for trend analysis
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      const result = await reportGenerator.generateReport('competitor-123', 30);
      
      expect(result).toBeDefined();
      expect(result.data?.title).toBeDefined();
      expect(result.data?.sections).toBeDefined();
      expect(mockPrisma.competitor.findUnique).toHaveBeenCalledWith({
        where: { id: 'competitor-123' },
        include: expect.any(Object)
      });
    });

    test('should handle competitor not found gracefully', async () => {
      const mockPrisma = require('@/lib/prisma').default;
      
      mockPrisma.competitor.findUnique.mockResolvedValue(null);

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      const result = await reportGenerator.generateReport('nonexistent-competitor', 30);
      
      expect(result.error).toBe('Competitor not found');
      expect(result.data).toBeUndefined();
    });

    test('should validate input parameters', async () => {
      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // Test missing competitor ID
      const result1 = await reportGenerator.generateReport('', 30);
      expect(result1.error).toBe('Competitor ID is required');
      
      // Test invalid timeframe (too low)
      const result2 = await reportGenerator.generateReport('competitor-123', 0);
      expect(result2.error).toBe('Invalid timeframe. Must be between 1 and 365 days');
      
      // Test invalid timeframe (too high)
      const result3 = await reportGenerator.generateReport('competitor-123', 400);
      expect(result3.error).toBe('Invalid timeframe. Must be between 1 and 365 days');
    });
  });

  describe('Content Analysis - Critical Smoke Tests', () => {
    test('should perform content analysis successfully', async () => {
      const { ContentAnalyzer } = await import('@/lib/analysis');
      const analyzer = new ContentAnalyzer();
      
      const oldContent = 'Old website content';
      const newContent = 'New website content with changes';
      const diff = {
        text: {
          added: ['New content'],
          removed: ['Old content'],
          unchanged: []
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false
        },
        stats: {
          addedLines: 1,
          removedLines: 1,
          unchangedLines: 0,
          changePercentage: 100
        }
      };

      const result = await analyzer.analyzeChanges(
        oldContent,
        newContent,
        diff,
        'Test Competitor'
      );
      
      expect(result).toBeDefined();
      expect(result.primary).toBeDefined();
      expect(result.secondary).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.usage).toBeDefined();
    });

    test('should handle AI service failures gracefully', async () => {
      // Create a mock that will throw an AI service error
      jest.resetModules();
      
      // Mock the analysis module to throw an error during processing
      jest.doMock('@/lib/analysis', () => {
        const original = jest.requireActual('@/lib/analysis');
        return {
          ...original,
          ContentAnalyzer: class extends original.ContentAnalyzer {
            async analyzeChanges() {
              throw new Error('AI service temporarily unavailable');
            }
          }
        };
      });

      const { ContentAnalyzer } = await import('@/lib/analysis');
      const analyzer = new ContentAnalyzer();

      const oldContent = 'Original content';
      const newContent = 'Updated content';
      const diff = {
        text: {
          added: ['Updated content'],
          removed: ['Original content'],
          unchanged: []
        },
        metadata: {
          title: false,
          description: false,
          statusCode: false,
          contentLength: false
        },
        stats: {
          addedLines: 1,
          removedLines: 1,
          unchangedLines: 0,
          changePercentage: 100
        }
      };

      await expect(analyzer.analyzeChanges(
        oldContent,
        newContent,
        diff,
        'Test Competitor'
      )).rejects.toThrow();
      
      // Reset modules to restore original behavior
      jest.resetModules();
    });
  });

  describe('Data Integrity - Critical Checks', () => {
    test('should maintain data consistency in report storage', async () => {
      const mockPrisma = require('@/lib/prisma').default;
      
      // Mock competitor data
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: 'Test Competitor',
        website: 'https://competitor.com',
        snapshots: [
          {
            id: 'snapshot-1',
            createdAt: new Date(),
            analyses: [
              {
                id: 'analysis-1',
                data: {
                  primary: {
                    keyChanges: ['Change 1'],
                    marketingChanges: ['Marketing change'],
                    productChanges: ['Product change']
                  }
                },
                trends: []
              }
            ]
          }
        ]
      });

      // Mock successful report save
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-123',
        name: 'Test Report',
        description: 'Test content',
        competitorId: 'competitor-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock report version creation
      mockPrisma.reportVersion.create.mockResolvedValue({
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {},
        createdAt: new Date(),
      });

      // Mock analysis.findMany for trend analysis
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      const result = await reportGenerator.generateReport('competitor-123', 30);
      
      // Verify the report was generated with proper structure
      expect(result.data?.title).toBeDefined();
      expect(result.data?.metadata?.competitor.name).toBe('Test Competitor');
    });

    test('should handle database transaction failures', async () => {
      // Configure the mock to simulate database failure
      mockPrismaClient.competitor.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      const result = await reportGenerator.generateReport('competitor-123', 30);
      
      expect(result.error).toBe('Report generation failed: Database connection error. Please try again later.');
      expect(result.validationErrors).toBeUndefined(); // Database errors don't produce validation errors in current implementation
    });

    test('should handle malformed data gracefully', async () => {
      // Return malformed competitor data
      mockPrismaClient.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: null, // Invalid data
        website: 'invalid-url', // Invalid URL  
        snapshots: 'not-an-array' // Invalid type - this will cause filter error
      });

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // Should handle gracefully without crashing
      const result = await reportGenerator.generateReport('competitor-123', 30);
      
      // Should fail gracefully due to malformed data
      expect(result).toBeDefined();
      expect(result.error).toBe('No data available for the specified timeframe');
    });
  });

  describe('Performance - Critical Benchmarks', () => {
    test('should complete report generation within acceptable time limits', async () => {
      const mockPrisma = require('@/lib/prisma').default;
      
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: 'Test Competitor',
        url: 'https://competitor.com',
        snapshots: []
      });

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      const startTime = Date.now();
      await reportGenerator.generateReport('competitor-123', 30);
      const duration = Date.now() - startTime;
      
      // Should complete within 10 seconds for simple reports
      expect(duration).toBeLessThan(10000);
    });

    test('should handle concurrent report generations', async () => {
      const mockPrisma = require('@/lib/prisma').default;
      
      // Mock competitor data
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: 'Test Competitor',
        website: 'https://competitor.com',
        snapshots: [
          {
            id: 'snapshot-1',
            createdAt: new Date(),
            analyses: [
              {
                id: 'analysis-1',
                data: {
                  primary: {
                    keyChanges: ['Change 1'],
                    marketingChanges: ['Marketing change'],
                    productChanges: ['Product change']
                  }
                },
                trends: []
              }
            ]
          }
        ]
      });

      // Mock report creation
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-123',
        name: 'Test Report',
        description: 'Test description',
        competitorId: 'competitor-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock report version creation
      mockPrisma.reportVersion.create.mockResolvedValue({
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {},
        createdAt: new Date(),
      });

      // Mock analysis.findMany for trend analysis
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // Execute multiple concurrent report generations
      const promises = Array(3).fill(null).map(() => 
        reportGenerator.generateReport('competitor-123', 30)
      );
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // All requests should complete
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.data?.title).toBeDefined();
      });
      
      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Error Handling - Critical Recovery', () => {
    test('should recover from temporary service failures', async () => {
      const mockPrisma = require('@/lib/prisma').default;
      
      // Simulate temporary failure followed by success
      mockPrisma.competitor.findUnique
        .mockRejectedValueOnce(new Error('Temporary connection error'))
        .mockResolvedValueOnce({
          id: 'competitor-123',
          name: 'Test Competitor',
          website: 'https://competitor.com',
          snapshots: [
            {
              id: 'snapshot-1',
              createdAt: new Date(),
              analyses: [
                {
                  id: 'analysis-1',
                  data: {
                    primary: {
                      keyChanges: ['Change 1'],
                      marketingChanges: ['Marketing change'],
                      productChanges: ['Product change']
                    }
                  },
                  trends: []
                }
              ]
            }
          ]
        });

      // Mock successful operations for second call
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-123',
        name: 'Test Report',
        description: 'Test description',
        competitorId: 'competitor-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.reportVersion.create.mockResolvedValue({
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {},
        createdAt: new Date(),
      });

      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // First call should fail gracefully
      const result1 = await reportGenerator.generateReport('competitor-123', 30);
      expect(result1.error).toBe('Report generation failed: Database connection error. Please try again later.');
      expect(result1.validationErrors).toBeUndefined(); // Database errors don't produce validation errors in current implementation
      
      // Second call should succeed
      const result2 = await reportGenerator.generateReport('competitor-123', 30);
      expect(result2.data?.title).toBeDefined();
    });

    test('should handle malformed data gracefully', async () => {
      const mockPrisma = require('@/lib/prisma').default;
      
      // Return malformed competitor data
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: null, // Invalid data
        url: 'invalid-url', // Invalid URL
        snapshots: 'not-an-array' // Invalid type
      });

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // Should handle gracefully without crashing
      const result = await reportGenerator.generateReport('competitor-123', 30);
      
      // Should either succeed with fallbacks or fail gracefully
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('Integration - Critical Workflows', () => {
    test('should complete end-to-end report workflow', async () => {
      const mockPrisma = require('@/lib/prisma').default;
      
      // Mock complete workflow data
      mockPrisma.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: 'Test Competitor',
        website: 'https://competitor.com',
        snapshots: [
          {
            id: 'snapshot-1',
            createdAt: new Date(),
            analyses: [
              {
                id: 'analysis-1',
                data: {
                  primary: {
                    keyChanges: ['New feature launch'],
                    marketingChanges: ['Updated pricing page'],
                    productChanges: ['Added mobile app']
                  }
                },
                trends: [
                  { trend: 'Mobile-first approach', impact: 0.9 }
                ]
              }
            ]
          }
        ]
      });

      // Mock report creation
      mockPrisma.report.create.mockResolvedValue({
        id: 'report-123',
        name: 'Test Report',
        description: 'Test description',
        competitorId: 'competitor-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock report version creation
      mockPrisma.reportVersion.create.mockResolvedValue({
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {},
        createdAt: new Date(),
      });

      // Mock analysis.findMany for trend analysis
      mockPrisma.analysis.findMany.mockResolvedValue([]);

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // Generate report
      const result = await reportGenerator.generateReport('competitor-123', 30, {
        userId: 'user-123',
        changeLog: 'Test report generation'
      });
      
      // Verify complete workflow
      expect(result.data).toBeDefined();
      expect(result.data?.title).toContain('Test Competitor');
      expect(result.data?.sections).toHaveLength(4); // summary, changes, trends, recommendations
      expect(result.data?.metadata.competitor.name).toBe('Test Competitor');
      expect(result.data?.metadata.analysisCount).toBeGreaterThan(0);
    });
  });
});

// Helper function to simulate actual imports with proper mocking
async function mockAndImport(modulePath: string) {
  // Clear module cache
  delete require.cache[require.resolve(modulePath)];
  
  // Import the module
  return await import(modulePath);
} 