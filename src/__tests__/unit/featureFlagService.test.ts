import { 
  getFeatureFlagService, 
  LaunchDarklyFeatureFlagService, 
  EnvironmentFeatureFlagService,
  cleanupFeatureFlagService,
  FeatureFlagContext
} from '@/services/featureFlagService';
import { featureFlags, legacyFeatureFlags, featureFlagHelpers, envFlags } from '@/lib/featureFlags';
import { env } from '@/lib/env';

// Mock the environment variables for testing
jest.mock('@/lib/env', () => ({
  env: {
    FEATURE_FLAGS_PROVIDER: 'env',
    LAUNCHDARKLY_SDK_KEY: undefined,
    LAUNCHDARKLY_ENVIRONMENT: 'development',
    FEATURE_FLAGS_CACHE_TTL: 300,
    ENABLE_COMPARATIVE_REPORTS: 'true',
    COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE: 100,
    ENABLE_PERFORMANCE_MONITORING: 'true',
    ENABLE_DEBUG_ENDPOINTS: 'true',
    ENABLE_FRESH_SNAPSHOT_REQUIREMENT: 'true',
    ENABLE_REAL_TIME_UPDATES: 'true',
    ENABLE_INTELLIGENT_CACHING: 'true',
    DEPLOYMENT_ENVIRONMENT: 'development' as const,
  }
}));

describe('FeatureFlagService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupFeatureFlagService();
  });

  describe('EnvironmentFeatureFlagService', () => {
    let service: EnvironmentFeatureFlagService;

    beforeEach(() => {
      service = new EnvironmentFeatureFlagService();
    });

    afterEach(async () => {
      await service.cleanup();
    });

    describe('isImmediateReportsEnabled', () => {
      it('should return true when feature is enabled', async () => {
        const result = await service.isImmediateReportsEnabled();
        expect(result).toBe(true);
      });

      it('should handle user-specific rollout correctly', async () => {
        // Mock partial rollout
        const originalPercentage = (env as any).COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE;
        (env as any).COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE = 50;

        const userId = 'test-user-123';
        const result = await service.isImmediateReportsEnabled(userId);
        expect(typeof result).toBe('boolean');

        // Restore original value
        (env as any).COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE = originalPercentage;
      });

      it('should cache results consistently', async () => {
        const userId = 'consistent-user';
        const result1 = await service.isImmediateReportsEnabled(userId);
        const result2 = await service.isImmediateReportsEnabled(userId);
        expect(result1).toBe(result2);
      });
    });

    describe('shouldUseFeature', () => {
      it('should return correct values for known flags', async () => {
        const tests = [
          { flag: 'immediate-reports', expected: true },
          { flag: 'comparative-reports', expected: true },
          { flag: 'performance-monitoring', expected: true },
          { flag: 'debug-endpoints', expected: true },
          { flag: 'fresh-snapshots', expected: true },
          { flag: 'real-time-updates', expected: true },
          { flag: 'intelligent-caching', expected: true },
          { flag: 'unknown-flag', expected: false },
        ];

        for (const test of tests) {
          const result = await service.shouldUseFeature(test.flag);
          expect(result).toBe(test.expected);
        }
      });

      it('should handle context-based evaluation', async () => {
        const context: FeatureFlagContext = {
          userId: 'test-user',
          projectId: 'test-project',
          userType: 'pro',
        };

        const result = await service.shouldUseFeature('immediate-reports', context);
        expect(typeof result).toBe('boolean');
      });
    });

    describe('getRolloutPercentage', () => {
      it('should return environment rollout percentage', async () => {
        const result = await service.getRolloutPercentage();
        expect(result).toBe(env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE);
      });
    });

    describe('getAllFlags', () => {
      it('should return all feature flags', async () => {
        const flags = await service.getAllFlags();
        
        expect(flags).toEqual({
          'immediate-reports': true,
          'immediate-reports-rollout-percentage': 100,
          'comparative-reports': true,
          'performance-monitoring': true,
          'debug-endpoints': true,
          'fresh-snapshots': true,
          'real-time-updates': true,
          'intelligent-caching': true,
        });
      });
    });

    describe('getFeatureVariant', () => {
      it('should return default value for variants', async () => {
        const defaultValue = { variant: 'control', value: 42 };
        const result = await service.getFeatureVariant('test-flag', defaultValue);
        expect(result).toEqual(defaultValue);
      });
    });
  });

  describe('FeatureFlags Main Interface', () => {
    describe('isImmediateReportsEnabled', () => {
      it('should delegate to service correctly', async () => {
        const result = await featureFlags.isImmediateReportsEnabled('test-user');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('convenience methods', () => {
      it('should provide convenient flag checking methods', async () => {
        const context = featureFlags.createContext('test-user');
        
        const results = await Promise.all([
          featureFlags.isComparativeReportsEnabled(context),
          featureFlags.isPerformanceMonitoringEnabled(context),
          featureFlags.isDebugEndpointsEnabled(context),
          featureFlags.isFreshSnapshotsEnabled(context),
          featureFlags.isRealTimeUpdatesEnabled(context),
          featureFlags.isIntelligentCachingEnabled(context),
        ]);

        results.forEach(result => expect(typeof result).toBe('boolean'));
      });
    });

    describe('context creation', () => {
      it('should create user context correctly', () => {
        const context = featureFlags.createContext('user-123', {
          userType: 'enterprise',
          organizationId: 'org-456',
        });

        expect(context).toEqual({
          userId: 'user-123',
          environment: 'development',
          userType: 'enterprise',
          organizationId: 'org-456',
        });
      });

      it('should create project context correctly', () => {
        const context = featureFlags.createProjectContext('project-123', 'user-456');

        expect(context).toEqual({
          projectId: 'project-123',
          userId: 'user-456',
          environment: 'development',
        });
      });

      it('should create project context without user correctly', () => {
        const context = featureFlags.createProjectContext('project-123');

        expect(context).toEqual({
          projectId: 'project-123',
          environment: 'development',
        });
      });
    });

    describe('batch operations', () => {
      it('should check multiple flags efficiently', async () => {
        const flags = ['immediate-reports', 'performance-monitoring', 'debug-endpoints'];
        const results = await featureFlags.checkMultiple(flags);

        expect(Object.keys(results)).toEqual(flags);
        Object.values(results).forEach(value => expect(typeof value).toBe('boolean'));
      });
    });

    describe('user rollout logic', () => {
      it('should handle percentage rollouts correctly', () => {
        const userId = 'test-user-123';
        
        expect(featureFlags.shouldShowForUser(userId, 0)).toBe(false);
        expect(featureFlags.shouldShowForUser(userId, 100)).toBe(true);
        
        // Same user should get consistent results
        const result50a = featureFlags.shouldShowForUser(userId, 50);
        const result50b = featureFlags.shouldShowForUser(userId, 50);
        expect(result50a).toBe(result50b);
      });
    });

    describe('configuration summary', () => {
      it('should provide complete configuration summary', async () => {
        const summary = await featureFlags.getConfigSummary();

        expect(summary).toEqual({
          provider: 'env',
          environment: 'development',
          flags: expect.any(Object),
          rolloutPercentage: 100,
        });
      });

      it('should include context when provided', async () => {
        const context = featureFlags.createContext('test-user');
        const summary = await featureFlags.getConfigSummary(context);

        expect(summary.context).toEqual(context);
      });
    });
  });

  describe('Legacy Feature Flags', () => {
    it('should maintain backward compatibility', () => {
      expect(legacyFeatureFlags.isComparativeReportsEnabled()).toBe(true);
      expect(legacyFeatureFlags.isPerformanceMonitoringEnabled()).toBe(true);
      expect(legacyFeatureFlags.isDebugEndpointsEnabled()).toBe(true);
      expect(legacyFeatureFlags.isProductionEnvironment()).toBe(false);
    });

    it('should handle project-based rollout', () => {
      const result = legacyFeatureFlags.shouldUseComparativeReports('test-project');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Feature Flag Helpers', () => {
    it('should create mock contexts for testing', () => {
      const mockContext = featureFlagHelpers.createMockContext({
        userType: 'enterprise',
      });

      expect(mockContext).toEqual({
        userId: 'test-user',
        environment: 'development',
        userType: 'enterprise',
      });
    });

    it('should provide provider information', () => {
      const info = featureFlagHelpers.getProviderInfo();

      expect(info).toEqual({
        provider: 'env',
        hasLaunchDarklyKey: false,
        environment: 'development',
        cacheTtl: 300,
      });
    });
  });

  describe('Environment Flags Export', () => {
    it('should export environment flags correctly', () => {
      expect(envFlags).toEqual({
        ENABLE_COMPARATIVE_REPORTS: true,
        COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE: 100,
        ENABLE_PERFORMANCE_MONITORING: true,
        ENABLE_DEBUG_ENDPOINTS: true,
        ENABLE_FRESH_SNAPSHOT_REQUIREMENT: true,
        ENABLE_REAL_TIME_UPDATES: true,
        ENABLE_INTELLIGENT_CACHING: true,
      });
    });
  });

  describe('Service Factory', () => {
    it('should return EnvironmentFeatureFlagService by default', () => {
      const service = getFeatureFlagService();
      expect(service).toBeInstanceOf(EnvironmentFeatureFlagService);
    });

    it('should cache service instance', () => {
      const service1 = getFeatureFlagService();
      const service2 = getFeatureFlagService();
      expect(service1).toBe(service2);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache feature flag results', async () => {
      const service = new EnvironmentFeatureFlagService();
      
      // First call
      const start1 = Date.now();
      const result1 = await service.shouldUseFeature('immediate-reports');
      const duration1 = Date.now() - start1;
      
      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = await service.shouldUseFeature('immediate-reports');
      const duration2 = Date.now() - start2;
      
      expect(result1).toBe(result2);
      expect(duration2).toBeLessThan(duration1); // Cached should be faster
      
      await service.cleanup();
    });
  });
});

describe('LaunchDarkly Integration', () => {
  // Note: These tests would require actual LaunchDarkly setup in a real environment
  // For now, we test the fallback behavior
  
  it('should fall back to environment variables when LaunchDarkly is not configured', async () => {
    const service = new LaunchDarklyFeatureFlagService();
    
    const result = await service.isImmediateReportsEnabled('test-user');
    expect(typeof result).toBe('boolean');
    
    await service.cleanup();
  });

  it('should handle LaunchDarkly initialization failures gracefully', async () => {
    // This tests the graceful fallback when LaunchDarkly fails to initialize
    const service = new LaunchDarklyFeatureFlagService();
    
    const result = await service.shouldUseFeature('immediate-reports');
    expect(typeof result).toBe('boolean');
    
    await service.cleanup();
  });
}); 