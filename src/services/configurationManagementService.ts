/**
 * Phase 5.3.1: Configuration Management Service
 * Handles loading, validation, updating, and rollback of immediate reports configuration
 */

import { logger } from '@/lib/logger';
import { createId } from '@paralleldrive/cuid2';
import { z } from 'zod';
import {
  InitialReportConfig,
  ConfigUpdateRequest,
  ConfigUpdateResult,
  ConfigValidationError,
  ConfigAuditEntry,
  ConfigDependencyValidation,
  ConfigPerformanceImpact,
  DEFAULT_INITIAL_REPORT_CONFIG,
  CONFIG_VALIDATION_RULES
} from '@/types/initialReportConfig';
import { immediateReportsConfig } from '@/lib/env';

// Configuration validation schema
const configSchema = z.object({
  SNAPSHOT_CAPTURE_TIMEOUT: z.number().min(5000).max(120000), // 5 seconds to 2 minutes
  ANALYSIS_TIMEOUT: z.number().min(10000).max(300000), // 10 seconds to 5 minutes
  TOTAL_GENERATION_TIMEOUT: z.number().min(15000).max(600000), // 15 seconds to 10 minutes
  MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: z.number().min(1).max(10),
  MAX_CONCURRENT_SNAPSHOTS_GLOBAL: z.number().min(5).max(100),
  DOMAIN_THROTTLE_INTERVAL: z.number().min(1000).max(60000), // 1 second to 1 minute
  MIN_DATA_COMPLETENESS_SCORE: z.number().min(0).max(100),
  FALLBACK_TO_PARTIAL_DATA_THRESHOLD: z.number().min(0).max(100),
  ENABLE_IMMEDIATE_REPORTS: z.boolean(),
  ENABLE_FRESH_SNAPSHOT_REQUIREMENT: z.boolean(),
  ENABLE_REAL_TIME_UPDATES: z.boolean(),
  DAILY_SNAPSHOT_LIMIT: z.number().min(100).max(10000),
  HOURLY_SNAPSHOT_LIMIT: z.number().min(10).max(1000),
  COST_PER_SNAPSHOT: z.number().min(0).max(1),
  CIRCUIT_BREAKER_ERROR_THRESHOLD: z.number().min(0.1).max(0.9),
  CIRCUIT_BREAKER_TIME_WINDOW: z.number().min(60000).max(3600000), // 1 minute to 1 hour
  MAX_RETRY_ATTEMPTS: z.number().min(1).max(10),
  RETRY_BACKOFF_BASE: z.number().min(100).max(10000), // 100ms to 10 seconds
  CACHE_TTL_SECONDS: z.number().min(300).max(86400), // 5 minutes to 24 hours
  ENABLE_INTELLIGENT_CACHING: z.boolean()
});

export class ConfigurationManagementService {
  private static instance: ConfigurationManagementService;
  private currentConfig: InitialReportConfig;
  private auditLog: ConfigAuditEntry[] = [];
  private rollbackTokens: Map<string, { config: InitialReportConfig; timestamp: string }> = new Map();

  private constructor() {
    this.currentConfig = this.loadFromEnvironment();
    logger.info('Configuration Management Service initialized', {
      configSource: 'environment',
      currentConfig: this.maskSensitiveValues(this.currentConfig)
    });
  }

  public static getInstance(): ConfigurationManagementService {
    if (!ConfigurationManagementService.instance) {
      ConfigurationManagementService.instance = new ConfigurationManagementService();
    }
    return ConfigurationManagementService.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnvironment(): InitialReportConfig {
    return {
      SNAPSHOT_CAPTURE_TIMEOUT: immediateReportsConfig.timeouts.snapshotCapture,
      ANALYSIS_TIMEOUT: immediateReportsConfig.timeouts.analysis,
      TOTAL_GENERATION_TIMEOUT: immediateReportsConfig.timeouts.totalGeneration,
      MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT: immediateReportsConfig.rateLimiting.maxConcurrentSnapshotsPerProject,
      MAX_CONCURRENT_SNAPSHOTS_GLOBAL: immediateReportsConfig.rateLimiting.maxConcurrentSnapshotsGlobal,
      DOMAIN_THROTTLE_INTERVAL: immediateReportsConfig.rateLimiting.domainThrottleInterval,
      MIN_DATA_COMPLETENESS_SCORE: immediateReportsConfig.qualityThresholds.minDataCompletenessScore,
      FALLBACK_TO_PARTIAL_DATA_THRESHOLD: immediateReportsConfig.qualityThresholds.fallbackToPartialDataThreshold,
      ENABLE_IMMEDIATE_REPORTS: immediateReportsConfig.featureFlags.enableImmediateReports,
      ENABLE_FRESH_SNAPSHOT_REQUIREMENT: immediateReportsConfig.featureFlags.enableFreshSnapshotRequirement,
      ENABLE_REAL_TIME_UPDATES: immediateReportsConfig.featureFlags.enableRealTimeUpdates,
      DAILY_SNAPSHOT_LIMIT: immediateReportsConfig.costControls.dailySnapshotLimit,
      HOURLY_SNAPSHOT_LIMIT: immediateReportsConfig.costControls.hourlySnapshotLimit,
      COST_PER_SNAPSHOT: immediateReportsConfig.costControls.costPerSnapshot,
      CIRCUIT_BREAKER_ERROR_THRESHOLD: immediateReportsConfig.circuitBreaker.errorThreshold,
      CIRCUIT_BREAKER_TIME_WINDOW: immediateReportsConfig.circuitBreaker.timeWindow,
      MAX_RETRY_ATTEMPTS: immediateReportsConfig.retry.maxAttempts,
      RETRY_BACKOFF_BASE: immediateReportsConfig.retry.backoffBase,
      CACHE_TTL_SECONDS: immediateReportsConfig.cache.ttlSeconds,
      ENABLE_INTELLIGENT_CACHING: immediateReportsConfig.featureFlags.enableIntelligentCaching
    };
  }

  /**
   * Get current configuration
   */
  public getCurrentConfig(): InitialReportConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration with validation and rollback support
   */
  public async updateConfiguration(request: ConfigUpdateRequest): Promise<ConfigUpdateResult> {
    const { config: updates, reason, updatedBy } = request;
    const timestamp = new Date().toISOString();
    const rollbackToken = createId();

    try {
      logger.info('Starting configuration update', {
        updatedBy,
        reason,
        updateFields: Object.keys(updates),
        rollbackToken
      });

      // Store current config for rollback
      this.rollbackTokens.set(rollbackToken, {
        config: { ...this.currentConfig },
        timestamp
      });

      // Create merged configuration for validation
      const mergedConfig = { ...this.currentConfig, ...updates };

      // Validate individual fields
      const validationErrors = this.validateConfiguration(mergedConfig);
      if (validationErrors.length > 0) {
        const errors = validationErrors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
          logger.warn('Configuration validation failed', {
            errors: errors.map(e => ({ field: e.field, message: e.message })),
            rollbackToken
          });

          return {
            success: false,
            updatedFields: [],
            validationErrors: errors.map(e => e.message),
            appliedAt: timestamp,
            updatedBy
          };
        }
      }

      // Validate dependencies
      const dependencyErrors = this.validateDependencies(mergedConfig);
      if (dependencyErrors.length > 0) {
        logger.warn('Configuration dependency validation failed', {
          errors: dependencyErrors,
          rollbackToken
        });

        return {
          success: false,
          updatedFields: [],
          validationErrors: dependencyErrors,
          appliedAt: timestamp,
          updatedBy
        };
      }

      // Apply configuration changes
      const previousValues: Partial<InitialReportConfig> = {};
      const updatedFields: string[] = [];

      for (const [key, value] of Object.entries(updates)) {
        if (key in this.currentConfig) {
          previousValues[key as keyof InitialReportConfig] = this.currentConfig[key as keyof InitialReportConfig];
          (this.currentConfig as any)[key] = value;
          updatedFields.push(key);
        }
      }

      // Log audit entry
      const auditEntry: ConfigAuditEntry = {
        id: createId(),
        timestamp,
        updatedBy: updatedBy || 'system',
        action: 'update',
        changes: Object.fromEntries(
          updatedFields.map(field => [
            field,
            {
              from: previousValues[field as keyof InitialReportConfig],
              to: updates[field as keyof InitialReportConfig]
            }
          ])
        ),
        reason,
        rollbackToken
      };

      this.auditLog.push(auditEntry);

      // Clean up old rollback tokens (keep last 10)
      this.cleanupRollbackTokens();

      logger.info('Configuration updated successfully', {
        updatedFields,
        rollbackToken,
        updatedBy,
        configSnapshot: this.maskSensitiveValues(this.currentConfig)
      });

      return {
        success: true,
        updatedFields,
        rollbackInfo: {
          previousValues,
          rollbackToken,
          timestamp
        },
        appliedAt: timestamp,
        updatedBy
      };

    } catch (error) {
      logger.error('Configuration update failed', error as Error, {
        updatedBy,
        updateFields: Object.keys(updates),
        rollbackToken
      });

      // Remove rollback token on failure
      this.rollbackTokens.delete(rollbackToken);

      return {
        success: false,
        updatedFields: [],
        validationErrors: [`Internal error: ${(error as Error).message}`],
        appliedAt: timestamp,
        updatedBy
      };
    }
  }

  /**
   * Rollback configuration to a previous state
   */
  public async rollbackConfiguration(rollbackToken: string, updatedBy?: string): Promise<ConfigUpdateResult> {
    const timestamp = new Date().toISOString();

    try {
      const rollbackInfo = this.rollbackTokens.get(rollbackToken);
      if (!rollbackInfo) {
        throw new Error(`Invalid or expired rollback token: ${rollbackToken}`);
      }

      logger.info('Starting configuration rollback', {
        rollbackToken,
        updatedBy,
        rollbackToTimestamp: rollbackInfo.timestamp
      });

      const previousConfig = { ...this.currentConfig };
      this.currentConfig = { ...rollbackInfo.config };

      // Log audit entry
      const auditEntry: ConfigAuditEntry = {
        id: createId(),
        timestamp,
        updatedBy: updatedBy || 'system',
        action: 'rollback',
        changes: Object.fromEntries(
          Object.keys(this.currentConfig).map(field => [
            field,
            {
              from: (previousConfig as any)[field],
              to: (this.currentConfig as any)[field]
            }
          ])
        ),
        rollbackToken
      };

      this.auditLog.push(auditEntry);

      // Remove used rollback token
      this.rollbackTokens.delete(rollbackToken);

      logger.info('Configuration rollback completed successfully', {
        rollbackToken,
        updatedBy,
        configSnapshot: this.maskSensitiveValues(this.currentConfig)
      });

      return {
        success: true,
        updatedFields: Object.keys(this.currentConfig),
        appliedAt: timestamp,
        updatedBy
      };

    } catch (error) {
      logger.error('Configuration rollback failed', error as Error, {
        rollbackToken,
        updatedBy
      });

      return {
        success: false,
        updatedFields: [],
        validationErrors: [`Rollback failed: ${(error as Error).message}`],
        appliedAt: timestamp,
        updatedBy
      };
    }
  }

  /**
   * Reload configuration from environment
   */
  public async reloadFromEnvironment(updatedBy?: string): Promise<ConfigUpdateResult> {
    const timestamp = new Date().toISOString();

    try {
      logger.info('Reloading configuration from environment', { updatedBy });

      const previousConfig = { ...this.currentConfig };
      const newConfig = this.loadFromEnvironment();

      // Validate new configuration
      const validationErrors = this.validateConfiguration(newConfig);
      const errors = validationErrors.filter(e => e.severity === 'error');
      if (errors.length > 0) {
        logger.warn('Environment configuration validation failed', {
          errors: errors.map(e => ({ field: e.field, message: e.message }))
        });

        return {
          success: false,
          updatedFields: [],
          validationErrors: errors.map(e => e.message),
          appliedAt: timestamp,
          updatedBy
        };
      }

      this.currentConfig = newConfig;

      // Log audit entry
      const auditEntry: ConfigAuditEntry = {
        id: createId(),
        timestamp,
        updatedBy: updatedBy || 'system',
        action: 'reload',
        changes: Object.fromEntries(
          Object.keys(this.currentConfig).map(field => [
            field,
            {
              from: (previousConfig as any)[field],
              to: (this.currentConfig as any)[field]
            }
          ])
        )
      };

      this.auditLog.push(auditEntry);

      logger.info('Configuration reloaded from environment successfully', {
        updatedBy,
        configSnapshot: this.maskSensitiveValues(this.currentConfig)
      });

      return {
        success: true,
        updatedFields: Object.keys(this.currentConfig),
        appliedAt: timestamp,
        updatedBy
      };

    } catch (error) {
      logger.error('Configuration reload failed', error as Error, { updatedBy });

      return {
        success: false,
        updatedFields: [],
        validationErrors: [`Reload failed: ${(error as Error).message}`],
        appliedAt: timestamp,
        updatedBy
      };
    }
  }

  /**
   * Validate configuration fields
   */
  private validateConfiguration(config: InitialReportConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    try {
      configSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        for (const issue of error.issues) {
          errors.push({
            field: issue.path.join('.'),
            value: issue.received,
            message: issue.message,
            severity: 'error'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate configuration dependencies
   */
  private validateDependencies(config: InitialReportConfig): string[] {
    const errors: string[] = [];

    for (const rule of CONFIG_VALIDATION_RULES) {
      if (!rule.validator(config)) {
        errors.push(`${rule.field}: ${rule.errorMessage}`);
      }
    }

    return errors;
  }

  /**
   * Assess performance impact of configuration changes
   */
  public assessPerformanceImpact(updates: Partial<InitialReportConfig>): ConfigPerformanceImpact {
    const highImpactFields = [
      'MAX_CONCURRENT_SNAPSHOTS_GLOBAL',
      'TOTAL_GENERATION_TIMEOUT',
      'ENABLE_IMMEDIATE_REPORTS'
    ];

    const mediumImpactFields = [
      'SNAPSHOT_CAPTURE_TIMEOUT',
      'ANALYSIS_TIMEOUT',
      'MAX_CONCURRENT_SNAPSHOTS_PER_PROJECT',
      'DAILY_SNAPSHOT_LIMIT'
    ];

    const changedFields = Object.keys(updates);
    const hasHighImpact = changedFields.some(field => highImpactFields.includes(field));
    const hasMediumImpact = changedFields.some(field => mediumImpactFields.includes(field));

    let impact: 'low' | 'medium' | 'high' = 'low';
    if (hasHighImpact) impact = 'high';
    else if (hasMediumImpact) impact = 'medium';

    const affectedSystems: string[] = [];
    if (changedFields.includes('ENABLE_IMMEDIATE_REPORTS')) {
      affectedSystems.push('project_creation', 'report_generation', 'user_experience');
    }
    if (changedFields.some(f => f.includes('SNAPSHOT'))) {
      affectedSystems.push('competitor_snapshots', 'web_scraping', 'storage');
    }
    if (changedFields.some(f => f.includes('TIMEOUT'))) {
      affectedSystems.push('report_generation', 'user_experience', 'resource_usage');
    }

    const recommendedTesting = [
      'unit_tests',
      'integration_tests',
      impact === 'high' ? 'load_testing' : null,
      impact !== 'low' ? 'performance_testing' : null
    ].filter(Boolean) as string[];

    return {
      estimatedImpact: impact,
      affectedSystems,
      recommendedTesting,
      rolloutStrategy: impact === 'high' ? 'maintenance_window' : impact === 'medium' ? 'gradual' : 'immediate'
    };
  }

  /**
   * Get audit log
   */
  public getAuditLog(limit = 50): ConfigAuditEntry[] {
    return this.auditLog
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get available rollback tokens
   */
  public getAvailableRollbackTokens(): Array<{ token: string; timestamp: string; age: string }> {
    const now = new Date().getTime();
    return Array.from(this.rollbackTokens.entries()).map(([token, info]) => ({
      token,
      timestamp: info.timestamp,
      age: this.formatTimeDifference(now - new Date(info.timestamp).getTime())
    }));
  }

  /**
   * Clean up old rollback tokens
   */
  private cleanupRollbackTokens(): void {
    const tokens = Array.from(this.rollbackTokens.entries())
      .sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Keep only last 10 tokens
    const tokensToRemove = tokens.slice(10);
    for (const [token] of tokensToRemove) {
      this.rollbackTokens.delete(token);
    }
  }

  /**
   * Mask sensitive configuration values for logging
   */
  private maskSensitiveValues(config: InitialReportConfig): Record<string, any> {
    return {
      ...config,
      COST_PER_SNAPSHOT: '***'
    };
  }

  /**
   * Format time difference for human readability
   */
  private formatTimeDifference(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }
} 