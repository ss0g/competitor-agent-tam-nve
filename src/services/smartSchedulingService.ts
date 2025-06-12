/**
 * Smart Scheduling Service - Phase 1.2 Implementation
 * Intelligent snapshot scheduling with condition-based triggering
 * 
 * Features:
 * - 7-day freshness threshold for snapshots
 * - Immediate scraping for missing snapshots  
 * - Priority-based task scheduling
 * - Comprehensive error handling and correlation tracking
 * - Optimized resource usage
 */

import { logger, generateCorrelationId, trackErrorWithCorrelation, trackPerformance } from '@/lib/logger';
import { ProductScrapingService } from './productScrapingService';
import { WebScraperService } from './webScraper';
import prisma from '@/lib/prisma';

// Smart Scheduling interfaces
export interface ScrapingTask {
  type: 'PRODUCT' | 'COMPETITOR';
  targetId: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  url?: string;
  targetName?: string;
}

export interface ScrapingNeed {
  required: boolean;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ScrapingStatus {
  triggered: boolean;
  tasksExecuted: number;
  results: ScrapingTaskResult[];
}

export interface ScrapingTaskResult {
  taskType: 'PRODUCT' | 'COMPETITOR';
  targetId: string;
  success: boolean;
  snapshotId?: string;
  error?: string;
  duration: number;
  correlationId: string;
}

export interface ProjectFreshnessStatus {
  projectId: string;
  projectName: string;
  products: {
    id: string;
    name: string;
    needsScraping: boolean;
    lastSnapshot?: Date;
    daysSinceLastSnapshot?: number;
    reason: string;
  }[];
  competitors: {
    id: string;
    name: string;
    needsScraping: boolean;
    lastSnapshot?: Date;
    daysSinceLastSnapshot?: number;
    reason: string;
  }[];
  overallStatus: 'FRESH' | 'STALE' | 'MISSING_DATA';
  recommendedActions: string[];
}

export class SmartSchedulingService {
  private readonly FRESHNESS_THRESHOLD_DAYS = 7;
  private readonly HIGH_PRIORITY_THRESHOLD_DAYS = 14;
  private readonly TASK_EXECUTION_DELAY = 2000; // 2 seconds between tasks
  
  private productScrapingService: ProductScrapingService;
  private webScraperService: WebScraperService;

  constructor() {
    this.productScrapingService = new ProductScrapingService();
    this.webScraperService = new WebScraperService();
  }

  /**
   * Main smart scheduling method - checks and triggers scraping based on freshness
   * Phase 1.2 core implementation
   */
  public async checkAndTriggerScraping(projectId: string): Promise<ScrapingStatus> {
    const correlationId = generateCorrelationId();
    const context = { projectId, correlationId, operation: 'smartScheduling' };

    try {
      logger.info('Smart scheduling check started', context);

      // Get project details
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const scrapingTasks: ScrapingTask[] = [];

      // Check product snapshots separately to avoid Prisma include issues
      const products = await prisma.product.findMany({
        where: { projectId }
      });

      for (const product of products) {
        const latestSnapshot = await prisma.productSnapshot.findFirst({
          where: { productId: product.id },
          orderBy: { createdAt: 'desc' }
        });

        const needsScraping = this.needsScrapingCheck(latestSnapshot, 'PRODUCT');
        if (needsScraping.required) {
          scrapingTasks.push({
            type: 'PRODUCT',
            targetId: product.id,
            reason: needsScraping.reason,
            priority: needsScraping.priority,
            url: product.website,
            targetName: product.name
          });
        }
      }

      // Check competitor snapshots separately
      const competitors = await prisma.competitor.findMany({
        where: { 
          projects: {
            some: { id: projectId }
          }
        }
      });

      for (const competitor of competitors) {
        const latestSnapshot = await prisma.snapshot.findFirst({
          where: { competitorId: competitor.id },
          orderBy: { createdAt: 'desc' }
        });

        const needsScraping = this.needsScrapingCheck(latestSnapshot, 'COMPETITOR');
        if (needsScraping.required) {
          scrapingTasks.push({
            type: 'COMPETITOR',
            targetId: competitor.id,
            reason: needsScraping.reason,
            priority: needsScraping.priority,
            url: competitor.website,
            targetName: competitor.name
          });
        }
      }

      // Execute scraping tasks if needed
      if (scrapingTasks.length > 0) {
        logger.info('Triggering smart scraping', {
          ...context,
          taskCount: scrapingTasks.length,
          tasks: scrapingTasks.map(t => ({ 
            type: t.type, 
            targetName: t.targetName, 
            priority: t.priority, 
            reason: t.reason 
          }))
        });

        const results = await this.executeScrapingTasks(scrapingTasks, correlationId);
        
        logger.info('Smart scraping completed', {
          ...context,
          tasksExecuted: scrapingTasks.length,
          successfulTasks: results.filter(r => r.success).length,
          failedTasks: results.filter(r => !r.success).length
        });

        return {
          triggered: true,
          tasksExecuted: scrapingTasks.length,
          results
        };
      }

      logger.info('No scraping needed - data is fresh', context);
      return { triggered: false, tasksExecuted: 0, results: [] };

    } catch (error) {
      trackErrorWithCorrelation(
        error as Error,
        'checkAndTriggerScraping',
        correlationId,
        {
          ...context,
          service: 'SmartSchedulingService',
          method: 'checkAndTriggerScraping',
          isRecoverable: false,
          suggestedAction: 'Check project data and database connectivity'
        }
      );
      throw error;
    }
  }

  /**
   * Evaluates whether scraping is needed based on snapshot age and existence
   * Core intelligence for smart scheduling
   */
  private needsScrapingCheck(latestSnapshot: any, type: 'PRODUCT' | 'COMPETITOR'): ScrapingNeed {
    // No snapshot exists - immediate scraping required
    if (!latestSnapshot) {
      return {
        required: true,
        reason: `No ${type} snapshot exists`,
        priority: 'HIGH'
      };
    }

    // Check freshness based on 7-day threshold
    const snapshotAge = Date.now() - new Date(latestSnapshot.createdAt).getTime();
    const daysSinceSnapshot = snapshotAge / (1000 * 60 * 60 * 24);

    if (daysSinceSnapshot > this.FRESHNESS_THRESHOLD_DAYS) {
      return {
        required: true,
        reason: `${type} snapshot is ${Math.round(daysSinceSnapshot)} days old (exceeds ${this.FRESHNESS_THRESHOLD_DAYS} day threshold)`,
        priority: daysSinceSnapshot > this.HIGH_PRIORITY_THRESHOLD_DAYS ? 'HIGH' : 'MEDIUM'
      };
    }

    return {
      required: false,
      reason: `${type} snapshot is fresh (${Math.round(daysSinceSnapshot)} days old)`,
      priority: 'LOW'
    };
  }

  /**
   * Executes scraping tasks with priority ordering and error handling
   * Implements optimized resource usage with delays between tasks
   */
  private async executeScrapingTasks(
    tasks: ScrapingTask[], 
    correlationId: string
  ): Promise<ScrapingTaskResult[]> {
    const results: ScrapingTaskResult[] = [];
    
    // Sort tasks by priority: HIGH -> MEDIUM -> LOW
    const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
    const sortedTasks = tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    for (const [index, task] of sortedTasks.entries()) {
      const taskContext = {
        correlationId,
        taskType: task.type,
        targetId: task.targetId,
        targetName: task.targetName,
        priority: task.priority,
        operation: 'executeScrapingTask'
      };

      const startTime = Date.now();

      try {
        logger.info(`Executing scraping task ${index + 1}/${sortedTasks.length}`, taskContext);

        let snapshotId: string | undefined;

        if (task.type === 'PRODUCT') {
          // Use enhanced ProductScrapingService from Phase 1.1
          const snapshot = await this.productScrapingService.scrapeProductById(task.targetId);
          snapshotId = snapshot.id;
        } else {
          // Use WebScraperService for competitors
          snapshotId = await this.webScraperService.scrapeCompetitor(task.targetId);
        }

        const duration = Date.now() - startTime;

        const result: ScrapingTaskResult = {
          taskType: task.type,
          targetId: task.targetId,
          success: true,
          snapshotId,
          duration,
          correlationId
        };

        results.push(result);

        logger.info('Scraping task completed successfully', {
          ...taskContext,
          snapshotId,
          duration
        });

        // Add delay between tasks to optimize resource usage
        if (index < sortedTasks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.TASK_EXECUTION_DELAY));
        }

      } catch (error) {
        const duration = Date.now() - startTime;

        const result: ScrapingTaskResult = {
          taskType: task.type,
          targetId: task.targetId,
          success: false,
          error: (error as Error).message,
          duration,
          correlationId
        };

        results.push(result);

        trackErrorWithCorrelation(
          error as Error,
          'executeScrapingTask',
          correlationId,
          {
            ...taskContext,
            service: 'SmartSchedulingService',
            method: 'executeScrapingTasks',
            retryAttempt: 1,
            maxRetries: 1,
            isRecoverable: true,
            suggestedAction: 'Individual task failed but processing continues'
          }
        );

        logger.error('Scraping task failed', {
          ...taskContext,
          error: (error as Error).message,
          duration
        });
      }
    }

    return results;
  }

  /**
   * Gets comprehensive freshness status for a project
   * Useful for monitoring and manual checks
   */
  public async getFreshnessStatus(projectId: string): Promise<ProjectFreshnessStatus> {
    const correlationId = generateCorrelationId();
    const context = { projectId, correlationId, operation: 'getFreshnessStatus' };

    try {
      logger.info('Getting project freshness status', context);

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          products: {
            include: {
              snapshots: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          },
          competitors: {
            include: {
              snapshots: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const status: ProjectFreshnessStatus = {
        projectId: project.id,
        projectName: project.name,
        products: [],
        competitors: [],
        overallStatus: 'FRESH',
        recommendedActions: []
      };

      let hasStaleData = false;
      let hasMissingData = false;

      // Analyze product freshness
      for (const product of project.products) {
        const latestSnapshot = product.snapshots[0];
        const needsScraping = this.needsScrapingCheck(latestSnapshot, 'PRODUCT');
        
        let daysSinceLastSnapshot: number | undefined;
        if (latestSnapshot) {
          const snapshotAge = Date.now() - new Date(latestSnapshot.createdAt).getTime();
          daysSinceLastSnapshot = snapshotAge / (1000 * 60 * 60 * 24);
        }

        status.products.push({
          id: product.id,
          name: product.name,
          needsScraping: needsScraping.required,
          lastSnapshot: latestSnapshot?.createdAt,
          daysSinceLastSnapshot,
          reason: needsScraping.reason
        });

        if (needsScraping.required) {
          if (!latestSnapshot) {
            hasMissingData = true;
          } else {
            hasStaleData = true;
          }
        }
      }

      // Analyze competitor freshness
      for (const competitor of project.competitors) {
        const latestSnapshot = competitor.snapshots[0];
        const needsScraping = this.needsScrapingCheck(latestSnapshot, 'COMPETITOR');
        
        let daysSinceLastSnapshot: number | undefined;
        if (latestSnapshot) {
          const snapshotAge = Date.now() - new Date(latestSnapshot.createdAt).getTime();
          daysSinceLastSnapshot = snapshotAge / (1000 * 60 * 60 * 24);
        }

        status.competitors.push({
          id: competitor.id,
          name: competitor.name,
          needsScraping: needsScraping.required,
          lastSnapshot: latestSnapshot?.createdAt,
          daysSinceLastSnapshot,
          reason: needsScraping.reason
        });

        if (needsScraping.required) {
          if (!latestSnapshot) {
            hasMissingData = true;
          } else {
            hasStaleData = true;
          }
        }
      }

      // Determine overall status and recommendations
      if (hasMissingData) {
        status.overallStatus = 'MISSING_DATA';
        status.recommendedActions.push('Immediate scraping required for missing snapshots');
      } else if (hasStaleData) {
        status.overallStatus = 'STALE';
        status.recommendedActions.push('Scheduled scraping recommended for stale data');
      } else {
        status.overallStatus = 'FRESH';
        status.recommendedActions.push('All data is fresh - no action needed');
      }

      const needsScrapingCount = status.products.filter(p => p.needsScraping).length + 
                               status.competitors.filter(c => c.needsScraping).length;

      if (needsScrapingCount > 0) {
        status.recommendedActions.push(`Run smart scheduling to update ${needsScrapingCount} stale snapshots`);
      }

      logger.info('Project freshness status completed', {
        ...context,
        overallStatus: status.overallStatus,
        productsNeedingScraping: status.products.filter(p => p.needsScraping).length,
        competitorsNeedingScraping: status.competitors.filter(c => c.needsScraping).length
      });

      return status;

    } catch (error) {
      trackErrorWithCorrelation(
        error as Error,
        'getFreshnessStatus',
        correlationId,
        {
          ...context,
          service: 'SmartSchedulingService',
          method: 'getFreshnessStatus',
          isRecoverable: false
        }
      );
      throw error;
    }
  }

  /**
   * Cleanup method to close resources
   */
  public async cleanup(): Promise<void> {
    await this.productScrapingService.cleanup();
    await this.webScraperService.close();
    logger.info('SmartSchedulingService cleanup completed');
  }
}
