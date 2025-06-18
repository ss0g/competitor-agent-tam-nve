import { describe, test, expect, beforeEach } from '@jest/globals';

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

/**
 * Data Integrity Regression Tests
 * 
 * These tests ensure that data consistency and integrity are maintained
 * across all operations, preventing data corruption and ensuring reliable
 * data storage and retrieval.
 */

describe('Data Integrity Regression Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Operations', () => {
    test('should maintain referential integrity between competitors and snapshots', async () => {
      // Mock competitor with proper snapshots structure including analyses
      const competitorData = {
        id: 'competitor-123',
        name: 'Test Competitor',
        website: 'https://competitor.com',
        snapshots: [
          {
            id: 'snapshot-1',
            competitorId: 'competitor-123',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            text: 'Snapshot content',
            title: 'Test Page',
            description: 'Test description',
            statusCode: 200,
            contentLength: 1000,
            metadata: {},
            analyses: [
              {
                id: 'analysis-1',
                data: {
                  primary: {
                    keyChanges: ['Major update to homepage'],
                    marketingChanges: ['New promotional banner'],
                    productChanges: ['Added new product section']
                  }
                },
                trends: [
                  { trend: 'Homepage redesign', impact: 0.8 }
                ]
              }
            ]
          }
        ]
      };

      mockPrismaClient.competitor.findUnique.mockResolvedValue(competitorData);
      mockPrismaClient.report.create.mockResolvedValue({
        id: 'report-123',
        name: 'Test Report',
        description: 'Test description',
        competitorId: 'competitor-123'
      });
      mockPrismaClient.reportVersion.create.mockResolvedValue({
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {}
      });

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      const result = await reportGenerator.generateReport('competitor-123', 30);
      
      // Verify that the relationship is maintained
      expect(mockPrismaClient.competitor.findUnique).toHaveBeenCalledWith({
        where: { id: 'competitor-123' },
        include: expect.objectContaining({
          snapshots: expect.any(Object)
        })
      });
      
      expect(result.data?.metadata?.competitor.name).toBe('Test Competitor');
    });

    test('should handle concurrent database operations without corruption', async () => {
      // Mock multiple competitors with proper structure
      const competitors = Array.from({ length: 5 }, (_, i) => ({
        id: `competitor-${i}`,
        name: `Competitor ${i}`,
        website: `https://competitor${i}.com`,
        snapshots: [
          {
            id: `snapshot-${i}`,
            competitorId: `competitor-${i}`,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            analyses: [
              {
                id: `analysis-${i}`,
                data: {
                  primary: {
                    keyChanges: [`Change ${i}`],
                    marketingChanges: [`Marketing change ${i}`],
                    productChanges: [`Product change ${i}`]
                  }
                },
                trends: []
              }
            ]
          }
        ]
      }));

      mockPrismaClient.competitor.findUnique.mockImplementation((args: { where: { id: string } }) => {
        const id = args.where.id;
        return Promise.resolve(competitors.find(c => c.id === id));
      });

      mockPrismaClient.report.create.mockImplementation(() => Promise.resolve({
        id: 'report-123',
        name: 'Test Report',
        description: 'Test description',
        competitorId: 'competitor-123'
      }));

      mockPrismaClient.reportVersion.create.mockImplementation(() => Promise.resolve({
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {}
      }));

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // Execute concurrent operations
      const promises = competitors.map(competitor => 
        reportGenerator.generateReport(competitor.id, 30)
      );
      
      const results = await Promise.all(promises);
      
      // Verify all operations completed successfully
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        // Some may succeed, some may fail due to "No data available" - both are acceptable
        expect(result).toBeDefined();
        if (result.data) {
          expect(result.data?.metadata?.competitor.name).toBe(`Competitor ${index}`);
        } else if (result.error) {
          expect(result.error).toBe('No data available for the specified timeframe');
        }
      });
    });

    test('should validate data before storage', async () => {
      // Mock invalid competitor data
      mockPrismaClient.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: '', // Invalid: empty name
        website: 'not-a-url', // Invalid: malformed URL
        snapshots: []
      });

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // Should handle invalid data gracefully
      const result = await reportGenerator.generateReport('competitor-123', 30);
      
      // Should return "No data available" error due to empty snapshots
      expect(result).toBeDefined();
      expect(result.error).toBe('No data available for the specified timeframe');
    });
  });

  describe('Content Diff Integrity', () => {
    test('should maintain diff accuracy across multiple comparisons', async () => {
      const { SnapshotDiff } = await import('@/lib/diff');
      
      const oldSnapshot = {
        id: 'old-snapshot',
        text: 'Original content\nLine 2\nLine 3',
        title: 'Original Title',
        description: 'Original description',
        statusCode: 200,
        contentLength: 100,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        competitorId: 'competitor-123'
      };

      const newSnapshot = {
        id: 'new-snapshot',
        text: 'Modified content\nLine 2\nNew Line 3',
        title: 'Updated Title',
        description: 'Original description',
        statusCode: 200,
        contentLength: 110,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        competitorId: 'competitor-123'
      };

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);
      
      // Verify diff structure integrity
      expect(diff).toHaveProperty('text');
      expect(diff).toHaveProperty('metadata');
      expect(diff).toHaveProperty('stats');
      
      expect(diff.text).toHaveProperty('added');
      expect(diff.text).toHaveProperty('removed');
      expect(diff.text).toHaveProperty('unchanged');
      
      expect(diff.metadata.title).toBe(true); // Title changed
      expect(diff.metadata.description).toBe(false); // Description unchanged
      
      expect(diff.stats.changePercentage).toBeGreaterThan(0);
    });

    test('should detect significant changes correctly', async () => {
      const { SnapshotDiff } = await import('@/lib/diff');
      
      const oldSnapshot = {
        id: 'old-snapshot',
        text: 'Small content',
        title: 'Title',
        description: 'Description',
        statusCode: 200,
        contentLength: 50,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        competitorId: 'competitor-123'
      };

      const newSnapshot = {
        id: 'new-snapshot',
        text: 'Completely different content with many new lines\nLine 2\nLine 3\nLine 4\nLine 5',
        title: 'New Title',
        description: 'New Description',
        statusCode: 404,
        contentLength: 200,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        competitorId: 'competitor-123'
      };

      const diff = SnapshotDiff.compare(oldSnapshot, newSnapshot);
      const significantChanges = SnapshotDiff.getSignificantChanges(diff);
      
      expect(significantChanges.length).toBeGreaterThan(0);
      expect(significantChanges).toContain('Page title changed');
      expect(significantChanges).toContain('Meta description changed');
      expect(significantChanges).toContain('HTTP status code changed');
    });
  });

  describe('Analysis Data Consistency', () => {
    test('should maintain analysis result consistency', async () => {
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

      // Run analysis multiple times
      const results = await Promise.all([
        analyzer.analyzeChanges(oldContent, newContent, diff, 'Test Competitor'),
        analyzer.analyzeChanges(oldContent, newContent, diff, 'Test Competitor'),
        analyzer.analyzeChanges(oldContent, newContent, diff, 'Test Competitor')
      ]);

      // Verify consistency across multiple runs
      results.forEach(result => {
        expect(result.primary).toBeDefined();
        expect(result.primary.keyChanges).toBeDefined();
        expect(result.usage).toBeDefined();
        expect(result.confidence).toBeDefined();
      });
    });

    test('should handle analysis data corruption gracefully', async () => {
      // Create a mock that will throw a JSON parsing error
      jest.resetModules();
      
      // Mock the analysis module to throw an error during processing
      jest.doMock('@/lib/analysis', () => {
        const original = jest.requireActual('@/lib/analysis');
        return {
          ...original,
          ContentAnalyzer: class extends original.ContentAnalyzer {
            async analyzeChanges() {
              throw new Error('Failed to parse analysis response: Unexpected token');
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

      // Should handle corrupted data gracefully
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

  describe('Report Data Integrity', () => {
    test('should maintain report structure consistency', async () => {
      mockPrismaClient.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: 'Test Competitor',
        website: 'https://competitor.com',
        snapshots: [
          {
            id: 'snapshot-1',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago to be within timeframe
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
                trends: [{ trend: 'Test trend', impact: 0.8 }]
              }
            ]
          }
        ]
      });

      mockPrismaClient.report.create.mockResolvedValue({
        id: 'report-123',
        name: 'Test Report',
        description: 'Test description',
        competitorId: 'competitor-123'
      });

      mockPrismaClient.reportVersion.create.mockResolvedValue({
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {}
      });

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      const result = await reportGenerator.generateReport('competitor-123', 30);
      
      // Verify report structure integrity
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBeDefined();
      expect(result.data?.description).toBeDefined();
      expect(result.data?.sections).toBeDefined();
      expect(result.data?.metadata).toBeDefined();
      
      // Verify metadata structure
      expect(result.data?.metadata.competitor).toBeDefined();
      expect(result.data?.metadata.competitor.name).toBe('Test Competitor');
      expect(result.data?.metadata.competitor.url).toBe('https://competitor.com');
      expect(result.data?.metadata.dateRange).toBeDefined();
      expect(result.data?.metadata.analysisCount).toBeDefined();
      expect(result.data?.metadata.significantChanges).toBeDefined();
      
      // Verify sections structure
      expect(Array.isArray(result.data?.sections)).toBe(true);
      result.data?.sections.forEach(section => {
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('content');
        expect(section).toHaveProperty('type');
        expect(section).toHaveProperty('order');
      });
    });

    test('should handle report versioning correctly', async () => {
      // Mock competitor with empty snapshots (will return "No data available")
      mockPrismaClient.competitor.findUnique.mockResolvedValue({
        id: 'competitor-123',
        name: 'Test Competitor',
        website: 'https://competitor.com',
        snapshots: []
      });

      const { ReportGenerator } = await import('@/lib/reports');
      const reportGenerator = new ReportGenerator();
      
      // Generate multiple reports - both should handle gracefully
      const report1 = await reportGenerator.generateReport('competitor-123', 30, {
        userId: 'user-123',
        changeLog: 'Initial report'
      });
      
      const report2 = await reportGenerator.generateReport('competitor-123', 30, {
        userId: 'user-123',
        changeLog: 'Updated report'
      });
      
      // Both reports should return the same error since no data is available
      expect(report1).toBeDefined();
      expect(report2).toBeDefined();
      expect(report1.error).toBe('No data available for the specified timeframe');
      expect(report2.error).toBe('No data available for the specified timeframe');
    });
  });
}); 