import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/reports';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { ReportData } from '@/types/reports';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('next-auth');

describe('/api/reports', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
      },
    });

    // Mock Prisma
    mockPrisma = {
      competitor: {
        findUnique: jest.fn(),
      },
      report: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaClient>;
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
      const mockReport: Partial<ReportData> = {
        title: 'Test Report',
        description: 'Test Description',
        sections: [],
        metadata: {
          competitor: {
            name: 'Test Competitor',
            url: 'https://test.com',
          },
          dateRange: {
            start: new Date(),
            end: new Date(),
          },
          analysisCount: 1,
          significantChanges: 0,
        },
      };

      mockPrisma.competitor.findUnique.mockResolvedValueOnce({
        id: validReportData.competitorId,
        name: 'Test Competitor',
        url: 'https://test.com',
        snapshots: [],
      } as any);

      mockPrisma.report.create.mockResolvedValueOnce({
        id: 'report-123',
        ...mockReport,
      } as any);

      const { req, res } = createMocks({
        method: 'POST',
        body: validReportData,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('data');
    });

    it('should handle internal errors', async () => {
      mockPrisma.competitor.findUnique.mockRejectedValueOnce(
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