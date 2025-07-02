import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    project: {
      findMany: jest.fn(),
      create: jest.fn()
    },
    competitor: {
      findMany: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  trackBusinessEvent: jest.fn(),
  generateCorrelationId: jest.fn(() => 'test-correlation-id')
}));

jest.mock('@/services/autoReportGenerationService', () => ({
  getAutoReportService: jest.fn(() => ({
    generateInitialComparativeReport: jest.fn(),
    schedulePeriodicReports: jest.fn()
  }))
}));

jest.mock('@/services/productScrapingService');
jest.mock('@/services/smartSchedulingService');
jest.mock('@/services/smartAIService');
jest.mock('@/lib/repositories');

// Mock the InitialComparativeReportService
jest.mock('@/services/reports/initialComparativeReportService', () => ({
  InitialComparativeReportService: jest.fn().mockImplementation(() => ({
    generateInitialComparativeReport: jest.fn().mockResolvedValue({
      id: 'test-report-id',
      title: 'Test Initial Report',
      status: 'completed'
    })
  }))
}));

describe('POST /api/projects - Phase 1.2 Enhanced Flow', () => {
  const mockUser = { id: 'user-1', email: 'mock@example.com', name: 'Mock User' };
  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    status: 'ACTIVE',
    competitors: [
      { id: 'comp-1', name: 'Competitor 1' },
      { id: 'comp-2', name: 'Competitor 2' }
    ]
  };
  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    website: 'https://example.com',
    projectId: 'project-1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    const { prisma } = require('@/lib/prisma');
    const { productRepository } = require('@/lib/repositories');
    
    prisma.user.findFirst.mockResolvedValue(mockUser);
    prisma.competitor.findMany.mockResolvedValue([
      { id: 'comp-1', name: 'Competitor 1' },
      { id: 'comp-2', name: 'Competitor 2' }
    ]);
    prisma.$transaction.mockImplementation(async (callback: any) => {
      return callback({
        project: {
          create: jest.fn().mockResolvedValue(mockProject)
        }
      });
    });
    
    productRepository.create = jest.fn().mockResolvedValue(mockProduct);
  });

  describe('Immediate Report Generation', () => {
    it('should generate initial report immediately when requested', async () => {
      const { InitialComparativeReportService } = require('@/services/reports/initialComparativeReportService');
      const mockReportService = new InitialComparativeReportService();

      const requestBody = {
        name: 'Test Project',
        productWebsite: 'https://example.com',
        productName: 'Test Product',
        generateInitialReport: true,
        requireFreshSnapshots: true,
        reportTemplate: 'comprehensive'
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Verify InitialComparativeReportService was called
      expect(InitialComparativeReportService).toHaveBeenCalled();
      expect(mockReportService.generateInitialComparativeReport).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          template: 'comprehensive',
          priority: 'high',
          timeout: 60000,
          fallbackToPartialData: true,
          notifyOnCompletion: false,
          requireFreshSnapshots: true
        })
      );

      // Verify response includes report generation info
      expect(response.status).toBe(201);
      expect(responseData.reportGeneration).toEqual(
        expect.objectContaining({
          initialReportGenerated: true,
          reportId: 'test-report-id',
          reportStatus: 'completed',
          reportTitle: 'Test Initial Report',
          generationMethod: 'immediate'
        })
      );
    });

    it('should respect generateInitialReport=false flag', async () => {
      const { InitialComparativeReportService } = require('@/services/reports/initialComparativeReportService');

      const requestBody = {
        name: 'Test Project',
        productWebsite: 'https://example.com',
        generateInitialReport: false
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);

      // Verify InitialComparativeReportService was not called
      expect(InitialComparativeReportService).not.toHaveBeenCalled();
      
      expect(response.status).toBe(201);
    });

    it('should fallback to queue when immediate generation fails', async () => {
      const { InitialComparativeReportService } = require('@/services/reports/initialComparativeReportService');
      const { getAutoReportService } = require('@/services/autoReportGenerationService');
      
      // Mock InitialComparativeReportService to throw error
      const mockReportService = new InitialComparativeReportService();
      mockReportService.generateInitialComparativeReport.mockRejectedValue(
        new Error('Immediate generation failed')
      );

      // Mock fallback service
      const mockAutoReportService = getAutoReportService();
      mockAutoReportService.generateInitialComparativeReport.mockResolvedValue({
        taskId: 'task-1',
        queuePosition: 1
      });

      const requestBody = {
        name: 'Test Project',
        productWebsite: 'https://example.com',
        generateInitialReport: true
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Verify fallback was used
      expect(mockAutoReportService.generateInitialComparativeReport).toHaveBeenCalledWith('project-1');
      
      expect(responseData.reportGeneration).toEqual(
        expect.objectContaining({
          initialReportGenerated: false,
          fallbackScheduled: true,
          taskId: 'task-1',
          generationMethod: 'queued_fallback'
        })
      );
    });

    it('should handle requireFreshSnapshots option', async () => {
      const { InitialComparativeReportService } = require('@/services/reports/initialComparativeReportService');
      const mockReportService = new InitialComparativeReportService();

      const requestBody = {
        name: 'Test Project',
        productWebsite: 'https://example.com',
        requireFreshSnapshots: false
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      await POST(request);

      expect(mockReportService.generateInitialComparativeReport).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          requireFreshSnapshots: false
        })
      );
    });
  });

  describe('Project Creation Resilience', () => {
    it('should create project successfully even when report generation fails completely', async () => {
      const { InitialComparativeReportService } = require('@/services/reports/initialComparativeReportService');
      const { getAutoReportService } = require('@/services/autoReportGenerationService');
      
      // Mock both services to fail
      const mockReportService = new InitialComparativeReportService();
      mockReportService.generateInitialComparativeReport.mockRejectedValue(
        new Error('Immediate generation failed')
      );

      const mockAutoReportService = getAutoReportService();
      mockAutoReportService.generateInitialComparativeReport.mockRejectedValue(
        new Error('Fallback also failed')
      );

      const requestBody = {
        name: 'Test Project',
        productWebsite: 'https://example.com',
        generateInitialReport: true
      };

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const responseData = await response.json();

      // Project should still be created successfully
      expect(response.status).toBe(201);
      expect(responseData.id).toBe('project-1');
      
      // Report generation should indicate failure
      expect(responseData.reportGeneration).toEqual(
        expect.objectContaining({
          initialReportGenerated: false,
          fallbackScheduled: false,
          generationMethod: 'failed',
          error: expect.stringContaining('Initial generation failed')
        })
      );
    });
  });
}); 