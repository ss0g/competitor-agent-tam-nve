/**
 * Phase 5.3.1: Configuration Management Service Tests
 * Comprehensive test suite for configuration management functionality
 */

import { ConfigurationManagementService } from '../configurationManagementService';
import { DEFAULT_INITIAL_REPORT_CONFIG } from '@/types/initialReportConfig';

// Mock environment configuration
jest.mock('@/lib/env', () => ({
  immediateReportsConfig: {
    timeouts: {
      snapshotCapture: 30000,
      analysis: 45000,
      totalGeneration: 60000,
    },
    rateLimiting: {
      maxConcurrentSnapshotsPerProject: 5,
      maxConcurrentSnapshotsGlobal: 20,
      domainThrottleInterval: 10000,
    },
    qualityThresholds: {
      minDataCompletenessScore: 60,
      fallbackToPartialDataThreshold: 30,
    },
    featureFlags: {
      enableImmediateReports: true,
      enableFreshSnapshotRequirement: true,
      enableRealTimeUpdates: true,
      enableIntelligentCaching: true,
    },
    costControls: {
      dailySnapshotLimit: 1000,
      hourlySnapshotLimit: 100,
      costPerSnapshot: 0.05,
    },
    circuitBreaker: {
      errorThreshold: 0.5,
      timeWindow: 300000,
    },
    retry: {
      maxAttempts: 3,
      backoffBase: 1000,
    },
    cache: {
      ttlSeconds: 3600,
    }
  }
}));

describe('ConfigurationManagementService', () => {
  let configService: ConfigurationManagementService;

  beforeEach(() => {
    // Reset singleton instance for each test
    (ConfigurationManagementService as any).instance = undefined;
    configService = ConfigurationManagementService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = ConfigurationManagementService.getInstance();
      const instance2 = ConfigurationManagementService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize with environment configuration', () => {
      const config = configService.getCurrentConfig();
      
      expect(config.SNAPSHOT_CAPTURE_TIMEOUT).toBe(30000);
      expect(config.ANALYSIS_TIMEOUT).toBe(45000);
      expect(config.TOTAL_GENERATION_TIMEOUT).toBe(60000);
      expect(config.MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT).toBe(5);
      expect(config.ENABLE_IMMEDIATE_REPORTS).toBe(true);
    });
  });

  describe('Configuration Retrieval', () => {
    it('should return current configuration', () => {
      const config = configService.getCurrentConfig();
      
      expect(config).toHaveProperty('SNAPSHOT_CAPTURE_TIMEOUT');
      expect(config).toHaveProperty('ANALYSIS_TIMEOUT');
      expect(config).toHaveProperty('ENABLE_IMMEDIATE_REPORTS');
      expect(config).toHaveProperty('DAILY_SNAPSHOT_LIMIT');
    });

    it('should return a copy of configuration (not reference)', () => {
      const config1 = configService.getCurrentConfig();
      const config2 = configService.getCurrentConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });
  });

  describe('Configuration Updates', () => {
    it('should successfully update valid configuration', async () => {
      const updates = {
        SNAPSHOT_CAPTURE_TIMEOUT: 35000,
        MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: 7
      };

      const result = await configService.updateConfiguration({
        config: updates,
        reason: 'Test update',
        updatedBy: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.updatedFields).toEqual(['SNAPSHOT_CAPTURE_TIMEOUT', 'MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT']);
      expect(result.rollbackInfo).toBeDefined();
      expect(result.updatedBy).toBe('test-user');

      const config = configService.getCurrentConfig();
      expect(config.SNAPSHOT_CAPTURE_TIMEOUT).toBe(35000);
      expect(config.MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT).toBe(7);
    });

    it('should reject updates with invalid values', async () => {
      const updates = {
        SNAPSHOT_CAPTURE_TIMEOUT: -1000, // Invalid: negative timeout
        MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: 15 // Invalid: exceeds max
      };

      const result = await configService.updateConfiguration({
        config: updates,
        reason: 'Test invalid update',
        updatedBy: 'test-user'
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);
    });

    it('should reject updates that violate dependency rules', async () => {
      const updates = {
        TOTAL_GENERATION_TIMEOUT: 20000, // Less than ANALYSIS_TIMEOUT (45000)
      };

      const result = await configService.updateConfiguration({
        config: updates,
        reason: 'Test dependency violation',
        updatedBy: 'test-user'
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.some(error => 
        error.includes('Total generation timeout must be at least as long')
      )).toBe(true);
    });

    it('should create audit log entries for updates', async () => {
      const updates = {
        DAILY_SNAPSHOT_LIMIT: 1500
      };

      await configService.updateConfiguration({
        config: updates,
        reason: 'Increase daily limit',
        updatedBy: 'admin-user'
      });

      const auditLog = configService.getAuditLog(10);
      expect(auditLog.length).toBeGreaterThan(0);

      const latestEntry = auditLog[0];
      expect(latestEntry.action).toBe('update');
      expect(latestEntry.updatedBy).toBe('admin-user');
      expect(latestEntry.reason).toBe('Increase daily limit');
      expect(latestEntry.changes).toHaveProperty('DAILY_SNAPSHOT_LIMIT');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate timeout constraints', async () => {
      const invalidTimeouts = [
        { SNAPSHOT_CAPTURE_TIMEOUT: 1000 }, // Too low (min: 5000)
        { ANALYSIS_TIMEOUT: 500000 }, // Too high (max: 300000)
        { TOTAL_GENERATION_TIMEOUT: 10000 } // Too low (min: 15000)
      ];

      for (const invalidTimeout of invalidTimeouts) {
        const result = await configService.updateConfiguration({
          config: invalidTimeout,
          updatedBy: 'test-user'
        });

        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
      }
    });

    it('should validate concurrency limits', async () => {
      const invalidLimits = [
        { MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: 0 }, // Too low (min: 1)
        { MAX_CONCURRENT_SNAPSHOTS_GLOBAL: 150 }, // Too high (max: 100)
        { DOMAIN_THROTTLE_INTERVAL: 500 } // Too low (min: 1000)
      ];

      for (const invalidLimit of invalidLimits) {
        const result = await configService.updateConfiguration({
          config: invalidLimit,
          updatedBy: 'test-user'
        });

        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
      }
    });

    it('should validate percentage values', async () => {
      const invalidPercentages = [
        { MIN_DATA_COMPLETENESS_SCORE: -10 }, // Too low (min: 0)
        { CIRCUIT_BREAKER_ERROR_THRESHOLD: 1.5 }, // Too high (max: 0.9)
        { FALLBACK_TO_PARTIAL_DATA_THRESHOLD: 150 } // Too high (max: 100)
      ];

      for (const invalidPercentage of invalidPercentages) {
        const result = await configService.updateConfiguration({
          config: invalidPercentage,
          updatedBy: 'test-user'
        });

        expect(result.success).toBe(false);
        expect(result.validationErrors).toBeDefined();
      }
    });
  });

  describe('Performance Impact Assessment', () => {
    it('should identify high-impact changes', () => {
      const highImpactUpdates = {
        ENABLE_IMMEDIATE_REPORTS: false,
        MAX_CONCURRENT_SNAPSHOTS_GLOBAL: 50
      };

      const impact = configService.assessPerformanceImpact(highImpactUpdates);

      expect(impact.estimatedImpact).toBe('high');
      expect(impact.affectedSystems).toContain('project_creation');
      expect(impact.rolloutStrategy).toBe('maintenance_window');
    });

    it('should identify medium-impact changes', () => {
      const mediumImpactUpdates = {
        SNAPSHOT_CAPTURE_TIMEOUT: 45000,
        MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: 8
      };

      const impact = configService.assessPerformanceImpact(mediumImpactUpdates);

      expect(impact.estimatedImpact).toBe('medium');
      expect(impact.rolloutStrategy).toBe('gradual');
    });

    it('should identify low-impact changes', () => {
      const lowImpactUpdates = {
        CACHE_TTL_SECONDS: 7200,
        RETRY_BACKOFF_BASE: 1500
      };

      const impact = configService.assessPerformanceImpact(lowImpactUpdates);

      expect(impact.estimatedImpact).toBe('low');
      expect(impact.rolloutStrategy).toBe('immediate');
    });
  });

  describe('Audit Log', () => {
    it('should maintain audit log of all changes', async () => {
      // Make several updates
      await configService.updateConfiguration({
        config: { DAILY_SNAPSHOT_LIMIT: 1200 },
        reason: 'First update',
        updatedBy: 'user1'
      });

      await configService.updateConfiguration({
        config: { HOURLY_SNAPSHOT_LIMIT: 120 },
        reason: 'Second update',
        updatedBy: 'user2'
      });

      const auditLog = configService.getAuditLog(10);
      expect(auditLog.length).toBe(2);

      // Should be sorted by timestamp (newest first)
      expect(auditLog[0].updatedBy).toBe('user2');
      expect(auditLog[1].updatedBy).toBe('user1');
    });

    it('should respect audit log limit', async () => {
      // Make multiple updates
      for (let i = 0; i < 5; i++) {
        await configService.updateConfiguration({
          config: { DAILY_SNAPSHOT_LIMIT: 1000 + i },
          reason: `Update ${i}`,
          updatedBy: `user${i}`
        });
      }

      const limitedLog = configService.getAuditLog(3);
      expect(limitedLog.length).toBe(3);
    });
  });

  describe('Rollback Functionality', () => {
    it('should provide rollback tokens for updates', async () => {
      const updates = {
        SNAPSHOT_CAPTURE_TIMEOUT: 40000
      };

      const result = await configService.updateConfiguration({
        config: updates,
        reason: 'Test rollback',
        updatedBy: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.rollbackInfo).toBeDefined();
      expect(result.rollbackInfo!.rollbackToken).toBeDefined();
      expect(result.rollbackInfo!.previousValues).toEqual({
        SNAPSHOT_CAPTURE_TIMEOUT: 30000 // Original value
      });
    });

    it('should show available rollback tokens', async () => {
      await configService.updateConfiguration({
        config: { DAILY_SNAPSHOT_LIMIT: 1500 },
        updatedBy: 'test-user'
      });

      const tokens = configService.getAvailableRollbackTokens();
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0]).toHaveProperty('token');
      expect(tokens[0]).toHaveProperty('timestamp');
      expect(tokens[0]).toHaveProperty('age');
    });
  });

  describe('Environment Integration', () => {
    it('should load configuration from environment variables', () => {
      const config = configService.getCurrentConfig();
      
      // Verify values match mocked environment
      expect(config.SNAPSHOT_CAPTURE_TIMEOUT).toBe(30000);
      expect(config.ANALYSIS_TIMEOUT).toBe(45000);
      expect(config.ENABLE_IMMEDIATE_REPORTS).toBe(true);
    });

    it('should maintain configuration between service instances', async () => {
      // Update configuration
      await configService.updateConfiguration({
        config: { DAILY_SNAPSHOT_LIMIT: 2000 },
        updatedBy: 'test-user'
      });

      // Get new instance (simulating service restart)
      const newService = ConfigurationManagementService.getInstance();
      const config = newService.getCurrentConfig();

      // Should retain the updated value
      expect(config.DAILY_SNAPSHOT_LIMIT).toBe(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing configuration fields gracefully', async () => {
      const updates = {
        INVALID_FIELD: 'invalid'
      } as any;

      const result = await configService.updateConfiguration({
        config: updates,
        updatedBy: 'test-user'
      });

      expect(result.success).toBe(true);
      expect(result.updatedFields).toEqual([]); // No valid fields updated
    });

    it('should handle internal errors gracefully', async () => {
      // Mock an internal error by corrupting the audit log
      (configService as any).auditLog = null;

      const result = await configService.updateConfiguration({
        config: { DAILY_SNAPSHOT_LIMIT: 1500 },
        updatedBy: 'test-user'
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors![0]).toContain('Internal error');
    });
  });
}); 