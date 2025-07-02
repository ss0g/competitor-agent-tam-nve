import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { webScraperService } from '@/services/webScraper';
import { realTimeStatusService } from '@/services/realTimeStatusService';
import { RateLimitingService, RateLimitContext } from '@/services/rateLimitingService';
import { createId } from '@paralleldrive/cuid2';
import pLimit from 'p-limit';

type Limit = ReturnType<typeof pLimit>;

// Phase 4.1: Competitor Snapshot Capture Optimization Interfaces
export interface SnapshotCaptureConfig {
  maxConcurrentPerProject: number; // Maximum 5 concurrent snapshots per project
  maxGlobalConcurrent: number; // Maximum 20 concurrent snapshots globally
  perDomainThrottleMs: number; // Minimum 10 seconds between requests to same domain
  dailySnapshotLimit: number; // Maximum daily snapshots (configurable)
  circuitBreakerThreshold: number; // Error rate threshold (50%)
  circuitBreakerWindowMs: number; // Time window for error rate calculation (5 minutes)
  maxTotalCaptureTime: number; // Maximum 60 seconds total capture time
}

export interface WebsiteComplexityProfile {
  domain: string;
  type: 'basic' | 'ecommerce' | 'saas' | 'marketplace' | 'spa' | 'complex';
  expectedLoadTime: number;
  timeout: number;
  retryAttempts: number;
  requiresJavaScript: boolean;
  mobileFriendly: boolean;
}

export interface OptimizedSnapshotResult {
  success: boolean;
  capturedCount: number;
  totalCompetitors: number;
  captureTime: number;
  failures: CompetitorCaptureFailure[];
  rateLimitingTriggered: boolean;
  circuitBreakerActivated: boolean;
  resourceUsage: {
    avgTimePerSnapshot: number;
    maxConcurrentReached: number;
    throttledDomains: string[];
  };
}

export interface CompetitorCaptureFailure {
  competitorId: string;
  competitorName: string;
  domain: string;
  error: string;
  errorType: 'timeout' | 'rate_limit' | 'circuit_breaker' | 'network' | 'permission' | 'unknown';
  attemptedAt: Date;
  fallbackUsed: boolean;
}

export interface SnapshotPriorityOptions {
  priority: 'critical' | 'high' | 'normal' | 'low';
  projectId: string;
  isInitialReport: boolean;
  maxWaitTime?: number;
}

// Circuit Breaker State Management
interface CircuitBreakerState {
  errorCount: number;
  successCount: number;
  lastFailureTime: Date;
  state: 'closed' | 'open' | 'half-open';
  nextAttemptTime?: Date;
}

// Domain Throttling State
interface DomainThrottleState {
  domain: string;
  lastRequestTime: Date;
  requestCount: number;
}

export class CompetitorSnapshotOptimizer {
  private static instance: CompetitorSnapshotOptimizer;
  private config: SnapshotCaptureConfig;
  
  // Phase 4.4: Integrated rate limiting service
  private rateLimitingService: RateLimitingService;
  
  // Global concurrency control
  private globalConcurrencyLimiter: Limit;
  private projectConcurrencyLimiters = new Map<string, Limit>();
  
  // Rate limiting and throttling (Legacy - now handled by RateLimitingService)
  private domainThrottleStates = new Map<string, DomainThrottleState>();
  private dailySnapshotCount = 0;
  private dailyResetTime = new Date();
  
  // Circuit breaker for error resilience (Legacy - now handled by RateLimitingService)
  private circuitBreakerState: CircuitBreakerState = {
    errorCount: 0,
    successCount: 0,
    lastFailureTime: new Date(),
    state: 'closed'
  };
  
  // Website complexity profiles for intelligent timeout determination
  private websiteProfiles = new Map<string, WebsiteComplexityProfile>();

  constructor(config?: Partial<SnapshotCaptureConfig>) {
    this.config = {
      maxConcurrentPerProject: 5,
      maxGlobalConcurrent: 20,
      perDomainThrottleMs: 10000, // 10 seconds
      dailySnapshotLimit: 1000,
      circuitBreakerThreshold: 0.5, // 50% error rate
      circuitBreakerWindowMs: 300000, // 5 minutes
      maxTotalCaptureTime: 60000, // 60 seconds
      ...config
    };

    // Phase 4.4: Initialize integrated rate limiting service
    this.rateLimitingService = RateLimitingService.getInstance({
      maxConcurrentPerProject: this.config.maxConcurrentPerProject,
      maxGlobalConcurrent: this.config.maxGlobalConcurrent,
      perDomainThrottleMs: this.config.perDomainThrottleMs,
      dailySnapshotLimit: this.config.dailySnapshotLimit,
      circuitBreakerErrorThreshold: this.config.circuitBreakerThreshold,
      circuitBreakerWindowMs: this.config.circuitBreakerWindowMs
    });

    // Initialize global concurrency limiter
    this.globalConcurrencyLimiter = pLimit(this.config.maxGlobalConcurrent);
    
    this.initializeWebsiteProfiles();
    this.resetDailyCounterIfNeeded();
  }

  static getInstance(config?: Partial<SnapshotCaptureConfig>): CompetitorSnapshotOptimizer {
    if (!CompetitorSnapshotOptimizer.instance) {
      CompetitorSnapshotOptimizer.instance = new CompetitorSnapshotOptimizer(config);
    }
    return CompetitorSnapshotOptimizer.instance;
  }

  /**
   * Optimized competitor snapshot capture with full Phase 4.1 features
   */
  async captureCompetitorSnapshotsOptimized(
    projectId: string,
    priorityOptions?: SnapshotPriorityOptions
  ): Promise<OptimizedSnapshotResult> {
    const startTime = Date.now();
    const context = { 
      projectId, 
      operation: 'captureCompetitorSnapshotsOptimized',
      priority: priorityOptions?.priority || 'normal'
    };

    logger.info('Starting optimized competitor snapshot capture', {
      ...context,
      config: this.config,
      circuitBreakerState: this.circuitBreakerState.state
    });

    try {
      // Check circuit breaker state
      if (this.circuitBreakerState.state === 'open') {
        const canAttempt = this.canAttemptAfterCircuitBreaker();
        if (!canAttempt) {
          throw new Error('Circuit breaker is open - snapshot capture temporarily disabled');
        }
      }

      // Check daily limits
      this.resetDailyCounterIfNeeded();
      if (this.dailySnapshotCount >= this.config.dailySnapshotLimit) {
        throw new Error(`Daily snapshot limit (${this.config.dailySnapshotLimit}) exceeded`);
      }

      // Get project competitors
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          competitors: true
        }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (project.competitors.length === 0) {
        return {
          success: false,
          capturedCount: 0,
          totalCompetitors: 0,
          captureTime: Date.now() - startTime,
          failures: [],
          rateLimitingTriggered: false,
          circuitBreakerActivated: false,
          resourceUsage: {
            avgTimePerSnapshot: 0,
            maxConcurrentReached: 0,
            throttledDomains: []
          }
        };
      }

      // Initialize project-specific concurrency limiter
      const projectLimiter = this.getProjectConcurrencyLimiter(projectId);

      // Initialize web scraper
      await webScraperService.initialize();

      const failures: CompetitorCaptureFailure[] = [];
      const throttledDomains: string[] = [];
      let capturedCount = 0;
      let maxConcurrentReached = 0;
      let rateLimitingTriggered = false;

      try {
        // Create capture tasks with intelligent prioritization
        const captureTasks = project.competitors.map((competitor, index) => {
          return this.createOptimizedCaptureTask(
            competitor,
            projectLimiter,
            context,
            index,
            project.competitors.length
          );
        });

        // Execute with global timeout
        const captureTimeout = priorityOptions?.maxWaitTime || this.config.maxTotalCaptureTime;
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Total capture timeout exceeded (${captureTimeout}ms)`));
          }, captureTimeout);
        });

        const results = await Promise.race([
          Promise.allSettled(captureTasks),
          timeoutPromise
        ]) as PromiseSettledResult<any>[];

        // Process results
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const competitor = project.competitors[i];

          if (result.status === 'fulfilled' && result.value.success) {
            capturedCount++;
            this.recordSuccess();
          } else {
            const error = result.status === 'rejected' ? result.reason : (result as any).value?.error;
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            const failure: CompetitorCaptureFailure = {
              competitorId: competitor.id,
              competitorName: competitor.name,
              domain: this.extractDomain(competitor.website),
              error: errorMessage,
              errorType: this.categorizeError(errorMessage),
              attemptedAt: new Date(),
              fallbackUsed: false
            };

            failures.push(failure);
            this.recordFailure();

            // Check for rate limiting indicators
            if (errorMessage.includes('rate limit') || errorMessage.includes('throttle')) {
              rateLimitingTriggered = true;
            }

            // Track throttled domains
            const domain = this.extractDomain(competitor.website);
            if (this.isDomainThrottled(domain)) {
              throttledDomains.push(domain);
            }
          }
        }

        // Update daily counter
        this.dailySnapshotCount += capturedCount;

      } finally {
        await webScraperService.close();
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerSnapshot = capturedCount > 0 ? totalTime / capturedCount : 0;

      const result: OptimizedSnapshotResult = {
        success: capturedCount > 0,
        capturedCount,
        totalCompetitors: project.competitors.length,
        captureTime: totalTime,
        failures,
        rateLimitingTriggered,
        circuitBreakerActivated: this.circuitBreakerState.state !== 'closed',
        resourceUsage: {
          avgTimePerSnapshot,
          maxConcurrentReached,
          throttledDomains
        }
      };

      logger.info('Optimized competitor snapshot capture completed', {
        ...context,
        result: {
          ...result,
          failures: result.failures.length // Don't log full failure details in summary
        }
      });

      return result;

    } catch (error) {
      logger.error('Optimized competitor snapshot capture failed', error as Error, context);
      
      this.recordFailure();
      
      return {
        success: false,
        capturedCount: 0,
        totalCompetitors: 0,
        captureTime: Date.now() - startTime,
        failures: [{
          competitorId: 'unknown',
          competitorName: 'unknown',
          domain: 'unknown',
          error: error instanceof Error ? error.message : String(error),
          errorType: 'unknown',
          attemptedAt: new Date(),
          fallbackUsed: false
        }],
        rateLimitingTriggered: false,
        circuitBreakerActivated: this.circuitBreakerState.state === 'open',
        resourceUsage: {
          avgTimePerSnapshot: 0,
          maxConcurrentReached: 0,
          throttledDomains: []
        }
      };
    }
  }

  /**
   * Create optimized capture task for individual competitor
   */
  private createOptimizedCaptureTask(
    competitor: any,
    projectLimiter: Limit,
    context: any,
    index: number,
    totalCompetitors: number
  ) {
    return this.globalConcurrencyLimiter(async () => {
      return projectLimiter(async () => {
        const competitorContext = {
          ...context,
          competitorId: competitor.id,
          competitorName: competitor.name,
          competitorWebsite: competitor.website,
          index: index + 1,
          totalCompetitors
        };

        try {
          // Send real-time progress update
          realTimeStatusService.sendSnapshotCaptureUpdate(
            context.projectId,
            index,
            totalCompetitors,
            competitor.name
          );

          // Check domain throttling
          const domain = this.extractDomain(competitor.website);
          if (this.isDomainThrottled(domain)) {
            await this.waitForDomainThrottle(domain);
          }

          // Get optimized website profile
          const profile = this.getWebsiteProfile(competitor.website);
          
          logger.info('Capturing competitor snapshot with optimized settings', {
            ...competitorContext,
            profile: {
              type: profile.type,
              timeout: profile.timeout,
              expectedLoadTime: profile.expectedLoadTime
            }
          });

          // Update domain throttle state
          this.updateDomainThrottle(domain);

          // Capture snapshot with optimized settings
          const snapshotId = await webScraperService.scrapeCompetitor(competitor.id, {
            timeout: profile.timeout,
            retries: profile.retryAttempts,
            enableJavaScript: profile.requiresJavaScript,
            userAgent: profile.mobileFriendly ? 'mobile' : 'desktop'
          });

          logger.info('Competitor snapshot captured successfully', {
            ...competitorContext,
            snapshotId,
            captureTime: Date.now()
          });

          return { success: true, competitorId: competitor.id, snapshotId };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          logger.error('Failed to capture competitor snapshot', error as Error, competitorContext);

          return { 
            success: false, 
            competitorId: competitor.id, 
            error: errorMessage 
          };
        }
      });
    });
  }

  /**
   * Get or create project-specific concurrency limiter
   */
  private getProjectConcurrencyLimiter(projectId: string): Limit {
    if (!this.projectConcurrencyLimiters.has(projectId)) {
      this.projectConcurrencyLimiters.set(
        projectId, 
        pLimit(this.config.maxConcurrentPerProject)
      );
    }
    return this.projectConcurrencyLimiters.get(projectId)!;
  }

  /**
   * Get intelligent website profile for optimized capture settings
   */
  private getWebsiteProfile(website: string): WebsiteComplexityProfile {
    const domain = this.extractDomain(website);
    
    if (this.websiteProfiles.has(domain)) {
      return this.websiteProfiles.get(domain)!;
    }

    // Generate profile based on domain analysis
    const profile = this.analyzeWebsiteComplexity(website);
    this.websiteProfiles.set(domain, profile);
    
    return profile;
  }

  /**
   * Analyze website complexity to determine optimal capture settings
   */
  private analyzeWebsiteComplexity(website: string): WebsiteComplexityProfile {
    const url = website.toLowerCase();
    const domain = this.extractDomain(website);

    // Dynamic marketplaces - highest complexity
    if (url.includes('marketplace') || url.includes('freelance') || 
        url.includes('uber') || url.includes('airbnb') || url.includes('upwork') ||
        url.includes('gig') || url.includes('platform')) {
      return {
        domain,
        type: 'marketplace',
        expectedLoadTime: 8000,
        timeout: 30000, // 30 seconds
        retryAttempts: 2,
        requiresJavaScript: true,
        mobileFriendly: true
      };
    }

    // SaaS platforms - high complexity
    if (url.includes('saas') || url.includes('crm') || url.includes('app.') ||
        url.includes('dashboard') || url.includes('platform') || url.includes('software')) {
      return {
        domain,
        type: 'saas',
        expectedLoadTime: 6000,
        timeout: 25000, // 25 seconds
        retryAttempts: 2,
        requiresJavaScript: true,
        mobileFriendly: false
      };
    }

    // E-commerce sites - medium complexity
    if (url.includes('shop') || url.includes('store') || url.includes('ecommerce') ||
        url.includes('buy') || url.includes('cart') || url.includes('commerce')) {
      return {
        domain,
        type: 'ecommerce',
        expectedLoadTime: 4000,
        timeout: 20000, // 20 seconds
        retryAttempts: 2,
        requiresJavaScript: true,
        mobileFriendly: true
      };
    }

    // Single Page Applications - high complexity
    if (url.includes('app') || url.includes('web-app') || url.includes('react') ||
        url.includes('angular') || url.includes('vue')) {
      return {
        domain,
        type: 'spa',
        expectedLoadTime: 5000,
        timeout: 25000, // 25 seconds
        retryAttempts: 3,
        requiresJavaScript: true,
        mobileFriendly: true
      };
    }

    // Basic websites - lowest complexity
    if (url.includes('blog') || url.includes('news') || url.includes('info') ||
        url.includes('about') || url.includes('simple')) {
      return {
        domain,
        type: 'basic',
        expectedLoadTime: 2000,
        timeout: 15000, // 15 seconds
        retryAttempts: 1,
        requiresJavaScript: false,
        mobileFriendly: true
      };
    }

    // Default profile for unknown sites
    return {
      domain,
      type: 'complex',
      expectedLoadTime: 5000,
      timeout: 20000, // 20 seconds (default)
      retryAttempts: 2,
      requiresJavaScript: true,
      mobileFriendly: true
    };
  }

  /**
   * Check if domain is currently throttled
   */
  private isDomainThrottled(domain: string): boolean {
    const throttleState = this.domainThrottleStates.get(domain);
    if (!throttleState) {
      return false;
    }

    const timeSinceLastRequest = Date.now() - throttleState.lastRequestTime.getTime();
    return timeSinceLastRequest < this.config.perDomainThrottleMs;
  }

  /**
   * Wait for domain throttle to clear
   */
  private async waitForDomainThrottle(domain: string): Promise<void> {
    const throttleState = this.domainThrottleStates.get(domain);
    if (!throttleState) {
      return;
    }

    const timeSinceLastRequest = Date.now() - throttleState.lastRequestTime.getTime();
    const waitTime = this.config.perDomainThrottleMs - timeSinceLastRequest;

    if (waitTime > 0) {
      logger.info('Domain throttled, waiting before next request', {
        domain,
        waitTime,
        lastRequestTime: throttleState.lastRequestTime
      });

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Update domain throttle state
   */
  private updateDomainThrottle(domain: string): void {
    const existing = this.domainThrottleStates.get(domain);
    
    this.domainThrottleStates.set(domain, {
      domain,
      lastRequestTime: new Date(),
      requestCount: (existing?.requestCount || 0) + 1
    });
  }

  /**
   * Extract domain from website URL
   */
  private extractDomain(website: string): string {
    try {
      const url = new URL(website);
      return url.hostname;
    } catch {
      return website; // Fallback to full website string
    }
  }

  /**
   * Categorize error type for better handling
   */
  private categorizeError(errorMessage: string): CompetitorCaptureFailure['errorType'] {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out') || message.includes('time out')) {
      return 'timeout';
    }
    if (message.includes('rate limit') || message.includes('throttle')) {
      return 'rate_limit';
    }
    if (message.includes('circuit breaker') || message.includes('temporarily disabled')) {
      return 'circuit_breaker';
    }
    if (message.includes('network') || message.includes('connection') || message.includes('dns')) {
      return 'network';
    }
    if (message.includes('forbidden') || message.includes('unauthorized') || message.includes('blocked')) {
      return 'permission';
    }
    
    return 'unknown';
  }

  /**
   * Record successful capture for circuit breaker
   */
  private recordSuccess(): void {
    this.circuitBreakerState.successCount++;
    
    // If in half-open state and we have some successes, close the circuit
    if (this.circuitBreakerState.state === 'half-open' && 
        this.circuitBreakerState.successCount >= 3) {
      this.circuitBreakerState.state = 'closed';
      this.circuitBreakerState.errorCount = 0;
      
      logger.info('Circuit breaker closed after successful captures');
    }
  }

  /**
   * Record failure for circuit breaker
   */
  private recordFailure(): void {
    this.circuitBreakerState.errorCount++;
    this.circuitBreakerState.lastFailureTime = new Date();

    const totalRequests = this.circuitBreakerState.errorCount + this.circuitBreakerState.successCount;
    const errorRate = totalRequests > 0 ? this.circuitBreakerState.errorCount / totalRequests : 0;

    // Check if we should open the circuit breaker
    if (errorRate >= this.config.circuitBreakerThreshold && totalRequests >= 5) {
      this.circuitBreakerState.state = 'open';
      this.circuitBreakerState.nextAttemptTime = new Date(
        Date.now() + this.config.circuitBreakerWindowMs
      );
      
      logger.warn('Circuit breaker opened due to high error rate', {
        errorRate,
        errorCount: this.circuitBreakerState.errorCount,
        totalRequests,
        nextAttemptTime: this.circuitBreakerState.nextAttemptTime
      });
    }
  }

  /**
   * Check if we can attempt after circuit breaker
   */
  private canAttemptAfterCircuitBreaker(): boolean {
    if (this.circuitBreakerState.state !== 'open') {
      return true;
    }

    if (this.circuitBreakerState.nextAttemptTime && 
        Date.now() >= this.circuitBreakerState.nextAttemptTime.getTime()) {
      // Move to half-open state for testing
      this.circuitBreakerState.state = 'half-open';
      this.circuitBreakerState.successCount = 0;
      
      logger.info('Circuit breaker moved to half-open state for testing');
      return true;
    }

    return false;
  }

  /**
   * Reset daily counter if needed
   */
  private resetDailyCounterIfNeeded(): void {
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - this.dailyResetTime.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff >= 1) {
      this.dailySnapshotCount = 0;
      this.dailyResetTime = now;
      
      logger.info('Daily snapshot counter reset', {
        resetTime: this.dailyResetTime,
        previousCount: this.dailySnapshotCount
      });
    }
  }

  /**
   * Initialize common website profiles for faster processing
   */
  private initializeWebsiteProfiles(): void {
    const commonProfiles: WebsiteComplexityProfile[] = [
      // Marketplaces
      { domain: 'uber.com', type: 'marketplace', expectedLoadTime: 8000, timeout: 30000, retryAttempts: 2, requiresJavaScript: true, mobileFriendly: true },
      { domain: 'airbnb.com', type: 'marketplace', expectedLoadTime: 8000, timeout: 30000, retryAttempts: 2, requiresJavaScript: true, mobileFriendly: true },
      { domain: 'upwork.com', type: 'marketplace', expectedLoadTime: 8000, timeout: 30000, retryAttempts: 2, requiresJavaScript: true, mobileFriendly: true },
      
      // SaaS platforms
      { domain: 'salesforce.com', type: 'saas', expectedLoadTime: 6000, timeout: 25000, retryAttempts: 2, requiresJavaScript: true, mobileFriendly: false },
      { domain: 'hubspot.com', type: 'saas', expectedLoadTime: 6000, timeout: 25000, retryAttempts: 2, requiresJavaScript: true, mobileFriendly: false },
      
      // E-commerce
      { domain: 'amazon.com', type: 'ecommerce', expectedLoadTime: 4000, timeout: 20000, retryAttempts: 2, requiresJavaScript: true, mobileFriendly: true },
      { domain: 'ebay.com', type: 'ecommerce', expectedLoadTime: 4000, timeout: 20000, retryAttempts: 2, requiresJavaScript: true, mobileFriendly: true },
      { domain: 'etsy.com', type: 'ecommerce', expectedLoadTime: 4000, timeout: 20000, retryAttempts: 2, requiresJavaScript: true, mobileFriendly: true }
    ];

    for (const profile of commonProfiles) {
      this.websiteProfiles.set(profile.domain, profile);
    }
  }

  /**
   * Get current system status for monitoring
   */
  getSystemStatus(): {
    circuitBreakerState: string;
    dailySnapshotCount: number;
    dailyLimit: number;
    activeThrottledDomains: number;
    globalConcurrencyLimit: number;
    config: SnapshotCaptureConfig;
  } {
    return {
      circuitBreakerState: this.circuitBreakerState.state,
      dailySnapshotCount: this.dailySnapshotCount,
      dailyLimit: this.config.dailySnapshotLimit,
      activeThrottledDomains: Array.from(this.domainThrottleStates.keys()).filter(domain => 
        this.isDomainThrottled(domain)
      ).length,
      globalConcurrencyLimit: this.config.maxGlobalConcurrent,
      config: this.config
    };
  }

  /**
   * Update configuration (for runtime adjustments)
   */
  updateConfig(newConfig: Partial<SnapshotCaptureConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate global limiter if concurrency changed
    if (newConfig.maxGlobalConcurrent) {
      this.globalConcurrencyLimiter = pLimit(newConfig.maxGlobalConcurrent);
    }
    
    logger.info('Snapshot capture configuration updated', { 
      config: this.config 
    });
  }
}

// Export singleton instance
export const competitorSnapshotOptimizer = CompetitorSnapshotOptimizer.getInstance(); 