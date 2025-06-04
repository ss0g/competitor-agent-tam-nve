import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/reports';
import { getServerSession } from 'next-auth';
import { ReportData } from '@/types/reports';

// Mock dependencies - Define mock before jest.mock
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    competitor: {
      findUnique: jest.fn(),
    },
    report: {
      create: jest.fn(),
    },
    reportVersion: {
      create: jest.fn(),
    },
  },
  prisma: {
    competitor: {
      findUnique: jest.fn(),
    },
    report: {
      create: jest.fn(),
    },
    reportVersion: {
      create: jest.fn(),
    },
  }
}));

jest.mock('@/lib/trends', () => ({
  TrendAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeTrends: jest.fn().mockResolvedValue([
      { trend: 'Test trend', impact: 0.5 }
    ])
  }))
}));

jest.mock('next-auth');

describe('/api/reports', () => {
  let mockPrisma: any;
  let mockPrismaDefault: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get both the named and default mocked prisma instances
    mockPrisma = require('@/lib/prisma').prisma;
    mockPrismaDefault = require('@/lib/prisma').default;

    // Mock session
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    });
  });

  describe('POST /api/reports', () => {
    const validReportData = {
      competitorId: '123e4567-e89b-12d3-a456-426614174000',
      timeframe: 30,
      changeLog: 'Initial report',
    };

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const { req, res } = createMocks({
        method: 'POST',
        body: validReportData,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Unauthorized',
      });
    });

    it('should validate request body', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          ...validReportData,
          timeframe: 0, // Invalid timeframe
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toMatchObject({
        error: 'Validation failed',
      });
    });

    it('should create a report successfully', async () => {
      // Mock competitor with proper snapshots and analyses structure
      const competitorData = {
        id: validReportData.competitorId,
        name: 'Test Competitor',
        website: 'https://test.com',
        snapshots: [
          {
            id: 'snapshot-1',
            competitorId: validReportData.competitorId,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            text: 'Test snapshot content',
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
                    keyChanges: ['Test change'],
                    marketingChanges: ['Marketing update'],
                    productChanges: ['Product update']
                  }
                },
                trends: [
                  { trend: 'Test trend', impact: 0.5 }
                ]
              }
            ]
          }
        ]
      };

      const reportData = {
        id: 'report-123',
        name: 'Test Report',
        description: 'Test Description',
        competitorId: validReportData.competitorId
      };

      const reportVersionData = {
        id: 'version-123',
        reportId: 'report-123',
        version: 1,
        content: {}
      };

      // Mock both named and default prisma instances
      mockPrisma.competitor.findUnique.mockResolvedValueOnce(competitorData);
      mockPrisma.report.create.mockResolvedValueOnce(reportData);
      mockPrisma.reportVersion.create.mockResolvedValueOnce(reportVersionData);

      mockPrismaDefault.competitor.findUnique.mockResolvedValueOnce(competitorData);
      mockPrismaDefault.report.create.mockResolvedValueOnce(reportData);
      mockPrismaDefault.reportVersion.create.mockResolvedValueOnce(reportVersionData);

      const { req, res } = createMocks({
        method: 'POST',
        body: validReportData,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('data');
      expect(responseData.data).toHaveProperty('title');
      expect(responseData.data).toHaveProperty('sections');
      expect(responseData.data).toHaveProperty('metadata');
    });

    it('should handle internal errors', async () => {
      // Mock both named and default prisma instances for error case
      mockPrisma.competitor.findUnique.mockRejectedValueOnce(
        new Error('Database error')
      );
      mockPrismaDefault.competitor.findUnique.mockRejectedValueOnce(
        new Error('Database error')
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: validReportData,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toMatchObject({
        error: 'Failed to generate report',
      });
    });
  });

  describe('Invalid methods', () => {
    it('should return 405 for non-POST methods', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed',
      });
    });
  });
}); 