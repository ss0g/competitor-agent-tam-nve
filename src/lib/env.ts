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
  
  // Performance & Monitoring Configuration
  REPORT_GENERATION_TIMEOUT_MS: z.coerce.number().default(120000), // 2 minutes
  MAX_CONCURRENT_REPORTS: z.coerce.number().default(5),
  CACHE_TTL_SECONDS: z.coerce.number().default(3600), // 1 hour
  MONITORING_RETENTION_HOURS: z.coerce.number().default(24),
  
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
  
  // Performance & Monitoring
  REPORT_GENERATION_TIMEOUT_MS: process.env.REPORT_GENERATION_TIMEOUT_MS,
  MAX_CONCURRENT_REPORTS: process.env.MAX_CONCURRENT_REPORTS,
  CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS,
  MONITORING_RETENTION_HOURS: process.env.MONITORING_RETENTION_HOURS,
  
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