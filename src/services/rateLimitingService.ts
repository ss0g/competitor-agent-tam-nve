/**
 * Phase 4.4: Comprehensive Rate Limiting Service
 * 
 * This service provides centralized rate limiting, cost controls, and resource management
 * for competitor snapshot capture operations. It implements multiple layers of protection:
 * 
 * 1. Concurrent Request Limiting (per-project and global)
 * 2. Per-Domain Throttling (respectful crawling)
 * 3. Daily/Hourly Usage Limits (cost control)
 * 4. Circuit Breaker (failure protection)
 * 5. Cost Monitoring (resource tracking)
 * 6. Graceful Degradation (fallback strategies)
 */

import pLimit from 'p-limit';
import { logger } from '@/lib/logger';
import { errorHandler } from '@/lib/utils/errorHandler';

// Rate Limiting Configuration
export interface RateLimitingConfig {
  // Concurrency Limits
  maxConcurrentPerProject: number;        // 5 concurrent snapshots per project
  maxGlobalConcurrent: number;           // 20 concurrent snapshots across all projects
  
  // Throttling Limits
  perDomainThrottleMs: number;           // 10 seconds between requests to same domain
  perProjectThrottleMs: number;          // 5 seconds between project snapshot requests
  
  // Daily/Hourly Limits
  dailySnapshotLimit: number;            // 1000 snapshots per day
  hourlySnapshotLimit: number;           // 100 snapshots per hour
  
  // Circuit Breaker Settings
  circuitBreakerErrorThreshold: number;  // 50% error rate threshold
  circuitBreakerWindowMs: number;        // 5 minutes error rate calculation window
  circuitBreakerRecoveryMs: number;      // 10 minutes recovery period
  circuitBreakerHalfOpenRequests: number; // 5 test requests in half-open state
  
  // Cost Control Settings
  maxDailyCostUsd: number;               // $50 daily cost limit
  maxHourlyCostUsd: number;              // $10 hourly cost limit
  costPerSnapshotUsd: number;            // $0.05 estimated cost per snapshot
  
  // Resource Monitoring
  maxMemoryUsageMb: number;              // 2GB memory limit
  maxCpuUsagePercent: number;            // 80% CPU usage limit
  resourceCheckIntervalMs: number;       // 30 seconds resource check interval
  
  // Recovery and Backoff
  exponentialBackoffBaseMs: number;      // 1 second base backoff
  exponentialBackoffMaxMs: number;       // 5 minutes maximum backoff
  recoveryGradualRampupPercent: number;  // 25% gradual rampup after recovery
}

// Circuit Breaker States
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerInfo {
  state: CircuitBreakerState;
  errorCount: number;
  successCount: number;
  totalRequests: number;
  errorRate: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextRetryTime?: Date;
  halfOpenTestRequests: number;
}

// Rate Limiting Metrics
export interface RateLimitingMetrics {
  // Request Counts
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  throttledRequests: number;
  circuitBreakerRejects: number;
  costLimitRejects: number;
  
  // Current State
  currentConcurrentRequests: number;
  activeDomainThrottles: number;
  activeProjectThrottles: number;
  
  // Performance
  averageRequestTime: number;
  p95RequestTime: number;
  p99RequestTime: number;
  
  // Cost and Resource Usage
  dailyCostUsd: number;
  hourlyCostUsd: number;
  currentMemoryUsageMb: number;
  currentCpuUsagePercent: number;
  
  // Time-based Metrics
  dailyRequestCount: number;
  hourlyRequestCount: number;
  requestsInLast5Minutes: number;
  
  // Health Indicators
  healthScore: number; // 0-100 overall system health
  rateLimitingEffectiveness: number; // 0-100 effectiveness score
  recommendedActions: string[];
}

// Request Context for Rate Limiting
export interface RateLimitContext {
  projectId: string;
  competitorId?: string;
  domain: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  source: 'initial_report' | 'scheduled_report' | 'manual_request' | 'test';
  estimatedCostUsd?: number;
  requestId: string;
}

// Rate Limiting Decision
export interface RateLimitDecision {
  allowed: boolean;
  reason?: string;
  waitTimeMs?: number;
  fallbackSuggested?: string;
  quotaRemaining?: {
    daily: number;
    hourly: number;
    concurrent: number;
  };
  costProjection?: {
    currentHourly: number;
    currentDaily: number;
    projectedDaily: number;
  };
}

// Domain Throttle Info
interface DomainThrottleInfo {
  domain: string;
  lastRequestTime: Date;
  requestCount: number;
  isThrottled: boolean;
  nextAllowedTime: Date;
}

// Project Throttle Info
interface ProjectThrottleInfo {
  projectId: string;
  lastRequestTime: Date;
  requestCount: number;
  isThrottled: boolean;
  nextAllowedTime: Date;
}

// Usage Statistics
interface UsageStatistics {
  dailyStats: {
    date: string;
    requests: number;
    successes: number;
    failures: number;
    costUsd: number;
  };
  hourlyStats: {
    hour: string;
    requests: number;
    successes: number;
    failures: number;
    costUsd: number;
  };
}

export class RateLimitingService {
  private static instance: RateLimitingService;
  private config: RateLimitingConfig;
  private globalConcurrencyLimiter: ReturnType<typeof pLimit>;
  private projectConcurrencyLimiters: Map<string, ReturnType<typeof pLimit>>;
  
  // Circuit Breaker State
  private circuitBreakerInfo: CircuitBreakerInfo;
  private errorWindow: { timestamp: Date; success: boolean }[];
  
  // Throttling State
  private domainThrottles: Map<string, DomainThrottleInfo>;
  private projectThrottles: Map<string, ProjectThrottleInfo>;
  
  // Metrics and Monitoring
  private metrics: RateLimitingMetrics;
  private usageStats: UsageStatistics;
  private requestTimes: number[];
  
  // Background Tasks
  private backgroundTaskIntervals: NodeJS.Timeout[];
  
  constructor(config?: Partial<RateLimitingConfig>) {
    this.config = {
      // Concurrency Limits
      maxConcurrentPerProject: 5,
      maxGlobalConcurrent: 20,
      
      // Throttling Limits
      perDomainThrottleMs: 10000, // 10 seconds
      perProjectThrottleMs: 5000,  // 5 seconds
      
      // Daily/Hourly Limits
      dailySnapshotLimit: 1000,
      hourlySnapshotLimit: 100,
      
      // Circuit Breaker Settings
      circuitBreakerErrorThreshold: 0.5, // 50%
      circuitBreakerWindowMs: 5 * 60 * 1000, // 5 minutes
      circuitBreakerRecoveryMs: 10 * 60 * 1000, // 10 minutes
      circuitBreakerHalfOpenRequests: 5,
      
      // Cost Control Settings
      maxDailyCostUsd: 50,
      maxHourlyCostUsd: 10,
      costPerSnapshotUsd: 0.05,
      
      // Resource Monitoring
      maxMemoryUsageMb: 2048, // 2GB
      maxCpuUsagePercent: 80,
      resourceCheckIntervalMs: 30000, // 30 seconds
      
      // Recovery and Backoff
      exponentialBackoffBaseMs: 1000, // 1 second
      exponentialBackoffMaxMs: 5 * 60 * 1000, // 5 minutes
      recoveryGradualRampupPercent: 25,
      
      ...config
    };

    // Initialize concurrency limiters
    this.globalConcurrencyLimiter = pLimit(this.config.maxGlobalConcurrent);
    this.projectConcurrencyLimiters = new Map();
    
    // Initialize circuit breaker
    this.circuitBreakerInfo = {
      state: 'closed',
      errorCount: 0,
      successCount: 0,
      totalRequests: 0,
      errorRate: 0,
      halfOpenTestRequests: 0
    };
    this.errorWindow = [];
    
    // Initialize throttling
    this.domainThrottles = new Map();
    this.projectThrottles = new Map();
    
    // Initialize metrics
    this.metrics = this.initializeMetrics();
    this.usageStats = this.initializeUsageStats();
    this.requestTimes = [];
    
    // Initialize background tasks
    this.backgroundTaskIntervals = [];
    this.startBackgroundTasks();
    
    logger.info('Rate limiting service initialized', {
      config: this.config,
      circuitBreakerState: this.circuitBreakerInfo.state
    });
  }

  static getInstance(config?: Partial<RateLimitingConfig>): RateLimitingService {
    if (!RateLimitingService.instance) {
      RateLimitingService.instance = new RateLimitingService(config);
    }
    return RateLimitingService.instance;
  }

  /**
   * Check if a request should be allowed through rate limiting
   */
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitDecision> {
    const startTime = Date.now();
    
    try {
      logger.info('Checking rate limits', {
        projectId: context.projectId,
        domain: context.domain,
        priority: context.priority,
        source: context.source,
        requestId: context.requestId
      });

      // 1. Check circuit breaker first
      const circuitBreakerDecision = this.checkCircuitBreaker(context);
      if (!circuitBreakerDecision.allowed) {
        this.recordMetric('circuitBreakerRejects');
        return circuitBreakerDecision;
      }

      // 2. Check cost limits
      const costDecision = this.checkCostLimits(context);
      if (!costDecision.allowed) {
        this.recordMetric('costLimitRejects');
        return costDecision;
      }

      // 3. Check daily/hourly limits
      const usageLimitDecision = this.checkUsageLimits(context);
      if (!usageLimitDecision.allowed) {
        this.recordMetric('throttledRequests');
        return usageLimitDecision;
      }

      // 4. Check domain throttling
      const domainThrottleDecision = this.checkDomainThrottle(context);
      if (!domainThrottleDecision.allowed) {
        this.recordMetric('throttledRequests');
        return domainThrottleDecision;
      }

      // 5. Check project throttling
      const projectThrottleDecision = this.checkProjectThrottle(context);
      if (!projectThrottleDecision.allowed) {
        this.recordMetric('throttledRequests');
        return projectThrottleDecision;
      }

      // 6. Check concurrency limits
      const concurrencyDecision = this.checkConcurrencyLimits(context);
      if (!concurrencyDecision.allowed) {
        this.recordMetric('throttledRequests');
        return concurrencyDecision;
      }

      // All checks passed
      this.recordMetric('totalRequests');
      
      return {
        allowed: true,
        quotaRemaining: {
          daily: this.config.dailySnapshotLimit - this.metrics.dailyRequestCount,
          hourly: this.config.hourlySnapshotLimit - this.metrics.hourlyRequestCount,
          concurrent: this.config.maxGlobalConcurrent - this.metrics.currentConcurrentRequests
        },
        costProjection: {
          currentHourly: this.metrics.hourlyCostUsd,
          currentDaily: this.metrics.dailyCostUsd,
          projectedDaily: this.projectDailyCost()
        }
      };

    } catch (error) {
      logger.error('Rate limit check failed', error as Error, {
        projectId: context.projectId,
        requestId: context.requestId
      });
      
      // Fail safe - allow request but log error
      return { allowed: true, reason: 'Rate limiting service error - allowing by default' };
    } finally {
      const duration = Date.now() - startTime;
      this.requestTimes.push(duration);
      if (this.requestTimes.length > 1000) {
        this.requestTimes = this.requestTimes.slice(-500); // Keep last 500 measurements
      }
    }
  }

  /**
   * Acquire concurrency slots and execute request with rate limiting
   */
  async executeWithRateLimit<T>(
    context: RateLimitContext,
    requestFunction: () => Promise<T>
  ): Promise<T> {
    // Check rate limits first
    const rateLimitDecision = await this.checkRateLimit(context);
    if (!rateLimitDecision.allowed) {
      throw new Error(`Rate limit exceeded: ${rateLimitDecision.reason}. ${
        rateLimitDecision.waitTimeMs ? `Retry in ${rateLimitDecision.waitTimeMs}ms` : ''
      }`);
    }

    // Get project-specific limiter
    const projectLimiter = this.getProjectConcurrencyLimiter(context.projectId);

    // Execute with global and project concurrency limiting
    return this.globalConcurrencyLimiter(async () => {
      return projectLimiter(async () => {
        const startTime = Date.now();
        this.recordConcurrentRequestStart(context);
        
        try {
          // Update throttling state
          this.updateDomainThrottle(context.domain);
          this.updateProjectThrottle(context.projectId);
          
          // Execute the request
          const result = await requestFunction();
          
          // Record success
          this.recordRequestSuccess(context, Date.now() - startTime);
          
          return result;
          
        } catch (error) {
          // Record failure
          this.recordRequestFailure(context, Date.now() - startTime, error as Error);
          throw error;
          
        } finally {
          this.recordConcurrentRequestEnd(context);
        }
      });
    });
  }

  /**
   * Get current rate limiting metrics
   */
  getRateLimitingMetrics(): RateLimitingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get circuit breaker information
   */
  getCircuitBreakerInfo(): CircuitBreakerInfo {
    return { ...this.circuitBreakerInfo };
  }

  /**
   * Update rate limiting configuration
   */
  updateConfiguration(newConfig: Partial<RateLimitingConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Update global concurrency limiter if needed
    if (newConfig.maxGlobalConcurrent && newConfig.maxGlobalConcurrent !== oldConfig.maxGlobalConcurrent) {
      this.globalConcurrencyLimiter = pLimit(newConfig.maxGlobalConcurrent);
    }
    
    // Clear project limiters if project concurrency changed
    if (newConfig.maxConcurrentPerProject && newConfig.maxConcurrentPerProject !== oldConfig.maxConcurrentPerProject) {
      this.projectConcurrencyLimiters.clear();
    }
    
    logger.info('Rate limiting configuration updated', {
      oldConfig,
      newConfig: this.config
    });
  }

  /**
   * Manually trigger circuit breaker (for emergency situations)
   */
  triggerCircuitBreaker(reason: string): void {
    this.circuitBreakerInfo = {
      ...this.circuitBreakerInfo,
      state: 'open',
      lastFailureTime: new Date(),
      nextRetryTime: new Date(Date.now() + this.config.circuitBreakerRecoveryMs)
    };
    
    logger.warn('Circuit breaker manually triggered', { reason });
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerInfo = {
      state: 'closed',
      errorCount: 0,
      successCount: 0,
      totalRequests: 0,
      errorRate: 0,
      halfOpenTestRequests: 0,
      lastSuccessTime: new Date()
    };
    this.errorWindow = [];
    
    logger.info('Circuit breaker manually reset');
  }

  /**
   * Get usage statistics
   */
  getUsageStatistics(): UsageStatistics {
    return { ...this.usageStats };
  }

  /**
   * Clear all throttling state (for testing or emergency reset)
   */
  clearThrottlingState(): void {
    this.domainThrottles.clear();
    this.projectThrottles.clear();
    
    logger.info('All throttling state cleared');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clear background tasks
    this.backgroundTaskIntervals.forEach(interval => clearInterval(interval));
    this.backgroundTaskIntervals = [];
    
    logger.info('Rate limiting service cleaned up');
  }

  // Private Methods

  private checkCircuitBreaker(context: RateLimitContext): RateLimitDecision {
    if (this.circuitBreakerInfo.state === 'open') {
      if (this.circuitBreakerInfo.nextRetryTime && Date.now() < this.circuitBreakerInfo.nextRetryTime.getTime()) {
        return {
          allowed: false,
          reason: 'Circuit breaker is open',
          waitTimeMs: this.circuitBreakerInfo.nextRetryTime.getTime() - Date.now(),
          fallbackSuggested: 'Use cached competitor data or schedule for later'
        };
      } else {
        // Move to half-open state
        this.circuitBreakerInfo.state = 'half-open';
        this.circuitBreakerInfo.halfOpenTestRequests = 0;
      }
    }

    if (this.circuitBreakerInfo.state === 'half-open') {
      if (this.circuitBreakerInfo.halfOpenTestRequests >= this.config.circuitBreakerHalfOpenRequests) {
        return {
          allowed: false,
          reason: 'Circuit breaker is testing recovery (half-open)',
          waitTimeMs: 60000, // Wait 1 minute before trying again
          fallbackSuggested: 'Use cached competitor data'
        };
      }
    }

    return { allowed: true };
  }

  private checkCostLimits(context: RateLimitContext): RateLimitDecision {
    const estimatedCost = context.estimatedCostUsd || this.config.costPerSnapshotUsd;
    const projectedHourlyCost = this.metrics.hourlyCostUsd + estimatedCost;
    const projectedDailyCost = this.metrics.dailyCostUsd + estimatedCost;

    if (projectedHourlyCost > this.config.maxHourlyCostUsd) {
      return {
        allowed: false,
        reason: `Hourly cost limit would be exceeded ($${projectedHourlyCost.toFixed(2)} > $${this.config.maxHourlyCostUsd})`,
        fallbackSuggested: 'Schedule request for next hour or use cached data'
      };
    }

    if (projectedDailyCost > this.config.maxDailyCostUsd) {
      return {
        allowed: false,
        reason: `Daily cost limit would be exceeded ($${projectedDailyCost.toFixed(2)} > $${this.config.maxDailyCostUsd})`,
        fallbackSuggested: 'Schedule request for tomorrow or use cached data'
      };
    }

    return { allowed: true };
  }

  private checkUsageLimits(context: RateLimitContext): RateLimitDecision {
    if (this.metrics.dailyRequestCount >= this.config.dailySnapshotLimit) {
      return {
        allowed: false,
        reason: `Daily snapshot limit reached (${this.config.dailySnapshotLimit})`,
        fallbackSuggested: 'Schedule for tomorrow or use cached competitor data'
      };
    }

    if (this.metrics.hourlyRequestCount >= this.config.hourlySnapshotLimit) {
      return {
        allowed: false,
        reason: `Hourly snapshot limit reached (${this.config.hourlySnapshotLimit})`,
        waitTimeMs: this.getTimeUntilNextHour(),
        fallbackSuggested: 'Wait for next hour or use cached competitor data'
      };
    }

    return { allowed: true };
  }

  private checkDomainThrottle(context: RateLimitContext): RateLimitDecision {
    const throttleInfo = this.domainThrottles.get(context.domain);
    
    if (throttleInfo && throttleInfo.isThrottled && Date.now() < throttleInfo.nextAllowedTime.getTime()) {
      return {
        allowed: false,
        reason: `Domain ${context.domain} is throttled`,
        waitTimeMs: throttleInfo.nextAllowedTime.getTime() - Date.now(),
        fallbackSuggested: 'Use cached data for this competitor'
      };
    }

    return { allowed: true };
  }

  private checkProjectThrottle(context: RateLimitContext): RateLimitDecision {
    const throttleInfo = this.projectThrottles.get(context.projectId);
    
    if (throttleInfo && throttleInfo.isThrottled && Date.now() < throttleInfo.nextAllowedTime.getTime()) {
      return {
        allowed: false,
        reason: `Project ${context.projectId} is throttled`,
        waitTimeMs: throttleInfo.nextAllowedTime.getTime() - Date.now(),
        fallbackSuggested: 'Process other projects first'
      };
    }

    return { allowed: true };
  }

  private checkConcurrencyLimits(context: RateLimitContext): RateLimitDecision {
    if (this.metrics.currentConcurrentRequests >= this.config.maxGlobalConcurrent) {
      return {
        allowed: false,
        reason: `Global concurrency limit reached (${this.config.maxGlobalConcurrent})`,
        waitTimeMs: 30000, // Suggest waiting 30 seconds
        fallbackSuggested: 'Queue request for later processing'
      };
    }

    return { allowed: true };
  }

  private getProjectConcurrencyLimiter(projectId: string): ReturnType<typeof pLimit> {
    if (!this.projectConcurrencyLimiters.has(projectId)) {
      this.projectConcurrencyLimiters.set(
        projectId,
        pLimit(this.config.maxConcurrentPerProject)
      );
    }
    return this.projectConcurrencyLimiters.get(projectId)!;
  }

  private updateDomainThrottle(domain: string): void {
    const now = new Date();
    const throttleInfo: DomainThrottleInfo = {
      domain,
      lastRequestTime: now,
      requestCount: (this.domainThrottles.get(domain)?.requestCount || 0) + 1,
      isThrottled: true,
      nextAllowedTime: new Date(now.getTime() + this.config.perDomainThrottleMs)
    };
    
    this.domainThrottles.set(domain, throttleInfo);
  }

  private updateProjectThrottle(projectId: string): void {
    const now = new Date();
    const throttleInfo: ProjectThrottleInfo = {
      projectId,
      lastRequestTime: now,
      requestCount: (this.projectThrottles.get(projectId)?.requestCount || 0) + 1,
      isThrottled: true,
      nextAllowedTime: new Date(now.getTime() + this.config.perProjectThrottleMs)
    };
    
    this.projectThrottles.set(projectId, throttleInfo);
  }

  private recordConcurrentRequestStart(context: RateLimitContext): void {
    this.metrics.currentConcurrentRequests++;
  }

  private recordConcurrentRequestEnd(context: RateLimitContext): void {
    this.metrics.currentConcurrentRequests = Math.max(0, this.metrics.currentConcurrentRequests - 1);
  }

  private recordRequestSuccess(context: RateLimitContext, durationMs: number): void {
    this.metrics.successfulRequests++;
    this.recordCircuitBreakerSuccess();
    this.updateCostMetrics(context);
    this.updateUsageStats(true, context);
  }

  private recordRequestFailure(context: RateLimitContext, durationMs: number, error: Error): void {
    this.metrics.failedRequests++;
    this.recordCircuitBreakerFailure();
    this.updateUsageStats(false, context);
  }

  private recordCircuitBreakerSuccess(): void {
    this.circuitBreakerInfo.successCount++;
    this.circuitBreakerInfo.totalRequests++;
    this.errorWindow.push({ timestamp: new Date(), success: true });
    
    // If in half-open state, track test requests
    if (this.circuitBreakerInfo.state === 'half-open') {
      this.circuitBreakerInfo.halfOpenTestRequests++;
      
      // If enough successful test requests, close the circuit
      if (this.circuitBreakerInfo.halfOpenTestRequests >= this.config.circuitBreakerHalfOpenRequests) {
        this.circuitBreakerInfo.state = 'closed';
        this.circuitBreakerInfo.halfOpenTestRequests = 0;
        logger.info('Circuit breaker closed after successful recovery test');
      }
    }
    
    this.updateCircuitBreakerErrorRate();
  }

  private recordCircuitBreakerFailure(): void {
    this.circuitBreakerInfo.errorCount++;
    this.circuitBreakerInfo.totalRequests++;
    this.circuitBreakerInfo.lastFailureTime = new Date();
    this.errorWindow.push({ timestamp: new Date(), success: false });
    
    this.updateCircuitBreakerErrorRate();
    
    // Check if should open circuit breaker
    if (this.circuitBreakerInfo.errorRate >= this.config.circuitBreakerErrorThreshold) {
      this.circuitBreakerInfo.state = 'open';
      this.circuitBreakerInfo.nextRetryTime = new Date(Date.now() + this.config.circuitBreakerRecoveryMs);
      
      logger.warn('Circuit breaker opened due to high error rate', {
        errorRate: this.circuitBreakerInfo.errorRate,
        threshold: this.config.circuitBreakerErrorThreshold
      });
    }
  }

  private updateCircuitBreakerErrorRate(): void {
    // Clean old entries from error window
    const cutoffTime = Date.now() - this.config.circuitBreakerWindowMs;
    this.errorWindow = this.errorWindow.filter(entry => entry.timestamp.getTime() > cutoffTime);
    
    // Calculate error rate
    if (this.errorWindow.length > 0) {
      const errorCount = this.errorWindow.filter(entry => !entry.success).length;
      this.circuitBreakerInfo.errorRate = errorCount / this.errorWindow.length;
    } else {
      this.circuitBreakerInfo.errorRate = 0;
    }
  }

  private updateCostMetrics(context: RateLimitContext): void {
    const cost = context.estimatedCostUsd || this.config.costPerSnapshotUsd;
    this.metrics.hourlyCostUsd += cost;
    this.metrics.dailyCostUsd += cost;
  }

  private updateUsageStats(success: boolean, context: RateLimitContext): void {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.toISOString().substring(0, 13);
    
    // Update daily stats
    if (!this.usageStats.dailyStats || this.usageStats.dailyStats.date !== today) {
      this.usageStats.dailyStats = {
        date: today,
        requests: 0,
        successes: 0,
        failures: 0,
        costUsd: 0
      };
    }
    
    // Update hourly stats
    if (!this.usageStats.hourlyStats || this.usageStats.hourlyStats.hour !== hour) {
      this.usageStats.hourlyStats = {
        hour,
        requests: 0,
        successes: 0,
        failures: 0,
        costUsd: 0
      };
    }
    
    const cost = context.estimatedCostUsd || this.config.costPerSnapshotUsd;
    
    this.usageStats.dailyStats.requests++;
    this.usageStats.hourlyStats.requests++;
    
    if (success) {
      this.usageStats.dailyStats.successes++;
      this.usageStats.hourlyStats.successes++;
      this.usageStats.dailyStats.costUsd += cost;
      this.usageStats.hourlyStats.costUsd += cost;
    } else {
      this.usageStats.dailyStats.failures++;
      this.usageStats.hourlyStats.failures++;
    }
  }

  private recordMetric(metric: keyof RateLimitingMetrics): void {
    if (typeof this.metrics[metric] === 'number') {
      (this.metrics[metric] as number)++;
    }
  }

  private projectDailyCost(): number {
    const hoursRemaining = 24 - new Date().getHours();
    const hourlyRate = this.metrics.hourlyCostUsd;
    return this.metrics.dailyCostUsd + (hourlyRate * hoursRemaining);
  }

  private getTimeUntilNextHour(): number {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour.getTime() - now.getTime();
  }

  private initializeMetrics(): RateLimitingMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      throttledRequests: 0,
      circuitBreakerRejects: 0,
      costLimitRejects: 0,
      currentConcurrentRequests: 0,
      activeDomainThrottles: 0,
      activeProjectThrottles: 0,
      averageRequestTime: 0,
      p95RequestTime: 0,
      p99RequestTime: 0,
      dailyCostUsd: 0,
      hourlyCostUsd: 0,
      currentMemoryUsageMb: 0,
      currentCpuUsagePercent: 0,
      dailyRequestCount: 0,
      hourlyRequestCount: 0,
      requestsInLast5Minutes: 0,
      healthScore: 100,
      rateLimitingEffectiveness: 100,
      recommendedActions: []
    };
  }

  private initializeUsageStats(): UsageStatistics {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hour = now.toISOString().substring(0, 13);
    
    return {
      dailyStats: {
        date: today,
        requests: 0,
        successes: 0,
        failures: 0,
        costUsd: 0
      },
      hourlyStats: {
        hour,
        requests: 0,
        successes: 0,
        failures: 0,
        costUsd: 0
      }
    };
  }

  private startBackgroundTasks(): void {
    // 1. Metrics calculation and cleanup (every 30 seconds)
    const metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 30000);
    
    // 2. Throttling cleanup (every minute)
    const throttleCleanupInterval = setInterval(() => {
      this.cleanupThrottles();
    }, 60000);
    
    // 3. Reset hourly stats (every hour)
    const hourlyResetInterval = setInterval(() => {
      this.resetHourlyStats();
    }, 60 * 60 * 1000);
    
    // 4. Reset daily stats (every day at midnight)
    const dailyResetInterval = setInterval(() => {
      this.resetDailyStats();
    }, 24 * 60 * 60 * 1000);
    
    this.backgroundTaskIntervals.push(
      metricsInterval,
      throttleCleanupInterval,
      hourlyResetInterval,
      dailyResetInterval
    );
  }

  private updateMetrics(): void {
    try {
      // Calculate request time metrics
      if (this.requestTimes.length > 0) {
        const sorted = [...this.requestTimes].sort((a, b) => a - b);
        this.metrics.averageRequestTime = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        this.metrics.p95RequestTime = sorted[Math.floor(sorted.length * 0.95)] || 0;
        this.metrics.p99RequestTime = sorted[Math.floor(sorted.length * 0.99)] || 0;
      }
      
      // Update active throttle counts
      this.metrics.activeDomainThrottles = Array.from(this.domainThrottles.values())
        .filter(throttle => throttle.isThrottled && Date.now() < throttle.nextAllowedTime.getTime()).length;
      
      this.metrics.activeProjectThrottles = Array.from(this.projectThrottles.values())
        .filter(throttle => throttle.isThrottled && Date.now() < throttle.nextAllowedTime.getTime()).length;
      
      // Update usage counts from stats
      this.metrics.dailyRequestCount = this.usageStats.dailyStats.requests;
      this.metrics.hourlyRequestCount = this.usageStats.hourlyStats.requests;
      this.metrics.dailyCostUsd = this.usageStats.dailyStats.costUsd;
      this.metrics.hourlyCostUsd = this.usageStats.hourlyStats.costUsd;
      
      // Calculate health score
      this.metrics.healthScore = this.calculateHealthScore();
      
      // Calculate rate limiting effectiveness
      this.metrics.rateLimitingEffectiveness = this.calculateEffectiveness();
      
      // Generate recommendations
      this.metrics.recommendedActions = this.generateRecommendations();
      
    } catch (error) {
      logger.error('Failed to update rate limiting metrics', error as Error);
    }
  }

  private cleanupThrottles(): void {
    const now = Date.now();
    
    // Clean up expired domain throttles
    for (const [domain, throttle] of this.domainThrottles.entries()) {
      if (now >= throttle.nextAllowedTime.getTime()) {
        this.domainThrottles.delete(domain);
      }
    }
    
    // Clean up expired project throttles
    for (const [projectId, throttle] of this.projectThrottles.entries()) {
      if (now >= throttle.nextAllowedTime.getTime()) {
        this.projectThrottles.delete(projectId);
      }
    }
  }

  private resetHourlyStats(): void {
    const now = new Date();
    const hour = now.toISOString().substring(0, 13);
    
    this.usageStats.hourlyStats = {
      hour,
      requests: 0,
      successes: 0,
      failures: 0,
      costUsd: 0
    };
    
    logger.info('Hourly rate limiting stats reset');
  }

  private resetDailyStats(): void {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    this.usageStats.dailyStats = {
      date: today,
      requests: 0,
      successes: 0,
      failures: 0,
      costUsd: 0
    };
    
    logger.info('Daily rate limiting stats reset');
  }

  private calculateHealthScore(): number {
    let score = 100;
    
    // Deduct for high error rates
    if (this.circuitBreakerInfo.errorRate > 0.1) {
      score -= (this.circuitBreakerInfo.errorRate * 50);
    }
    
    // Deduct for circuit breaker open
    if (this.circuitBreakerInfo.state === 'open') {
      score -= 30;
    }
    
    // Deduct for high throttling
    const throttleRate = this.metrics.throttledRequests / Math.max(1, this.metrics.totalRequests);
    if (throttleRate > 0.2) {
      score -= (throttleRate * 25);
    }
    
    // Deduct for high cost usage
    const costUtilization = this.metrics.dailyCostUsd / this.config.maxDailyCostUsd;
    if (costUtilization > 0.8) {
      score -= ((costUtilization - 0.8) * 100);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateEffectiveness(): number {
    if (this.metrics.totalRequests === 0) return 100;
    
    const successRate = this.metrics.successfulRequests / this.metrics.totalRequests;
    const throttleRate = this.metrics.throttledRequests / this.metrics.totalRequests;
    
    // Effectiveness is high when we have good success rate with reasonable throttling
    let effectiveness = successRate * 70; // 70% weight for success rate
    effectiveness += (1 - throttleRate) * 30; // 30% weight for not over-throttling
    
    return Math.max(0, Math.min(100, effectiveness * 100));
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.circuitBreakerInfo.state === 'open') {
      recommendations.push('Circuit breaker is open - investigate and fix underlying issues');
    }
    
    if (this.metrics.dailyCostUsd / this.config.maxDailyCostUsd > 0.8) {
      recommendations.push('Daily cost usage is high - consider cost optimization');
    }
    
    if (this.metrics.throttledRequests / Math.max(1, this.metrics.totalRequests) > 0.3) {
      recommendations.push('High throttling rate - consider increasing limits or optimizing request patterns');
    }
    
    if (this.circuitBreakerInfo.errorRate > 0.2) {
      recommendations.push('High error rate detected - investigate service reliability');
    }
    
    if (this.metrics.activeDomainThrottles > 10) {
      recommendations.push('Many domains are throttled - consider distributing requests across time');
    }
    
    return recommendations;
  }
} 