import { getFeatureFlagService, FeatureFlagContext } from '@/services/featureFlagService';
import { env } from './env';

// Re-export types for convenience
export type { FeatureFlagContext } from '@/services/featureFlagService';

/**
 * Feature flag client that provides a simple interface for checking feature flags
 * Automatically handles LaunchDarkly integration with fallback to environment variables
 */
class FeatureFlags {
  private service = getFeatureFlagService();

  /**
   * Check if immediate comparative reports feature is enabled for a user
   * @param userId - Optional user ID for consistent rollout
   */
  async isImmediateReportsEnabled(userId?: string): Promise<boolean> {
    return this.service.isImmediateReportsEnabled(userId);
  }

  /**
   * Get the current rollout percentage for immediate reports
   */
  async getRolloutPercentage(): Promise<number> {
    return this.service.getRolloutPercentage();
  }

  /**
   * Check if a specific feature flag is enabled
   * @param flag - Feature flag name
   * @param context - Optional context for user targeting
   */
  async isEnabled(flag: string, context?: FeatureFlagContext): Promise<boolean> {
    return this.service.shouldUseFeature(flag, context);
  }

  /**
   * Get a feature flag variant (useful for A/B testing)
   * @param flag - Feature flag name
   * @param defaultValue - Default value if flag is not found
   * @param context - Optional context for user targeting
   */
  async getVariant<T>(flag: string, defaultValue: T, context?: FeatureFlagContext): Promise<T> {
    return this.service.getFeatureVariant(flag, defaultValue, context);
  }

  /**
   * Get all feature flags for a given context
   * @param context - Optional context for user targeting
   */
  async getAllFlags(context?: FeatureFlagContext): Promise<Record<string, string | number | boolean>> {
    return this.service.getAllFlags(context);
  }

  /**
   * Check if comparative reports feature is enabled
   * @param context - Optional context for user targeting
   */
  async isComparativeReportsEnabled(context?: FeatureFlagContext): Promise<boolean> {
    return this.isEnabled('comparative-reports', context);
  }

  /**
   * Check if performance monitoring is enabled
   * @param context - Optional context for user targeting
   */
  async isPerformanceMonitoringEnabled(context?: FeatureFlagContext): Promise<boolean> {
    return this.isEnabled('performance-monitoring', context);
  }

  /**
   * Check if debug endpoints are enabled
   * @param context - Optional context for user targeting
   */
  async isDebugEndpointsEnabled(context?: FeatureFlagContext): Promise<boolean> {
    return this.isEnabled('debug-endpoints', context);
  }

  /**
   * Check if fresh snapshot requirement is enabled
   * @param context - Optional context for user targeting
   */
  async isFreshSnapshotsEnabled(context?: FeatureFlagContext): Promise<boolean> {
    return this.isEnabled('fresh-snapshots', context);
  }

  /**
   * Check if real-time updates are enabled
   * @param context - Optional context for user targeting
   */
  async isRealTimeUpdatesEnabled(context?: FeatureFlagContext): Promise<boolean> {
    return this.isEnabled('real-time-updates', context);
  }

  /**
   * Check if intelligent caching is enabled
   * @param context - Optional context for user targeting
   */
  async isIntelligentCachingEnabled(context?: FeatureFlagContext): Promise<boolean> {
    return this.isEnabled('intelligent-caching', context);
  }

  /**
   * Create a feature flag context for a user
   * @param userId - User ID
   * @param options - Additional context options
   */
  createContext(userId: string, options?: Partial<FeatureFlagContext>): FeatureFlagContext {
    return {
      userId,
      environment: env.DEPLOYMENT_ENVIRONMENT,
      ...options,
    };
  }

  /**
   * Create a feature flag context for a project
   * @param projectId - Project ID
   * @param userId - Optional user ID
   * @param options - Additional context options
   */
  createProjectContext(
    projectId: string,
    userId?: string,
    options?: Partial<FeatureFlagContext>
  ): FeatureFlagContext {
    const context: FeatureFlagContext = {
      projectId,
      environment: env.DEPLOYMENT_ENVIRONMENT,
      ...options,
    };
    
    if (userId) {
      context.userId = userId;
    }
    
    return context;
  }

  /**
   * Batch check multiple feature flags
   * @param flags - Array of flag names to check
   * @param context - Optional context for user targeting
   */
  async checkMultiple(
    flags: string[],
    context?: FeatureFlagContext
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Use Promise.all for parallel execution
    const flagPromises = flags.map(async (flag) => {
      const enabled = await this.isEnabled(flag, context);
      return { flag, enabled };
    });

    const resolvedFlags = await Promise.all(flagPromises);
    
    for (const { flag, enabled } of resolvedFlags) {
      results[flag] = enabled;
    }

    return results;
  }

  /**
   * Check if user should see the feature based on percentage rollout
   * @param userId - User ID for consistent hashing
   * @param percentage - Rollout percentage (0-100)
   */
  shouldShowForUser(userId: string, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Use consistent hashing based on user ID
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const userPercentile = Math.abs(hash % 100);
    return userPercentile < percentage;
  }

  /**
   * Get feature flag configuration summary for debugging
   */
  async getConfigSummary(context?: FeatureFlagContext): Promise<{
    provider: string;
    environment: string;
    flags: Record<string, string | number | boolean>;
    rolloutPercentage: number;
    context?: FeatureFlagContext;
  }> {
    const [flags, rolloutPercentage] = await Promise.all([
      this.getAllFlags(context),
      this.getRolloutPercentage(),
    ]);

    const summary = {
      provider: env.FEATURE_FLAGS_PROVIDER,
      environment: env.DEPLOYMENT_ENVIRONMENT,
      flags,
      rolloutPercentage,
    } as const;

    return context ? { ...summary, context } : summary;
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlags();

// Export legacy functions for backward compatibility
export const legacyFeatureFlags = {
  isComparativeReportsEnabled(): boolean {
    return env.ENABLE_COMPARATIVE_REPORTS === 'true';
  },
  
  shouldUseComparativeReports(projectId?: string): boolean {
    if (!this.isComparativeReportsEnabled()) {
      return false;
    }
    
    // Gradual rollout based on percentage
    if (env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE < 100) {
      // Use project ID hash for consistent rollout
      if (projectId) {
        const hash = projectId.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        const percentage = Math.abs(hash % 100);
        return percentage < env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE;
      }
      
      // Random rollout for non-project-specific calls
      return Math.random() * 100 < env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE;
    }
    
    return true;
  },
  
  isPerformanceMonitoringEnabled(): boolean {
    return env.ENABLE_PERFORMANCE_MONITORING === 'true';
  },
  
  isDebugEndpointsEnabled(): boolean {
    return env.ENABLE_DEBUG_ENDPOINTS === 'true';
  },
  
  isProductionEnvironment(): boolean {
    return env.DEPLOYMENT_ENVIRONMENT === 'production';
  }
};

// Export helpers for testing and development
export const featureFlagHelpers = {
  /**
   * Create a mock context for testing
   */
  createMockContext(overrides?: Partial<FeatureFlagContext>): FeatureFlagContext {
    return {
      userId: 'test-user',
      environment: 'development',
      userType: 'pro',
      ...overrides,
    };
  },

  /**
   * Get feature flag provider information
   */
  getProviderInfo() {
    return {
      provider: env.FEATURE_FLAGS_PROVIDER,
      hasLaunchDarklyKey: !!env.LAUNCHDARKLY_SDK_KEY,
      environment: env.LAUNCHDARKLY_ENVIRONMENT,
      cacheTtl: env.FEATURE_FLAGS_CACHE_TTL,
    };
  },
};

// Export environment-based flags for migration/legacy support
export { env } from './env';
export const envFlags = {
  ENABLE_COMPARATIVE_REPORTS: env.ENABLE_COMPARATIVE_REPORTS === 'true',
  COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE: env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE,
  ENABLE_PERFORMANCE_MONITORING: env.ENABLE_PERFORMANCE_MONITORING === 'true',
  ENABLE_DEBUG_ENDPOINTS: env.ENABLE_DEBUG_ENDPOINTS === 'true',
  ENABLE_FRESH_SNAPSHOT_REQUIREMENT: env.ENABLE_FRESH_SNAPSHOT_REQUIREMENT === 'true',
  ENABLE_REAL_TIME_UPDATES: env.ENABLE_REAL_TIME_UPDATES === 'true',
  ENABLE_INTELLIGENT_CACHING: env.ENABLE_INTELLIGENT_CACHING === 'true',
}; 