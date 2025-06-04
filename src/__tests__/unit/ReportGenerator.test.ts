import { ReportGenerator } from '@/lib/reports';
import { PrismaClient } from '@prisma/client';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { TrendAnalyzer } from '@/lib/trends';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@/lib/trends');

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let mockPrisma: any;
  let mockBedrock: jest.Mocked<BedrockRuntimeClient>;
  let mockTrendAnalyzer: jest.Mocked<TrendAnalyzer>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock implementations with proper Jest mock functions
    mockPrisma = {
      competitor: {
        findUnique: jest.fn(),
      },
      report: {
        create: jest.fn(),
      },
      reportVersion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    mockBedrock = {
      send: jest.fn(),
    } as unknown as jest.Mocked<BedrockRuntimeClient>;

    mockTrendAnalyzer = {
      analyzeTrends: jest.fn(),
    } as unknown as jest.Mocked<TrendAnalyzer>;

    // Initialize ReportGenerator with mocks
    reportGenerator = new ReportGenerator();
    (reportGenerator as any).prisma = mockPrisma;
    (reportGenerator as any).bedrock = mockBedrock;
    (reportGenerator as any).trendAnalyzer = mockTrendAnalyzer;
  });

  describe('generateReport', () => {
    const mockCompetitor = {
      id: 'comp-123',
      name: 'Test Competitor',
      website: 'https://test.com',
      snapshots: [
        {
          id: 'snapshot-1',
          createdAt: new Date(), // Current date to ensure it falls within timeframe
          analyses: [
            {
              id: 'analysis-1',
              data: {
                primary: {
                  keyChanges: ['Major change 1'],
                  marketingChanges: ['Significant marketing update'],
                  productChanges: ['New feature launch'],
                }
              },
            },
          ],
        },
      ],
    };

    const mockTrends = [
      {
        trend: 'Increasing market presence',
        impact: 0.8,
        category: 'market',
        confidence: 0.9,
      },
    ];

    it('should validate input parameters', async () => {
      const result = await reportGenerator.generateReport('', 30);
      expect(result.error).toBe('Competitor ID is required');
    });

    it('should validate timeframe', async () => {
      const result = await reportGenerator.generateReport('comp-123', 0);
      expect(result.error).toBe('Invalid timeframe');
    });

    it('should handle competitor not found', async () => {
      mockPrisma.competitor.findUnique.mockResolvedValue(null);
      const result = await reportGenerator.generateReport('comp-123', 30);
      expect(result.error).toBe('Competitor not found');
    });

    it('should generate a valid report', async () => {
      // Setup mocks
      mockPrisma.competitor.findUnique.mockResolvedValue(mockCompetitor);
      mockTrendAnalyzer.analyzeTrends.mockResolvedValue(mockTrends);
      (mockBedrock.send as jest.Mock).mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'Test description' }],
        })),
      });
      mockPrisma.report.create.mockResolvedValue({ id: 'report-1' });
      mockPrisma.reportVersion.create.mockResolvedValue({ id: 'version-1' });

      // Generate report
      const result = await reportGenerator.generateReport('comp-123', 30);

      // Verify result
      expect(result.error).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data?.title).toContain('Test Competitor');
      expect(result.data?.sections).toHaveLength(4);
      expect(mockPrisma.report.create).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockPrisma.competitor.findUnique.mockRejectedValue(new Error('Database error'));
      const result = await reportGenerator.generateReport('comp-123', 30);
      expect(result.error).toBe('Failed to generate report');
    });
  });

  describe('getReportVersions', () => {
    it('should return report versions', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          version: 1, // Changed from versionNumber to version
          content: {
            title: 'Version 1',
            description: 'First version',
            changeLog: 'Initial version',
          },
          createdAt: new Date(),
        },
      ];

      mockPrisma.reportVersion.findMany.mockResolvedValue(mockVersions);
      const versions = await reportGenerator.getReportVersions('report-123');
      expect(versions).toHaveLength(1);
      expect(versions[0].number).toBe(1);
    });
  });

  describe('countSignificantChanges', () => {
    it('should count significant changes correctly', () => {
      const snapshots = [
        {
          analyses: [
            {
              data: {
                primary: {
                  keyChanges: ['Major change that is significant'],
                  marketingChanges: ['Significant marketing update'],
                  productChanges: [],
                }
              },
            },
          ],
        },
        {
          analyses: [
            {
              data: {
                primary: {
                  keyChanges: [],
                  marketingChanges: [],
                  productChanges: ['major product update that counts'],
                }
              },
            },
          ],
        },
      ];

      const count = (reportGenerator as any).countSignificantChanges(snapshots);
      expect(count).toBe(3); // Changed expectation to 3 (all three changes are > 10 chars)
    });
  });
}); 