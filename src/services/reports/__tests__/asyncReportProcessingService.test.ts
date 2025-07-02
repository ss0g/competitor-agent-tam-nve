/**
 * Phase 4.2: AsyncReportProcessingService Tests
 * Comprehensive test suite for enhanced async processing with fallbacks
 */

import { AsyncReportProcessingService } from '../asyncReportProcessingService';
import { InitialComparativeReportService } from '../initialComparativeReportService';
import { realTimeStatusService } from '../../realTimeStatusService';
import { logger } from '@/lib/logger';

// Mock external dependencies
jest.mock('../initialComparativeReportService');
jest.mock('../../realTimeStatusService');
jest.mock('@/lib/logger');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn()
    }
  }
}));

// Mock Bull queue
jest.mock('bull', () => {
  const mockJob = {
    id: 'test-job-id',
    data: {},
    opts: { attempts: 3 }
  };

  const mockQueue = {
    add: jest.fn().mockResolvedValue(mockJob),
    process: jest.fn(),
    on: jest.fn(),
    getActive: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined)
  };

  return jest.fn().mockImplementation(() => mockQueue);
});

const { prisma } = require('@/lib/prisma');

describe('AsyncReportProcessingService', () => {
  let service: AsyncReportProcessingService;
  let mockInitialReportService: jest.Mocked<InitialComparativeReportService>;

  const mockProject = {
    id: 'test-project-id',
    name: 'Test Project',
    competitors: [
      { id: 'comp-1', name: 'Competitor 1' },
      { id: 'comp-2', name: 'Competitor 2' }
    ]
  };

  const mockReport = {
    id: 'test-report-id',
    title: 'Test Comparative Report',
    content: 'Mock report content',
    metadata: {
      dataCompletenessScore: 85,
      dataFreshness: 'new'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (AsyncReportProcessingService as any).instance = null;
    service = AsyncReportProcessingService.getInstance();

    // Setup prisma mock
    prisma.project.findUnique.mockResolvedValue(mockProject);

    // Setup InitialComparativeReportService mock
    mockInitialReportService = new InitialComparativeReportService() as jest.Mocked<InitialComparativeReportService>;
    mockInitialReportService.generateInitialComparativeReport.mockResolvedValue(mockReport as any);
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = AsyncReportProcessingService.getInstance();
      const instance2 = AsyncReportProcessingService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(service);
    });
  });

  describe('processInitialReport - Immediate Processing', () => {
    it('should successfully process report immediately when resources available', async () => {
      // Mock successful immediate processing
      const result = await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'high',
        fallbackToQueue: true
      });

      expect(result.success).toBe(true);
      expect(result.processingMethod).toBe('immediate');
      expect(result.reportId).toBe(mockReport.id);
      expect(result.fallbackUsed).toBe(false);
      expect(result.queueScheduled).toBe(false);
      expect(result.timeoutExceeded).toBe(false);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle timeout during immediate processing', async () => {
      // Mock slow report generation that exceeds timeout
      mockInitialReportService.generateInitialComparativeReport.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockReport as any), 60000))
      );

      const result = await service.processInitialReport('test-project-id', {
        timeout: 1000, // Very short timeout
        priority: 'high',
        fallbackToQueue: true
      });

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.queueScheduled).toBe(true);
      expect(result.processingMethod).toBe('fallback');
    });

    it('should handle errors during immediate processing', async () => {
      // Mock error in report generation
      mockInitialReportService.generateInitialComparativeReport.mockRejectedValue(
        new Error('Report generation failed')
      );

      const result = await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'high',
        fallbackToQueue: true
      });

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.queueScheduled).toBe(true);
      expect(result.processingMethod).toBe('fallback');
      expect(result.error).toContain('Report generation failed');
    });

    it('should fail immediately when fallback disabled', async () => {
      // Mock error in report generation
      mockInitialReportService.generateInitialComparativeReport.mockRejectedValue(
        new Error('Report generation failed')
      );

      const result = await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'high',
        fallbackToQueue: false // Disable fallback
      });

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(false);
      expect(result.queueScheduled).toBe(false);
      expect(result.processingMethod).toBe('failed');
      expect(result.error).toBe('Report generation failed');
    });
  });

  describe('processInitialReport - Queue Processing', () => {
    it('should queue processing when resources unavailable', async () => {
      // Fill up concurrent processing slots
      const processingPromises = [];
      for (let i = 0; i < 5; i++) {
        processingPromises.push(
          service.processInitialReport(`project-${i}`, {
            timeout: 45000,
            priority: 'normal'
          })
        );
      }

      // This should go to queue due to resource constraints
      const result = await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'normal',
        fallbackToQueue: true
      });

      expect(result.processingMethod).toBe('queued');
      expect(result.queueScheduled).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.estimatedQueueCompletion).toBeDefined();

      // Cleanup
      await Promise.allSettled(processingPromises);
    });

    it('should prioritize high priority tasks in queue', async () => {
      const Bull = require('bull');
      const mockQueue = new Bull();

      // Test high priority task
      await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'high',
        fallbackToQueue: true,
        maxConcurrentProcessing: 0 // Force queue
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-initial-report',
        expect.objectContaining({
          priority: 'high'
        }),
        expect.objectContaining({
          priority: 1 // High priority number
        })
      );
    });

    it('should handle queue scheduling failures gracefully', async () => {
      const Bull = require('bull');
      const mockQueue = new Bull();
      mockQueue.add.mockRejectedValue(new Error('Queue unavailable'));

      const result = await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'high',
        maxConcurrentProcessing: 0 // Force queue
      });

      expect(result.success).toBe(false);
      expect(result.processingMethod).toBe('failed');
      expect(result.error).toContain('Queue scheduling failed');
    });
  });

  describe('processInitialReport - Fallback Mechanisms', () => {
    it('should handle complete fallback chain: immediate → queue → failed', async () => {
      // Mock immediate processing failure
      mockInitialReportService.generateInitialComparativeReport.mockRejectedValue(
        new Error('Immediate processing failed')
      );

      // Mock queue failure
      const Bull = require('bull');
      const mockQueue = new Bull();
      mockQueue.add.mockRejectedValue(new Error('Queue unavailable'));

      const result = await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'high',
        fallbackToQueue: true
      });

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBe(true);
      expect(result.processingMethod).toBe('failed');
      expect(result.error).toContain('Both immediate processing and queue fallback failed');
    });

    it('should provide detailed fallback information', async () => {
      // Mock timeout scenario
      mockInitialReportService.generateInitialComparativeReport.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockReport as any), 60000))
      );

      const result = await service.processInitialReport('test-project-id', {
        timeout: 1000, // Short timeout to trigger fallback
        priority: 'high',
        fallbackToQueue: true
      });

      expect(result.fallbackUsed).toBe(true);
      expect(result.timeoutExceeded).toBe(true);
      expect(result.processingMethod).toBe('fallback');
      expect(result.error).toContain('Immediate processing failed');
    });
  });

  describe('Resource Management', () => {
    it('should track concurrent processing correctly', () => {
      const stats = service.getProcessingStatistics();
      
      expect(stats.concurrentProcessing).toBe(0);
      expect(stats.maxConcurrentProcessing).toBe(5);
      expect(stats.activeProcesses).toEqual([]);
    });

    it('should respect maxConcurrentProcessing limits', async () => {
      // Start multiple concurrent processes
      const results = await Promise.all([
        service.processInitialReport('project-1', { maxConcurrentProcessing: 2 }),
        service.processInitialReport('project-2', { maxConcurrentProcessing: 2 }),
        service.processInitialReport('project-3', { maxConcurrentProcessing: 2 })
      ]);

      // At least one should be queued due to limit
      const queuedResults = results.filter(r => r.processingMethod === 'queued');
      expect(queuedResults.length).toBeGreaterThan(0);
    });

    it('should handle graceful degradation settings', async () => {
      // Test forcing immediate processing even under load
      const result = await service.processInitialReport('test-project-id', {
        enableGracefulDegradation: false,
        maxConcurrentProcessing: 0 // Would normally force queue
      });

      // Should still attempt immediate processing
      expect(result.processingMethod).not.toBe('queued');
    });
  });

  describe('Real-time Status Updates', () => {
    it('should send appropriate status updates during processing', async () => {
      await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'high'
      });

      expect(realTimeStatusService.sendProcessingUpdate).toHaveBeenCalledWith(
        'test-project-id',
        'validation',
        5,
        'Starting async report generation...'
      );

      expect(realTimeStatusService.sendProcessingUpdate).toHaveBeenCalledWith(
        'test-project-id',
        'snapshot_capture',
        15,
        'Initializing report generation...'
      );

      expect(realTimeStatusService.sendCompletionUpdate).toHaveBeenCalledWith(
        'test-project-id',
        true,
        mockReport.id,
        mockReport.title,
        'Report generated successfully via async processing'
      );
    });

    it('should send failure status updates on errors', async () => {
      mockInitialReportService.generateInitialComparativeReport.mockRejectedValue(
        new Error('Generation failed')
      );

      await service.processInitialReport('test-project-id', {
        timeout: 45000,
        priority: 'high',
        fallbackToQueue: false
      });

      expect(realTimeStatusService.sendCompletionUpdate).toHaveBeenCalledWith(
        'test-project-id',
        false,
        undefined,
        undefined,
        'Report generation failed: Generation failed'
      );
    });
  });

  describe('Queue Statistics', () => {
    it('should provide accurate queue statistics', async () => {
      const Bull = require('bull');
      const mockQueue = new Bull();
      
      // Mock queue metrics
      mockQueue.getActive.mockResolvedValue([{ id: 'job1' }, { id: 'job2' }]);
      mockQueue.getWaiting.mockResolvedValue([{ id: 'job3' }]);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      mockQueue.getCompleted.mockResolvedValue([
        { id: 'job4', finishedOn: today.getTime() + 3600000 }
      ]);
      mockQueue.getFailed.mockResolvedValue([
        { id: 'job5', finishedOn: today.getTime() + 7200000 }
      ]);

      // Access private method via queue processing
      await service.processInitialReport('test-project-id', {
        maxConcurrentProcessing: 0 // Force queue to trigger statistics
      });

      expect(mockQueue.getActive).toHaveBeenCalled();
      expect(mockQueue.getWaiting).toHaveBeenCalled();
      expect(mockQueue.getCompleted).toHaveBeenCalled();
      expect(mockQueue.getFailed).toHaveBeenCalled();
    });
  });

  describe('Configuration and Options', () => {
    it('should use default configuration values correctly', async () => {
      const result = await service.processInitialReport('test-project-id');

      // Should use default timeout of 45 seconds
      expect(result.processingTime).toBeLessThan(45000);
    });

    it('should respect custom timeout values', async () => {
      const customTimeout = 30000;
      
      const result = await service.processInitialReport('test-project-id', {
        timeout: customTimeout
      });

      // Processing should complete within custom timeout
      expect(result.processingTime).toBeLessThan(customTimeout);
    });

    it('should handle different priority levels', async () => {
      const priorities: Array<'high' | 'normal' | 'low'> = ['high', 'normal', 'low'];
      
      for (const priority of priorities) {
        const result = await service.processInitialReport('test-project-id', {
          priority,
          maxConcurrentProcessing: 0 // Force queue to test priority
        });

        expect(result.processingMethod).toBe('queued');
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service initialization errors gracefully', () => {
      // Test that service can handle Redis connection issues
      expect(() => AsyncReportProcessingService.getInstance()).not.toThrow();
    });

    it('should clean up resources properly', async () => {
      const stats = service.getProcessingStatistics();
      expect(stats.concurrentProcessing).toBe(0);
      expect(stats.activeProcesses).toEqual([]);

      await service.cleanup();

      // Should not throw after cleanup
      expect(() => service.getProcessingStatistics()).not.toThrow();
    });

    it('should handle concurrent cleanup calls', async () => {
      const cleanupPromises = [
        service.cleanup(),
        service.cleanup(),
        service.cleanup()
      ];

      await expect(Promise.all(cleanupPromises)).resolves.not.toThrow();
    });
  });

  describe('Integration with InitialComparativeReportService', () => {
    it('should pass correct options to InitialComparativeReportService', async () => {
      await service.processInitialReport('test-project-id', {
        timeout: 30000,
        priority: 'high'
      });

      expect(mockInitialReportService.generateInitialComparativeReport).toHaveBeenCalledWith(
        'test-project-id',
        expect.objectContaining({
          template: 'comprehensive',
          priority: 'high',
          timeout: 25000, // Should reserve 5s for cleanup
          fallbackToPartialData: true,
          notifyOnCompletion: true,
          requireFreshSnapshots: true
        })
      );
    });

    it('should handle InitialComparativeReportService options correctly', async () => {
      await service.processInitialReport('test-project-id', {
        notifyOnCompletion: false
      });

      expect(mockInitialReportService.generateInitialComparativeReport).toHaveBeenCalledWith(
        'test-project-id',
        expect.objectContaining({
          notifyOnCompletion: false
        })
      );
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track processing times accurately', async () => {
      const startTime = Date.now();
      
      const result = await service.processInitialReport('test-project-id');
      
      const endTime = Date.now();
      const actualTime = endTime - startTime;

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThanOrEqual(actualTime + 100); // Allow 100ms tolerance
    });

    it('should provide comprehensive processing statistics', () => {
      const stats = service.getProcessingStatistics();

      expect(stats).toHaveProperty('concurrentProcessing');
      expect(stats).toHaveProperty('maxConcurrentProcessing');
      expect(stats).toHaveProperty('activeProcesses');
      expect(Array.isArray(stats.activeProcesses)).toBe(true);
    });
  });
}); 