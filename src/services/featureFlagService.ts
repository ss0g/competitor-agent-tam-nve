import { init, LDClient, LDUser } from 'launchdarkly-node-server-sdk';
import { env } from '@/lib/env';

export interface FeatureFlagContext {
  userId?: string;
  projectId?: string;
  userType?: 'free' | 'pro' | 'enterprise';
  organizationId?: string;
  environment?: 'development' | 'staging' | 'production';
  metadata?: Record<string, string | number | boolean>;
}

export interface FeatureFlagService {
  isImmediateReportsEnabled(userId?: string): Promise<boolean>;
  getRolloutPercentage(): Promise<number>;
  shouldUseFeature(flag: string, context?: FeatureFlagContext): Promise<boolean>;
  getFeatureVariant<T>(flag: string, defaultValue: T, context?: FeatureFlagContext): Promise<T>;
  getAllFlags(context?: FeatureFlagContext): Promise<Record<string, string | number | boolean>>;
  cleanup(): Promise<void>;
}

class LaunchDarklyFeatureFlagService implements FeatureFlagService {
  private client: LDClient | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private cache = new Map<string, { value: string | number | boolean; timestamp: number }>();
  private readonly cacheKey = (flag: string, context?: FeatureFlagContext): string => {
    return `${flag}:${JSON.stringify(context || {})}`;
  };

  constructor() {
    if (env.LAUNCHDARKLY_SDK_KEY && env.FEATURE_FLAGS_PROVIDER === 'launchdarkly') {
      this.initializationPromise = this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    try {
      if (!env.LAUNCHDARKLY_SDK_KEY) {
        throw new Error('LaunchDarkly SDK key not provided');
      }

      this.client = init(env.LAUNCHDARKLY_SDK_KEY, {
        timeout: 5, // 5 seconds timeout
        baseUri: 'https://sdk.launchdarkly.com',
        streamUri: 'https://stream.launchdarkly.com',
        eventsUri: 'https://events.launchdarkly.com',
        capacity: 1000,
        flushInterval: 30,
        pollInterval: 30,
        logger: {
          debug: (msg: string) => console.debug(`[LaunchDarkly Debug] ${msg}`),
          info: (msg: string) => console.info(`[LaunchDarkly Info] ${msg}`),
          warn: (msg: string) => console.warn(`[LaunchDarkly Warning] ${msg}`),
          error: (msg: string) => console.error(`[LaunchDarkly Error] ${msg}`),
        },
      });

      await this.client.waitForInitialization();
      this.isInitialized = true;
      console.log('LaunchDarkly client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LaunchDarkly client:', error);
      this.client = null;
      this.isInitialized = false;
      // Don't throw - fall back to environment variables
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  private createLDUser(context?: FeatureFlagContext): LDUser {
    const user: LDUser = {
      key: context?.userId || 'anonymous',
      anonymous: !context?.userId,
    };

    if (context?.userId) {
      user.name = context.userId;
    }

    if (context?.userType) {
      user.custom = {
        ...user.custom,
        userType: context.userType,
      };
    }

    if (context?.projectId) {
      user.custom = {
        ...user.custom,
        projectId: context.projectId,
      };
    }

    if (context?.organizationId) {
      user.custom = {
        ...user.custom,
        organizationId: context.organizationId,
      };
    }

    if (context?.environment) {
      user.custom = {
        ...user.custom,
        environment: context.environment,
      };
    }

    if (context?.metadata) {
      user.custom = {
        ...user.custom,
        ...context.metadata,
      };
    }

    return user;
  }

  private getCachedValue(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < env.FEATURE_FLAGS_CACHE_TTL * 1000) {
      return cached.value;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedValue(key: string, value: any): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  async isImmediateReportsEnabled(userId?: string): Promise<boolean> {
    const context: FeatureFlagContext = userId ? { userId } : {};
    return this.shouldUseFeature('immediate-reports', context);
  }

  async getRolloutPercentage(): Promise<number> {
    await this.ensureInitialized();

    if (this.isInitialized && this.client) {
      try {
        const percentage = await this.client.variation(
          'immediate-reports-rollout-percentage',
          this.createLDUser(),
          env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE
        );
        return typeof percentage === 'number' ? percentage : env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE;
      } catch (error) {
        console.error('Error getting rollout percentage from LaunchDarkly:', error);
      }
    }

    // Fallback to environment variable
    return env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE;
  }

  async shouldUseFeature(flag: string, context?: FeatureFlagContext): Promise<boolean> {
    const cacheKey = this.cacheKey(flag, context);
    const cached = this.getCachedValue(cacheKey);
    if (cached !== null) {
      return cached;
    }

    await this.ensureInitialized();

    if (this.isInitialized && this.client) {
      try {
        const user = this.createLDUser(context);
        const result = await this.client.variation(flag, user, this.getEnvironmentFallback(flag));
        this.setCachedValue(cacheKey, result);
        return result;
      } catch (error) {
        console.error(`Error evaluating feature flag '${flag}' from LaunchDarkly:`, error);
      }
    }

    // Fallback to environment variables
    const fallbackValue = this.getEnvironmentFallback(flag);
    this.setCachedValue(cacheKey, fallbackValue);
    return fallbackValue;
  }

  async getFeatureVariant<T>(flag: string, defaultValue: T, context?: FeatureFlagContext): Promise<T> {
    const cacheKey = this.cacheKey(`${flag}:variant`, context);
    const cached = this.getCachedValue(cacheKey);
    if (cached !== null) {
      return cached as T;
    }

    await this.ensureInitialized();

    if (this.isInitialized && this.client) {
      try {
        const user = this.createLDUser(context);
        const result = await this.client.variation(flag, user, defaultValue);
        this.setCachedValue(cacheKey, result as string | number | boolean);
        return result;
      } catch (error) {
        console.error(`Error getting feature variant '${flag}' from LaunchDarkly:`, error);
      }
    }

    // Fallback to default value
    this.setCachedValue(cacheKey, defaultValue as string | number | boolean);
    return defaultValue;
  }

  async getAllFlags(context?: FeatureFlagContext): Promise<Record<string, string | number | boolean>> {
    // Note: Complex objects are not cached to avoid type complexity
    await this.ensureInitialized();

    if (this.isInitialized && this.client) {
      try {
        const user = this.createLDUser(context);
        const result = await this.client.allFlagsState(user);
        return result.allValues() as Record<string, string | number | boolean>;
      } catch (error) {
        console.error('Error getting all flags from LaunchDarkly:', error);
      }
    }

    // Fallback to environment-based flags
    return this.getEnvironmentFlags();
  }

  private getEnvironmentFallback(flag: string): boolean {
    // Map LaunchDarkly flag names to environment variables
    const flagMappings: Record<string, boolean> = {
      'immediate-reports': env.ENABLE_COMPARATIVE_REPORTS === 'true',
      'comparative-reports': env.ENABLE_COMPARATIVE_REPORTS === 'true',
      'performance-monitoring': env.ENABLE_PERFORMANCE_MONITORING === 'true',
      'debug-endpoints': env.ENABLE_DEBUG_ENDPOINTS === 'true',
      'fresh-snapshots': env.ENABLE_FRESH_SNAPSHOT_REQUIREMENT === 'true',
      'real-time-updates': env.ENABLE_REAL_TIME_UPDATES === 'true',
      'intelligent-caching': env.ENABLE_INTELLIGENT_CACHING === 'true',
    };

    return flagMappings[flag] ?? false;
  }

  private getEnvironmentFlags(): Record<string, string | number | boolean> {
    return {
      'immediate-reports': env.ENABLE_COMPARATIVE_REPORTS === 'true',
      'immediate-reports-rollout-percentage': env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE,
      'comparative-reports': env.ENABLE_COMPARATIVE_REPORTS === 'true',
      'performance-monitoring': env.ENABLE_PERFORMANCE_MONITORING === 'true',
      'debug-endpoints': env.ENABLE_DEBUG_ENDPOINTS === 'true',
      'fresh-snapshots': env.ENABLE_FRESH_SNAPSHOT_REQUIREMENT === 'true',
      'real-time-updates': env.ENABLE_REAL_TIME_UPDATES === 'true',
      'intelligent-caching': env.ENABLE_INTELLIGENT_CACHING === 'true',
    };
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.isInitialized = false;
    }
    this.cache.clear();
  }
}

class EnvironmentFeatureFlagService implements FeatureFlagService {
  private cache = new Map<string, { value: string | number | boolean; timestamp: number }>();
  
  private getCachedValue(key: string): string | number | boolean | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < env.FEATURE_FLAGS_CACHE_TTL * 1000) {
      return cached.value;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedValue(key: string, value: string | number | boolean): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  async isImmediateReportsEnabled(userId?: string): Promise<boolean> {
    const cacheKey = `immediate-reports:${userId || 'anonymous'}`;
    const cached = this.getCachedValue(cacheKey);
    if (cached !== null) {
      return cached as boolean;
    }

    const enabled = env.ENABLE_COMPARATIVE_REPORTS === 'true';
    
    if (enabled && env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE < 100) {
      // Use user ID hash for consistent rollout
      if (userId) {
        const hash = userId.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        const percentage = Math.abs(hash % 100);
        const result = percentage < env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE;
        this.setCachedValue(cacheKey, result);
        return result;
      }
      
      // Random rollout for anonymous users
      const result = Math.random() * 100 < env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE;
      this.setCachedValue(cacheKey, result);
      return result;
    }

    this.setCachedValue(cacheKey, enabled);
    return enabled;
  }

  async getRolloutPercentage(): Promise<number> {
    return env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE;
  }

  async shouldUseFeature(flag: string, context?: FeatureFlagContext): Promise<boolean> {
    const cacheKey = `${flag}:${JSON.stringify(context || {})}`;
    const cached = this.getCachedValue(cacheKey);
    if (cached !== null) {
      return cached as boolean;
    }

    const flagMappings: Record<string, boolean> = {
      'immediate-reports': env.ENABLE_COMPARATIVE_REPORTS === 'true',
      'comparative-reports': env.ENABLE_COMPARATIVE_REPORTS === 'true',
      'performance-monitoring': env.ENABLE_PERFORMANCE_MONITORING === 'true',
      'debug-endpoints': env.ENABLE_DEBUG_ENDPOINTS === 'true',
      'fresh-snapshots': env.ENABLE_FRESH_SNAPSHOT_REQUIREMENT === 'true',
      'real-time-updates': env.ENABLE_REAL_TIME_UPDATES === 'true',
      'intelligent-caching': env.ENABLE_INTELLIGENT_CACHING === 'true',
    };

    const result = flagMappings[flag] ?? false;
    
    // Apply rollout percentage for immediate reports
    if (flag === 'immediate-reports' && result && context?.userId) {
      const rolloutResult = await this.isImmediateReportsEnabled(context.userId);
      this.setCachedValue(cacheKey, rolloutResult);
      return rolloutResult;
    }

    this.setCachedValue(cacheKey, result);
    return result;
  }

  async getFeatureVariant<T>(flag: string, defaultValue: T, context?: FeatureFlagContext): Promise<T> {
    // Environment-based service doesn't support variants, return default
    return defaultValue;
  }

  async getAllFlags(context?: FeatureFlagContext): Promise<Record<string, string | number | boolean>> {
    return {
      'immediate-reports': await this.shouldUseFeature('immediate-reports', context),
      'immediate-reports-rollout-percentage': env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE,
      'comparative-reports': env.ENABLE_COMPARATIVE_REPORTS === 'true',
      'performance-monitoring': env.ENABLE_PERFORMANCE_MONITORING === 'true',
      'debug-endpoints': env.ENABLE_DEBUG_ENDPOINTS === 'true',
      'fresh-snapshots': env.ENABLE_FRESH_SNAPSHOT_REQUIREMENT === 'true',
      'real-time-updates': env.ENABLE_REAL_TIME_UPDATES === 'true',
      'intelligent-caching': env.ENABLE_INTELLIGENT_CACHING === 'true',
    };
  }

  async cleanup(): Promise<void> {
    this.cache.clear();
  }
}

// Singleton instance
let featureFlagServiceInstance: FeatureFlagService | null = null;

export function getFeatureFlagService(): FeatureFlagService {
  if (!featureFlagServiceInstance) {
    if (env.FEATURE_FLAGS_PROVIDER === 'launchdarkly' && env.LAUNCHDARKLY_SDK_KEY) {
      featureFlagServiceInstance = new LaunchDarklyFeatureFlagService();
    } else {
      featureFlagServiceInstance = new EnvironmentFeatureFlagService();
    }
  }
  return featureFlagServiceInstance;
}

// Export for testing
export { LaunchDarklyFeatureFlagService, EnvironmentFeatureFlagService };

// Cleanup function for graceful shutdown
export async function cleanupFeatureFlagService(): Promise<void> {
  if (featureFlagServiceInstance) {
    await featureFlagServiceInstance.cleanup();
    featureFlagServiceInstance = null;
  }
} 