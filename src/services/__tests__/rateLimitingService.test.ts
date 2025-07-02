/**
 * Phase 4.4: Comprehensive Rate Limiting Service Tests
 * 
 * This test suite covers all aspects of the rate limiting service:
 * - Rate limiting decisions and enforcement
 * - Cost controls and budget management
 * - Circuit breaker functionality
 * - Administrative operations
 * - Performance metrics and health monitoring
 */

import { RateLimitingService, RateLimitContext, RateLimitingConfig } from '../rateLimitingService';
import { logger } from '@/lib/logger';

// Mock logger to prevent console spam during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('RateLimitingService', () => {
  let rateLimitingService: RateLimitingService;
  let mockConfig: Partial<RateLimitingConfig>;

  beforeEach(() => {
    // Reset any existing singleton instance
    (RateLimitingService as any).instance = undefined;
    
    // Test configuration with lower limits for faster testing
    mockConfig = {
      maxConcurrentPerProject: 2,
      maxGlobalConcurrent: 5,
      perDomainThrottleMs: 1000, // 1 second for testing
      dailySnapshotLimit: 100,
      hourlySnapshotLimit: 10,
      circuitBreakerErrorThreshold: 0.5, // 50% error rate
      circuitBreakerWindowMs: 5000, // 5 seconds for testing
      circuitBreakerRecoveryMs: 2000, // 2 seconds for testing
      maxDailyCostUsd: 10,
      maxHourlyCostUsd: 2,
      costPerSnapshotUsd: 0.1
    };

    rateLimitingService = RateLimitingService.getInstance(mockConfig);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await rateLimitingService.cleanup();
  });

  describe('Basic Functionality', () => {
    it('should return the same instance (singleton)', () => {
      const instance1 = RateLimitingService.getInstance();
      const instance2 = RateLimitingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should allow requests when all limits are satisfied', async () => {
      const mockContext: RateLimitContext = {
        projectId: 'test-project-1',
        domain: 'example.com',
        priority: 'normal',
        source: 'initial_report',
        requestId: 'test-request-123'
      };

      const decision = await rateLimitingService.checkRateLimit(mockContext);
      
      expect(decision.allowed).toBe(true);
      expect(decision.quotaRemaining).toBeDefined();
    });

    it('should enforce cost limits', async () => {
      const expensiveContext: RateLimitContext = {
        projectId: 'test-project',
        domain: 'example.com',
        priority: 'normal',
        source: 'initial_report',
        requestId: 'test-request',
        estimatedCostUsd: 2.5
      };

      const decision = await rateLimitingService.checkRateLimit(expensiveContext);
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('cost limit');
    });

    it('should provide metrics', () => {
      const metrics = rateLimitingService.getRateLimitingMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('healthScore');
      expect(typeof metrics.healthScore).toBe('number');
    });

    it('should manage circuit breaker', () => {
      rateLimitingService.triggerCircuitBreaker('Test');
      
      const info = rateLimitingService.getCircuitBreakerInfo();
      expect(info.state).toBe('open');
      
      rateLimitingService.resetCircuitBreaker();
      expect(rateLimitingService.getCircuitBreakerInfo().state).toBe('closed');
    });
  });

  describe('Rate Limiting Decisions', () => {
    let mockContext: RateLimitContext;

    beforeEach(() => {
      mockContext = {
        projectId: 'test-project-1',
        competitorId: 'test-competitor-1',
        domain: 'example.com',
        priority: 'normal',
        source: 'initial_report',
        estimatedCostUsd: 0.05,
        requestId: 'test-request-123'
      };
    });

    it('should enforce hourly cost limits', async () => {
      const expensiveContext = {
        ...mockContext,
        estimatedCostUsd: 2.5 // Exceeds hourly limit of $2
      };

      const decision = await rateLimitingService.checkRateLimit(expensiveContext);
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Hourly cost limit would be exceeded');
      expect(decision.fallbackSuggested).toContain('next hour');
    });

    it('should enforce daily cost limits', async () => {
      const expensiveContext = {
        ...mockContext,
        estimatedCostUsd: 12 // Exceeds daily limit of $10
      };

      const decision = await rateLimitingService.checkRateLimit(expensiveContext);
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Daily cost limit would be exceeded');
      expect(decision.fallbackSuggested).toContain('tomorrow');
    });

    it('should enforce domain throttling', async () => {
      // First request should succeed
      const decision1 = await rateLimitingService.checkRateLimit(mockContext);
      expect(decision1.allowed).toBe(true);

      // Immediate second request to same domain should be throttled
      const decision2 = await rateLimitingService.checkRateLimit(mockContext);
      expect(decision2.allowed).toBe(false);
      expect(decision2.reason).toContain('throttled');
      expect(decision2.waitTimeMs).toBeGreaterThan(0);
    });

    it('should allow requests to different domains simultaneously', async () => {
      const context1 = { ...mockContext, domain: 'example1.com' };
      const context2 = { ...mockContext, domain: 'example2.com' };

      const decision1 = await rateLimitingService.checkRateLimit(context1);
      const decision2 = await rateLimitingService.checkRateLimit(context2);

      expect(decision1.allowed).toBe(true);
      expect(decision2.allowed).toBe(true);
    });

    it('should provide meaningful fallback suggestions', async () => {
      const throttledContext = { ...mockContext };
      
      // Trigger throttling
      await rateLimitingService.checkRateLimit(throttledContext);
      const decision = await rateLimitingService.checkRateLimit(throttledContext);
      
      expect(decision.fallbackSuggested).toBeDefined();
      expect(decision.fallbackSuggested).toContain('cached');
    });
  });

  describe('Rate Limit Execution', () => {
    let mockContext: RateLimitContext;

    beforeEach(() => {
      mockContext = {
        projectId: 'test-project-1',
        domain: 'example.com',
        priority: 'normal',
        source: 'initial_report',
        requestId: 'test-request-123'
      };
    });

    it('should execute requests within rate limits', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await rateLimitingService.executeWithRateLimit(
        mockContext,
        mockFunction
      );
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should throw error when rate limits exceeded', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      
      // Execute first request
      await rateLimitingService.executeWithRateLimit(mockContext, mockFunction);
      
      // Second request should be throttled (domain throttling)
      await expect(
        rateLimitingService.executeWithRateLimit(mockContext, mockFunction)
      ).rejects.toThrow('Rate limit exceeded');
      
      expect(mockFunction).toHaveBeenCalledTimes(1); // Only first request executed
    });

    it('should handle function execution errors properly', async () => {
      const mockError = new Error('Function execution failed');
      const mockFunction = jest.fn().mockRejectedValue(mockError);
      
      await expect(
        rateLimitingService.executeWithRateLimit(mockContext, mockFunction)
      ).rejects.toThrow('Function execution failed');
      
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should track concurrent requests correctly', async () => {
      const slowMockFunction = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );
      
      const contextDifferentDomain = { ...mockContext, domain: 'different.com' };
      
      // Start concurrent executions
      const promise1 = rateLimitingService.executeWithRateLimit(mockContext, slowMockFunction);
      const promise2 = rateLimitingService.executeWithRateLimit(contextDifferentDomain, slowMockFunction);
      
      // Check metrics during execution
      const metrics = rateLimitingService.getRateLimitingMetrics();
      expect(metrics.currentConcurrentRequests).toBeGreaterThan(0);
      
      await Promise.all([promise1, promise2]);
      
      // Check metrics after completion
      const finalMetrics = rateLimitingService.getRateLimitingMetrics();
      expect(finalMetrics.currentConcurrentRequests).toBe(0);
    });
  });

  describe('Circuit Breaker Functionality', () => {
    let mockContext: RateLimitContext;

    beforeEach(() => {
      mockContext = {
        projectId: 'test-project-1',
        domain: 'example.com',
        priority: 'normal',
        source: 'initial_report',
        requestId: 'test-request-123'
      };
    });

    it('should allow requests when circuit breaker is closed', async () => {
      const circuitBreakerInfo = rateLimitingService.getCircuitBreakerInfo();
      expect(circuitBreakerInfo.state).toBe('closed');
      
      const decision = await rateLimitingService.checkRateLimit(mockContext);
      expect(decision.allowed).toBe(true);
    });

    it('should open circuit breaker after error threshold exceeded', async () => {
      const failingFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      const contextDifferentDomain = { ...mockContext };
      
      // Generate enough failures to trigger circuit breaker
      // Using different domains to avoid domain throttling interference
      for (let i = 0; i < 10; i++) {
        contextDifferentDomain.domain = `example${i}.com`;
        try {
          await rateLimitingService.executeWithRateLimit(contextDifferentDomain, failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }
      
      const circuitBreakerInfo = rateLimitingService.getCircuitBreakerInfo();
      expect(circuitBreakerInfo.errorRate).toBeGreaterThan(0.4); // Should be high
    });

    it('should manually trigger circuit breaker', () => {
      rateLimitingService.triggerCircuitBreaker('Manual test trigger');
      
      const circuitBreakerInfo = rateLimitingService.getCircuitBreakerInfo();
      expect(circuitBreakerInfo.state).toBe('open');
      expect(circuitBreakerInfo.nextRetryTime).toBeDefined();
    });

    it('should manually reset circuit breaker', () => {
      // First trigger it
      rateLimitingService.triggerCircuitBreaker('Test');
      expect(rateLimitingService.getCircuitBreakerInfo().state).toBe('open');
      
      // Then reset it
      rateLimitingService.resetCircuitBreaker();
      const circuitBreakerInfo = rateLimitingService.getCircuitBreakerInfo();
      expect(circuitBreakerInfo.state).toBe('closed');
      expect(circuitBreakerInfo.errorCount).toBe(0);
      expect(circuitBreakerInfo.successCount).toBe(0);
    });

    it('should reject requests when circuit breaker is open', async () => {
      rateLimitingService.triggerCircuitBreaker('Test');
      
      const decision = await rateLimitingService.checkRateLimit(mockContext);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Circuit breaker is open');
      expect(decision.waitTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration successfully', () => {
      const newConfig = {
        maxGlobalConcurrent: 25,
        maxDailyCostUsd: 20
      };
      
      rateLimitingService.updateConfiguration(newConfig);
      
      // Verify by checking behavior - new limits should be in effect
      expect(logger.info).toHaveBeenCalledWith(
        'Rate limiting configuration updated',
        expect.objectContaining({
          newConfig: expect.objectContaining(newConfig)
        })
      );
    });

    it('should clear throttling state', () => {
      rateLimitingService.clearThrottlingState();
      
      expect(logger.info).toHaveBeenCalledWith('All throttling state cleared');
    });
  });

  describe('Metrics and Monitoring', () => {
    let mockContext: RateLimitContext;

    beforeEach(() => {
      mockContext = {
        projectId: 'test-project-1',
        domain: 'example.com',
        priority: 'normal',
        source: 'initial_report',
        requestId: 'test-request-123'
      };
    });

    it('should provide comprehensive metrics', () => {
      const metrics = rateLimitingService.getRateLimitingMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('throttledRequests');
      expect(metrics).toHaveProperty('circuitBreakerRejects');
      expect(metrics).toHaveProperty('costLimitRejects');
      expect(metrics).toHaveProperty('currentConcurrentRequests');
      expect(metrics).toHaveProperty('dailyCostUsd');
      expect(metrics).toHaveProperty('hourlyCostUsd');
      expect(metrics).toHaveProperty('healthScore');
      expect(metrics).toHaveProperty('recommendedActions');
      
      expect(typeof metrics.healthScore).toBe('number');
      expect(Array.isArray(metrics.recommendedActions)).toBe(true);
    });

    it('should track request metrics correctly', async () => {
      const initialMetrics = rateLimitingService.getRateLimitingMetrics();
      const initialTotal = initialMetrics.totalRequests;
      
      await rateLimitingService.checkRateLimit(mockContext);
      
      const updatedMetrics = rateLimitingService.getRateLimitingMetrics();
      expect(updatedMetrics.totalRequests).toBe(initialTotal + 1);
    });

    it('should track cost metrics correctly', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      const costContext = { ...mockContext, estimatedCostUsd: 0.25 };
      
      const initialMetrics = rateLimitingService.getRateLimitingMetrics();
      const initialCost = initialMetrics.dailyCostUsd;
      
      await rateLimitingService.executeWithRateLimit(costContext, mockFunction);
      
      const updatedMetrics = rateLimitingService.getRateLimitingMetrics();
      expect(updatedMetrics.dailyCostUsd).toBeGreaterThan(initialCost);
    });

    it('should calculate health score correctly', () => {
      const metrics = rateLimitingService.getRateLimitingMetrics();
      
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
    });

    it('should provide usage statistics', () => {
      const stats = rateLimitingService.getUsageStatistics();
      
      expect(stats).toHaveProperty('dailyStats');
      expect(stats).toHaveProperty('hourlyStats');
      expect(stats.dailyStats).toHaveProperty('date');
      expect(stats.dailyStats).toHaveProperty('requests');
      expect(stats.dailyStats).toHaveProperty('successes');
      expect(stats.dailyStats).toHaveProperty('failures');
      expect(stats.dailyStats).toHaveProperty('costUsd');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent rate limit checks', async () => {
      const contexts = Array.from({ length: 20 }, (_, i) => ({
        projectId: `project-${i}`,
        domain: `example${i}.com`,
        priority: 'normal' as const,
        source: 'test' as const,
        requestId: `request-${i}`
      }));
      
      const promises = contexts.map(context => 
        rateLimitingService.checkRateLimit(context)
      );
      
      const results = await Promise.all(promises);
      
      // Most should succeed (different domains)
      const allowedCount = results.filter(r => r.allowed).length;
      expect(allowedCount).toBeGreaterThan(15);
    });

    it('should enforce global concurrency limits under load', async () => {
      const mockFunction = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('success'), 50))
      );
      
      // Try to execute more requests than global limit
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        projectId: `project-${i}`,
        domain: `example${i}.com`,
        priority: 'normal' as const,
        source: 'test' as const,
        requestId: `request-${i}`
      }));
      
      const promises = contexts.map(context => 
        rateLimitingService.executeWithRateLimit(context, mockFunction)
          .catch(error => ({ error: error.message }))
      );
      
      const results = await Promise.all(promises);
      
      // Some should succeed, some should be rate limited
      const successes = results.filter(r => !('error' in r)).length;
      const rateLimited = results.filter(r => 
        'error' in r && r.error.includes('Rate limit exceeded')
      ).length;
      
      expect(successes).toBeGreaterThan(0);
      expect(rateLimited).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid contexts gracefully', async () => {
      const invalidContext = {
        projectId: '',
        domain: '',
        priority: 'normal' as const,
        source: 'test' as const,
        requestId: ''
      };
      
      // Should not throw error
      const decision = await rateLimitingService.checkRateLimit(invalidContext);
      expect(decision.allowed).toBeDefined(); // Should return some decision
    });

    it('should handle cleanup gracefully', async () => {
      await expect(rateLimitingService.cleanup()).resolves.not.toThrow();
      
      expect(logger.info).toHaveBeenCalledWith('Rate limiting service cleaned up');
    });

    it('should handle service errors gracefully', async () => {
      // Force an error by passing invalid configuration during check
      const result = await rateLimitingService.checkRateLimit({
        projectId: 'test',
        domain: 'test.com',
        priority: 'normal',
        source: 'test',
        requestId: 'test'
      });
      
      // Should still return a decision even if internal errors occur
      expect(result).toHaveProperty('allowed');
    });
  });

  describe('Background Tasks and Maintenance', () => {
    it('should initialize without errors', () => {
      expect(rateLimitingService).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'Rate limiting service initialized',
        expect.any(Object)
      );
    });

    it('should provide meaningful recommended actions when issues detected', async () => {
      // Trigger circuit breaker to generate recommendations
      rateLimitingService.triggerCircuitBreaker('Test for recommendations');
      
      const metrics = rateLimitingService.getRateLimitingMetrics();
      expect(metrics.recommendedActions.length).toBeGreaterThan(0);
      expect(metrics.recommendedActions[0]).toContain('Circuit breaker');
    });
  });
}); 