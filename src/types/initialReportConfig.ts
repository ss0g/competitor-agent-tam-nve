/**
 * Phase 5.3.1: Configuration Management Types
 * Types for immediate reports configuration system
 */

export interface InitialReportConfig {
  // Timeout Configurations
  SNAPSHOT_CAPTURE_TIMEOUT: number; // Default: 30000ms
  ANALYSIS_TIMEOUT: number; // Default: 45000ms
  TOTAL_GENERATION_TIMEOUT: number; // Default: 60000ms
  
  // Rate Limiting
  MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: number; // Default: 5
  MAX_CONCURRENT_SNAPSHOTS_GLOBAL: number; // Default: 20
  DOMAIN_THROTTLE_INTERVAL: number; // Default: 10000ms
  
  // Quality Thresholds
  MIN_DATA_COMPLETENESS_SCORE: number; // Default: 60
  FALLBACK_TO_PARTIAL_DATA_THRESHOLD: number; // Default: 30
  
  // Feature Flags
  ENABLE_IMMEDIATE_REPORTS: boolean; // Default: true
  ENABLE_FRESH_SNAPSHOT_REQUIREMENT: boolean; // Default: true
  ENABLE_REAL_TIME_UPDATES: boolean; // Default: true
  
  // Cost Controls
  DAILY_SNAPSHOT_LIMIT: number; // Default: 1000
  HOURLY_SNAPSHOT_LIMIT: number; // Default: 100
  COST_PER_SNAPSHOT: number; // Default: 0.05

  // Circuit Breaker Settings
  CIRCUIT_BREAKER_ERROR_THRESHOLD: number; // Default: 0.5 (50%)
  CIRCUIT_BREAKER_TIME_WINDOW: number; // Default: 300000ms (5 minutes)
  
  // Retry Configuration
  MAX_RETRY_ATTEMPTS: number; // Default: 3
  RETRY_BACKOFF_BASE: number; // Default: 1000ms
  
  // Cache Configuration
  CACHE_TTL_SECONDS: number; // Default: 3600 (1 hour)
  ENABLE_INTELLIGENT_CACHING: boolean; // Default: true
}

export interface ConfigUpdateRequest {
  config: Partial<InitialReportConfig>;
  reason?: string;
  updatedBy?: string;
}

export interface ConfigUpdateResult {
  success: boolean;
  updatedFields: string[];
  validationErrors?: string[];
  rollbackInfo?: {
    previousValues: Partial<InitialReportConfig>;
    rollbackToken: string;
    timestamp: string;
  };
  appliedAt: string;
  updatedBy?: string;
}

export interface ConfigValidationError {
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConfigAuditEntry {
  id: string;
  timestamp: string;
  updatedBy: string;
  action: 'update' | 'rollback' | 'reload';
  changes: Record<string, { from: any; to: any }>;
  reason?: string;
  rollbackToken?: string;
}

export interface ConfigDependencyValidation {
  field: string;
  dependsOn: string[];
  validator: (config: InitialReportConfig) => boolean;
  errorMessage: string;
}

export interface ConfigPerformanceImpact {
  estimatedImpact: 'low' | 'medium' | 'high';
  affectedSystems: string[];
  recommendedTesting: string[];
  rolloutStrategy?: 'immediate' | 'gradual' | 'maintenance_window';
}

// Default configuration values
export const DEFAULT_INITIAL_REPORT_CONFIG: InitialReportConfig = {
  // Timeout Configurations
  SNAPSHOT_CAPTURE_TIMEOUT: 30000, // 30 seconds
  ANALYSIS_TIMEOUT: 45000, // 45 seconds
  TOTAL_GENERATION_TIMEOUT: 60000, // 60 seconds
  
  // Rate Limiting
  MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: 5,
  MAX_CONCURRENT_SNAPSHOTS_GLOBAL: 20,
  DOMAIN_THROTTLE_INTERVAL: 10000, // 10 seconds
  
  // Quality Thresholds
  MIN_DATA_COMPLETENESS_SCORE: 60,
  FALLBACK_TO_PARTIAL_DATA_THRESHOLD: 30,
  
  // Feature Flags
  ENABLE_IMMEDIATE_REPORTS: true,
  ENABLE_FRESH_SNAPSHOT_REQUIREMENT: true,
  ENABLE_REAL_TIME_UPDATES: true,
  
  // Cost Controls
  DAILY_SNAPSHOT_LIMIT: 1000,
  HOURLY_SNAPSHOT_LIMIT: 100,
  COST_PER_SNAPSHOT: 0.05,

  // Circuit Breaker Settings
  CIRCUIT_BREAKER_ERROR_THRESHOLD: 0.5, // 50%
  CIRCUIT_BREAKER_TIME_WINDOW: 300000, // 5 minutes
  
  // Retry Configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_BASE: 1000, // 1 second
  
  // Cache Configuration
  CACHE_TTL_SECONDS: 3600, // 1 hour
  ENABLE_INTELLIGENT_CACHING: true
};

// Configuration validation rules
export const CONFIG_VALIDATION_RULES: ConfigDependencyValidation[] = [
  {
    field: 'TOTAL_GENERATION_TIMEOUT',
    dependsOn: ['SNAPSHOT_CAPTURE_TIMEOUT', 'ANALYSIS_TIMEOUT'],
    validator: (config) => config.TOTAL_GENERATION_TIMEOUT >= Math.max(config.SNAPSHOT_CAPTURE_TIMEOUT, config.ANALYSIS_TIMEOUT),
    errorMessage: 'Total generation timeout must be at least as long as the longest individual timeout'
  },
  {
    field: 'FALLBACK_TO_PARTIAL_DATA_THRESHOLD',
    dependsOn: ['MIN_DATA_COMPLETENESS_SCORE'],
    validator: (config) => config.FALLBACK_TO_PARTIAL_DATA_THRESHOLD < config.MIN_DATA_COMPLETENESS_SCORE,
    errorMessage: 'Fallback threshold must be lower than minimum data completeness score'
  },
  {
    field: 'HOURLY_SNAPSHOT_LIMIT',
    dependsOn: ['DAILY_SNAPSHOT_LIMIT'],
    validator: (config) => config.HOURLY_SNAPSHOT_LIMIT * 24 <= config.DAILY_SNAPSHOT_LIMIT * 1.2, // Allow 20% buffer
    errorMessage: 'Hourly limit should not exceed daily limit when extrapolated'
  },
  {
    field: 'MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT',
    dependsOn: ['MAX_CONCURRENT_SNAPSHOTS_GLOBAL'],
    validator: (config) => config.MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT <= config.MAX_CONCURRENT_SNAPSHOTS_GLOBAL,
    errorMessage: 'Per-project concurrent snapshots cannot exceed global limit'
  }
]; 