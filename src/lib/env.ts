import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  AZURE_AD_CLIENT_ID: z.string().min(1).optional(),
  AZURE_AD_CLIENT_SECRET: z.string().min(1).optional(),
  AZURE_AD_TENANT_ID: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Feature Flags for Production Rollout
  ENABLE_COMPARATIVE_REPORTS: z.enum(['true', 'false']).default('true'),
  COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE: z.coerce.number().min(0).max(100).default(100),
  ENABLE_PERFORMANCE_MONITORING: z.enum(['true', 'false']).default('true'),
  ENABLE_DEBUG_ENDPOINTS: z.enum(['true', 'false']).default('true'),
  
  // LaunchDarkly Configuration
  LAUNCHDARKLY_SDK_KEY: z.string().min(1).optional(),
  LAUNCHDARKLY_ENVIRONMENT: z.string().default('development'),
  FEATURE_FLAGS_PROVIDER: z.enum(['env', 'launchdarkly']).default('env'),
  FEATURE_FLAGS_CACHE_TTL: z.coerce.number().default(300), // 5 minutes
  
  // Performance & Monitoring Configuration
  REPORT_GENERATION_TIMEOUT_MS: z.coerce.number().default(120000), // 2 minutes
  MAX_CONCURRENT_REPORTS: z.coerce.number().default(5),
  CACHE_TTL_SECONDS: z.coerce.number().default(3600), // 1 hour
  MONITORING_RETENTION_HOURS: z.coerce.number().default(24),
  
  // Immediate Reports Configuration - Phase 5.3.1
  SNAPSHOT_CAPTURE_TIMEOUT: z.coerce.number().default(30000), // 30 seconds
  ANALYSIS_TIMEOUT: z.coerce.number().default(45000), // 45 seconds
  TOTAL_GENERATION_TIMEOUT: z.coerce.number().default(60000), // 60 seconds
  MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: z.coerce.number().default(5),
  MAX_CONCURRENT_SNAPSHOTS_GLOBAL: z.coerce.number().default(20),
  DOMAIN_THROTTLE_INTERVAL: z.coerce.number().default(10000), // 10 seconds
  MIN_DATA_COMPLETENESS_SCORE: z.coerce.number().default(40),
  FALLBACK_TO_PARTIAL_DATA_THRESHOLD: z.coerce.number().default(30),
  ENABLE_FRESH_SNAPSHOT_REQUIREMENT: z.enum(['true', 'false']).default('true'),
  ENABLE_REAL_TIME_UPDATES: z.enum(['true', 'false']).default('true'),
  DAILY_SNAPSHOT_LIMIT: z.coerce.number().default(1000),
  HOURLY_SNAPSHOT_LIMIT: z.coerce.number().default(100),
  COST_PER_SNAPSHOT: z.coerce.number().default(0.05),
  CIRCUIT_BREAKER_ERROR_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
  CIRCUIT_BREAKER_TIME_WINDOW: z.coerce.number().default(300000), // 5 minutes
  MAX_RETRY_ATTEMPTS: z.coerce.number().default(3),
  RETRY_BACKOFF_BASE: z.coerce.number().default(1000), // 1 second
  ENABLE_INTELLIGENT_CACHING: z.enum(['true', 'false']).default('true'),
  
  // Production Deployment Configuration
  DEPLOYMENT_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),
  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().default(30000), // 30 seconds
  ERROR_RATE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.05), // 5%
})

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
  AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
  NODE_ENV: process.env.NODE_ENV,
  
  // Feature Flags
  ENABLE_COMPARATIVE_REPORTS: process.env.ENABLE_COMPARATIVE_REPORTS,
  COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE: process.env.COMPARATIVE_REPORTS_ROLLOUT_PERCENTAGE || '100',
  ENABLE_PERFORMANCE_MONITORING: process.env.ENABLE_PERFORMANCE_MONITORING,
  ENABLE_DEBUG_ENDPOINTS: process.env.ENABLE_DEBUG_ENDPOINTS,
  
  // LaunchDarkly Configuration
  LAUNCHDARKLY_SDK_KEY: process.env.LAUNCHDARKLY_SDK_KEY,
  LAUNCHDARKLY_ENVIRONMENT: process.env.LAUNCHDARKLY_ENVIRONMENT,
  FEATURE_FLAGS_PROVIDER: process.env.FEATURE_FLAGS_PROVIDER,
  FEATURE_FLAGS_CACHE_TTL: process.env.FEATURE_FLAGS_CACHE_TTL,
  
  // Performance & Monitoring
  REPORT_GENERATION_TIMEOUT_MS: process.env.REPORT_GENERATION_TIMEOUT_MS,
  MAX_CONCURRENT_REPORTS: process.env.MAX_CONCURRENT_REPORTS,
  CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS,
  MONITORING_RETENTION_HOURS: process.env.MONITORING_RETENTION_HOURS,
  
  // Immediate Reports Configuration - Phase 5.3.1
  SNAPSHOT_CAPTURE_TIMEOUT: process.env.SNAPSHOT_CAPTURE_TIMEOUT,
  ANALYSIS_TIMEOUT: process.env.ANALYSIS_TIMEOUT,
  TOTAL_GENERATION_TIMEOUT: process.env.TOTAL_GENERATION_TIMEOUT,
  MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: process.env.MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT,
  MAX_CONCURRENT_SNAPSHOTS_GLOBAL: process.env.MAX_CONCURRENT_SNAPSHOTS_GLOBAL,
  DOMAIN_THROTTLE_INTERVAL: process.env.DOMAIN_THROTTLE_INTERVAL,
  MIN_DATA_COMPLETENESS_SCORE: process.env.MIN_DATA_COMPLETENESS_SCORE,
  FALLBACK_TO_PARTIAL_DATA_THRESHOLD: process.env.FALLBACK_TO_PARTIAL_DATA_THRESHOLD,
  ENABLE_FRESH_SNAPSHOT_REQUIREMENT: process.env.ENABLE_FRESH_SNAPSHOT_REQUIREMENT,
  ENABLE_REAL_TIME_UPDATES: process.env.ENABLE_REAL_TIME_UPDATES,
  DAILY_SNAPSHOT_LIMIT: process.env.DAILY_SNAPSHOT_LIMIT,
  HOURLY_SNAPSHOT_LIMIT: process.env.HOURLY_SNAPSHOT_LIMIT,
  COST_PER_SNAPSHOT: process.env.COST_PER_SNAPSHOT,
  CIRCUIT_BREAKER_ERROR_THRESHOLD: process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD,
  CIRCUIT_BREAKER_TIME_WINDOW: process.env.CIRCUIT_BREAKER_TIME_WINDOW,
  MAX_RETRY_ATTEMPTS: process.env.MAX_RETRY_ATTEMPTS,
  RETRY_BACKOFF_BASE: process.env.RETRY_BACKOFF_BASE,
  ENABLE_INTELLIGENT_CACHING: process.env.ENABLE_INTELLIGENT_CACHING,
  
  // Production Configuration
  DEPLOYMENT_ENVIRONMENT: process.env.DEPLOYMENT_ENVIRONMENT,
  HEALTH_CHECK_INTERVAL_MS: process.env.HEALTH_CHECK_INTERVAL_MS,
  ERROR_RATE_THRESHOLD: process.env.ERROR_RATE_THRESHOLD,
})

// Feature Flag Helper Functions
export const featureFlags = {
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
}

// Production Configuration Helper
export const productionConfig = {
  timeouts: {
    reportGeneration: env.REPORT_GENERATION_TIMEOUT_MS,
    healthCheck: env.HEALTH_CHECK_INTERVAL_MS,
  },
  
  limits: {
    maxConcurrentReports: env.MAX_CONCURRENT_REPORTS,
    errorRateThreshold: env.ERROR_RATE_THRESHOLD,
  },
  
  cache: {
    ttlSeconds: env.CACHE_TTL_SECONDS,
  },
  
  monitoring: {
    retentionHours: env.MONITORING_RETENTION_HOURS,
  }
}

// Immediate Reports Configuration - Phase 5.3.1
export const immediateReportsConfig = {
  timeouts: {
    snapshotCapture: env.SNAPSHOT_CAPTURE_TIMEOUT,
    analysis: env.ANALYSIS_TIMEOUT,
    totalGeneration: env.TOTAL_GENERATION_TIMEOUT,
  },
  
  rateLimiting: {
    maxConcurrentSnapshotsPerProject: env.MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT,
    maxConcurrentSnapshotsGlobal: env.MAX_CONCURRENT_SNAPSHOTS_GLOBAL,
    domainThrottleInterval: env.DOMAIN_THROTTLE_INTERVAL,
  },
  
  qualityThresholds: {
    minDataCompletenessScore: env.MIN_DATA_COMPLETENESS_SCORE,
    fallbackToPartialDataThreshold: env.FALLBACK_TO_PARTIAL_DATA_THRESHOLD,
  },
  
  featureFlags: {
    enableImmediateReports: env.ENABLE_COMPARATIVE_REPORTS === 'true',
    enableFreshSnapshotRequirement: env.ENABLE_FRESH_SNAPSHOT_REQUIREMENT === 'true',
    enableRealTimeUpdates: env.ENABLE_REAL_TIME_UPDATES === 'true',
    enableIntelligentCaching: env.ENABLE_INTELLIGENT_CACHING === 'true',
  },
  
  costControls: {
    dailySnapshotLimit: env.DAILY_SNAPSHOT_LIMIT,
    hourlySnapshotLimit: env.HOURLY_SNAPSHOT_LIMIT,
    costPerSnapshot: env.COST_PER_SNAPSHOT,
  },
  
  circuitBreaker: {
    errorThreshold: env.CIRCUIT_BREAKER_ERROR_THRESHOLD,
    timeWindow: env.CIRCUIT_BREAKER_TIME_WINDOW,
  },
  
  retry: {
    maxAttempts: env.MAX_RETRY_ATTEMPTS,
    backoffBase: env.RETRY_BACKOFF_BASE,
  },
  
  cache: {
    ttlSeconds: env.CACHE_TTL_SECONDS,
  }
} 