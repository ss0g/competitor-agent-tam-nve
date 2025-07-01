import * as cron from 'node-cron';
import { PrismaClient, ReportScheduleFrequency } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '@/lib/logger';
import { ComparativeAnalysisService } from './analysis/comparativeAnalysisService';
import { ComparativeReportService } from './reports/comparativeReportService';
import { ProductScrapingService } from './productScrapingService';
import { ProjectScrapingService } from './projectScrapingService';
import { comparativeReportRepository } from '@/lib/repositories/comparativeReportRepository';
import { productRepository } from '@/lib/repositories/productRepository';
import { ComparativeAnalysisInput } from '@/types/analysis';
import { ComparativeReport, ReportGenerationOptions } from '@/types/comparativeReport';

// Default prisma instance for backward compatibility
const defaultPrisma = new PrismaClient();

export interface ComparativeReportSchedulerConfig {
  enabled: boolean;
  frequency: ReportScheduleFrequency;
  customCron?: string;
  projectId: string;
  reportName?: string;
  notifyOnCompletion: boolean;
  notifyOnErrors: boolean;
  maxConcurrentJobs: number;
  reportOptions?: ReportGenerationOptions;
}

export interface ScheduledReportExecution {
  scheduleId: string;
  projectId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  report?: ComparativeReport;
  error?: string;
  metrics: {
    scrapingTime?: number;
    analysisTime?: number;
    reportGenerationTime?: number;
    totalTime?: number;
  };
}

export class ComparativeReportScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private activeExecutions: Map<string, ScheduledReportExecution> = new Map();
  private isRunning: boolean = false;
  private prisma: PrismaClient;
  
  private comparativeAnalysisService: ComparativeAnalysisService;
  private comparativeReportService: ComparativeReportService;
  private productScrapingService: ProductScrapingService;
  private projectScrapingService: ProjectScrapingService;
  private reportRepository: typeof comparativeReportRepository;
  private productRepository: typeof productRepository;

  private defaultConfig: Partial<ComparativeReportSchedulerConfig> = {
    enabled: true,
    frequency: 'WEEKLY',
    notifyOnCompletion: true,
    notifyOnErrors: true,
    maxConcurrentJobs: 1,
    reportOptions: {
      template: 'comprehensive',
      format: 'markdown',
      includeCharts: true,
      includeTables: true
    }
  };

  constructor(prismaInstance?: PrismaClient) {
    this.prisma = prismaInstance || defaultPrisma;
    this.comparativeAnalysisService = new ComparativeAnalysisService();
    this.comparativeReportService = new ComparativeReportService();
    this.productScrapingService = new ProductScrapingService();
    this.projectScrapingService = new ProjectScrapingService();
    this.reportRepository = comparativeReportRepository;
    this.productRepository = productRepository;
  }

  /**
   * Schedule comparative reports for a project
   */
  async scheduleComparativeReports(config: ComparativeReportSchedulerConfig): Promise<string> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const scheduleId = createId();
    
    const context = {
      scheduleId,
      projectId: config.projectId,
      frequency: config.frequency
    };

    try {
      logger.info('Scheduling comparative reports', context);

      // Validate project exists and has products and competitors
      await this.validateProjectForScheduling(config.projectId);

      // Convert frequency to cron expression
      const cronExpression = config.customCron || this.frequencyToCron(config.frequency);

      // Create schedule record in database
      const report = await this.createReportRecord(config.projectId, scheduleId);
      
      await this.prisma.reportSchedule.create({
        data: {
          id: scheduleId,
          reportId: report.id,
          name: config.reportName || `Comparative Analysis - ${new Date().toISOString()}`,
          description: `Automated comparative report for project ${config.projectId}`,
          frequency: config.frequency,
          customCron: config.customCron,
          timeframe: 30, // Default 30 days
          nextRun: this.calculateNextRun(cronExpression),
          recipients: [], // Would be populated based on project users
          status: config.enabled ? 'ACTIVE' : 'PAUSED',
          notifyOnChanges: config.notifyOnCompletion
        }
      });

      // Schedule the cron job
      const task = cron.schedule(cronExpression, async () => {
        await this.executeScheduledReport(scheduleId, mergedConfig);
      }, {
        timezone: 'America/New_York'
      });

      this.jobs.set(scheduleId, task);

      if (config.enabled) {
        task.start();
        logger.info('Comparative report schedule created and started', context);
      } else {
        logger.info('Comparative report schedule created but not started (disabled)', context);
      }

      return scheduleId;

    } catch (error) {
      logger.error('Failed to schedule comparative reports', error as Error, context);
      throw error;
    }
  }

  /**
   * Execute a scheduled comparative report
   */
  async generateScheduledReport(projectId: string): Promise<ComparativeReport> {
    const executionId = createId();
    const execution: ScheduledReportExecution = {
      scheduleId: 'manual',
      projectId,
      executionId,
      startTime: new Date(),
      status: 'running',
      metrics: {}
    };

    this.activeExecutions.set(executionId, execution);

    try {
      logger.info('Starting scheduled comparative report generation', {
        projectId,
        executionId
      });

      // Step 1: Scrape fresh data
      const scrapingStartTime = Date.now();
      await this.refreshProjectData(projectId);
      execution.metrics.scrapingTime = Date.now() - scrapingStartTime;

      // Step 2: Perform comparative analysis
      const analysisStartTime = Date.now();
      const analysis = await this.performComparativeAnalysis(projectId);
      execution.metrics.analysisTime = Date.now() - analysisStartTime;

      // Step 3: Generate comparative report
      const reportStartTime = Date.now();
      const report = await this.generateComparativeReport(projectId, analysis);
      execution.metrics.reportGenerationTime = Date.now() - reportStartTime;

      // Update execution status
      execution.endTime = new Date();
      execution.status = 'completed';
      execution.report = report;
      execution.metrics.totalTime = execution.endTime.getTime() - execution.startTime.getTime();

      logger.info('Scheduled comparative report generation completed', {
        projectId,
        executionId,
        reportId: report.id,
        totalTime: execution.metrics.totalTime
      });

      return report;

    } catch (error) {
      execution.endTime = new Date();
      execution.status = 'failed';
      execution.error = (error as Error).message;

      logger.error('Scheduled comparative report generation failed', error as Error, {
        projectId,
        executionId
      });

      throw error;
    } finally {
      this.activeExecutions.set(executionId, execution);
    }
  }

  /**
   * Execute scheduled report with full workflow
   */
  private async executeScheduledReport(
    scheduleId: string, 
    config: ComparativeReportSchedulerConfig
  ): Promise<void> {
    if (this.isRunning && config.maxConcurrentJobs === 1) {
      logger.warn('Skipping scheduled report execution - another job is already running', {
        scheduleId
      });
      return;
    }

    this.isRunning = true;

    try {
      const report = await this.generateScheduledReport(config.projectId);

      // Update schedule record
      await this.prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRun: new Date(),
          nextRun: this.calculateNextRun(this.frequencyToCron(config.frequency))
        }
      });

      // Send notifications if enabled
      if (config.notifyOnCompletion) {
        await this.sendCompletionNotification(scheduleId, report);
      }

    } catch (error) {
      logger.error('Scheduled report execution failed', error as Error, { scheduleId });

      if (config.notifyOnErrors) {
        await this.sendErrorNotification(scheduleId, error as Error);
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Refresh project data by scraping product and competitor websites
   */
  private async refreshProjectData(projectId: string): Promise<void> {
    logger.info('Refreshing project data', { projectId });

    // Scrape product websites
    await this.productScrapingService.triggerManualProductScraping(projectId);

    // Scrape competitor websites  
    await this.projectScrapingService.triggerManualProjectScraping(projectId);

    logger.info('Project data refresh completed', { projectId });
  }

  /**
   * Perform comparative analysis for the project
   */
  private async performComparativeAnalysis(projectId: string): Promise<any> {
    logger.info('Performing comparative analysis', { projectId });

    // Get project with products and competitors
    const project = await this.prisma.project.findUnique({
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
    }) as any;

    if (!project || project.products.length === 0) {
      throw new Error(`Project ${projectId} not found or has no products`);
    }

    const product = project.products[0];
    const productSnapshot = product.snapshots[0];

    if (!productSnapshot) {
      throw new Error(`No product snapshot found for project ${projectId}`);
    }

    // Build comparative analysis input
    const analysisInput: ComparativeAnalysisInput = {
      product: {
        id: product.id,
        name: product.name,
        website: product.website
      },
      productSnapshot: {
        id: productSnapshot.id,
        content: productSnapshot.content,
        metadata: productSnapshot.metadata
      },
      competitors: project.competitors.map(competitor => ({
        competitor: {
          id: competitor.id,
          name: competitor.name,
          website: competitor.website
        },
        snapshot: competitor.snapshots[0] ? {
          id: competitor.snapshots[0].id,
          metadata: competitor.snapshots[0].metadata,
          content: {}
        } : null
      })).filter(c => c.snapshot !== null),
      analysisConfig: {
        focusAreas: ['features', 'positioning', 'user_experience', 'customer_targeting'],
        depth: 'detailed',
        includeRecommendations: true
      }
    };

    return await this.comparativeAnalysisService.analyzeProductVsCompetitors(analysisInput);
  }

  /**
   * Generate comparative report from analysis
   */
  private async generateComparativeReport(projectId: string, analysis: any): Promise<ComparativeReport> {
    logger.info('Generating comparative report', { projectId, analysisId: analysis.id });

    // Get product details
    const product = await this.productRepository.findByProjectId(projectId);
    if (!product) {
      throw new Error(`Product not found for project ${projectId}`);
    }

    const latestSnapshot = await this.prisma.productSnapshot.findFirst({
      where: { productId: product.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestSnapshot) {
      throw new Error(`No product snapshot found for product ${product.id}`);
    }

    // Generate the report
    const reportResult = await this.comparativeReportService.generateComparativeReport(
      analysis,
      product,
      latestSnapshot,
      {
        template: 'comprehensive',
        format: 'markdown',
        includeCharts: true,
        includeTables: true
      }
    );

    // Store the report
    const storedReport = await this.reportRepository.create({
      projectId,
      productId: product.id,
      analysisId: analysis.id,
      name: `Comparative Analysis - ${new Date().toISOString()}`,
      template: 'comprehensive',
      format: 'markdown',
      sections: reportResult.report.sections,
      metadata: reportResult.report.metadata,
      content: reportResult.report.content || ''
    });

    logger.info('Comparative report generated and stored', {
      projectId,
      reportId: storedReport.id
    });

    return reportResult.report;
  }

  /**
   * Validate project has required data for scheduling
   */
  private async validateProjectForScheduling(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        products: true,
        competitors: true
      }
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (project.products.length === 0) {
      throw new Error(`Project ${projectId} has no products. Cannot schedule comparative reports.`);
    }

    if (project.competitors.length === 0) {
      throw new Error(`Project ${projectId} has no competitors. Cannot schedule comparative reports.`);
    }

    logger.debug('Project validation passed for scheduling', {
      projectId,
      productCount: project.products.length,
      competitorCount: project.competitors.length
    });
  }

  /**
   * Create report record for scheduling
   */
  private async createReportRecord(projectId: string, scheduleId: string): Promise<any> {
    // Get first competitor for the report (legacy requirement)
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { competitors: true }
    });

    if (!project || project.competitors.length === 0) {
      throw new Error(`Project ${projectId} has no competitors`);
    }

    return await this.prisma.report.create({
      data: {
        name: `Scheduled Comparative Report - ${scheduleId}`,
        description: 'Automated comparative analysis report',
        competitorId: project.competitors[0].id,
        projectId,
        status: 'PENDING'
      }
    });
  }

  /**
   * Convert frequency enum to cron expression
   */
  private frequencyToCron(frequency: ReportScheduleFrequency): string {
    switch (frequency) {
      case 'DAILY':
        return '0 9 * * *'; // 9 AM daily
      case 'WEEKLY':
        return '0 9 * * 1'; // 9 AM every Monday
      case 'MONTHLY':
        return '0 9 1 * *'; // 9 AM on the 1st of every month
      case 'QUARTERLY' as any:
        return '0 0 1 */3 *'; // 12 AM on the 1st of every 3rd month
      default:
        return '0 9 * * 1'; // Default to weekly
    }
  }

  /**
   * Calculate next run time based on cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    const task = cron.schedule(cronExpression, () => {}, { scheduled: false });
    // Simple calculation - in production would use a proper cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // Default to 1 week
    return nextRun;
  }

  /**
   * Send completion notification
   */
  private async sendCompletionNotification(scheduleId: string, report: ComparativeReport): Promise<void> {
    const message = `
🎊 Comparative Report Generated Successfully

Schedule ID: ${scheduleId}
Report ID: ${report.id}
Project: ${report.metadata.projectName}
Generated: ${new Date().toISOString()}
Sections: ${report.sections.length}
Confidence Score: ${report.metadata.confidenceScore}%
    `.trim();

    logger.info('Completion notification', { scheduleId, message });
    // In production, this would send email/Slack notifications
  }

  /**
   * Send error notification
   */
  private async sendErrorNotification(scheduleId: string, error: Error): Promise<void> {
    const message = `
❌ Comparative Report Generation Failed

Schedule ID: ${scheduleId}
Error: ${error.message}
Time: ${new Date().toISOString()}
    `.trim();

    logger.error('Error notification', { scheduleId, message });
    // In production, this would send email/Slack notifications
  }

  /**
   * Stop a scheduled job
   */
  stopSchedule(scheduleId: string): boolean {
    const task = this.jobs.get(scheduleId);
    if (task) {
      task.stop();
      logger.info('Schedule stopped', { scheduleId });
      return true;
    }
    return false;
  }

  /**
   * Start a stopped schedule
   */
  startSchedule(scheduleId: string): boolean {
    const task = this.jobs.get(scheduleId);
    if (task) {
      task.start();
      logger.info('Schedule started', { scheduleId });
      return true;
    }
    return false;
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): ScheduledReportExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get schedule status
   */
  async getScheduleStatus(scheduleId: string): Promise<any> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: { report: true }
    });

    return {
      schedule,
      isRunning: this.jobs.has(scheduleId),
      activeExecution: Array.from(this.activeExecutions.values())
        .find(exec => exec.scheduleId === scheduleId)
    };
  }

  /**
   * List all schedules for a project
   */
  async listProjectSchedules(projectId: string): Promise<any[]> {
    const schedules = await this.prisma.reportSchedule.findMany({
      where: {
        report: {
          projectId
        }
      },
      include: {
        report: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return schedules.map(schedule => ({
      ...schedule,
      isRunning: this.jobs.has(schedule.id)
    }));
  }

  /**
   * Stop all jobs (cleanup)
   */
  stopAllJobs(): void {
    this.jobs.forEach((task, scheduleId) => {
      task.stop();
      logger.info('Stopped schedule during cleanup', { scheduleId });
    });
    this.jobs.clear();
    this.activeExecutions.clear();
  }
} 