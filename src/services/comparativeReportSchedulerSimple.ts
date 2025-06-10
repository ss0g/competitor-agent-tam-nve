import * as cron from 'node-cron';
import { PrismaClient, ReportScheduleFrequency } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

export interface SimpleSchedulerConfig {
  enabled: boolean;
  frequency: ReportScheduleFrequency;
  customCron?: string;
  projectId: string;
  reportName?: string;
  notifyOnCompletion: boolean;
  notifyOnErrors: boolean;
  maxConcurrentJobs: number;
}

export interface ScheduleExecution {
  scheduleId: string;
  projectId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  error?: string;
  metrics: {
    totalTime?: number;
  };
}

export class ComparativeReportSchedulerSimple {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private activeExecutions: Map<string, ScheduleExecution> = new Map();
  private isRunning: boolean = false;

  private defaultConfig: Partial<SimpleSchedulerConfig> = {
    enabled: true,
    frequency: 'WEEKLY',
    notifyOnCompletion: true,
    notifyOnErrors: true,
    maxConcurrentJobs: 1
  };

  /**
   * Schedule comparative reports for a project
   */
  async scheduleComparativeReports(config: SimpleSchedulerConfig): Promise<string> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const scheduleId = createId();
    
    const context = {
      scheduleId,
      projectId: config.projectId,
      frequency: config.frequency
    };

    try {
      logger.info('Scheduling comparative reports', context);

      // Validate project exists
      await this.validateProjectForScheduling(config.projectId);

      // Convert frequency to cron expression
      const cronExpression = config.customCron || this.frequencyToCron(config.frequency);

      // Create schedule record in database
      const report = await this.createReportRecord(config.projectId, scheduleId);
      
      await prisma.reportSchedule.create({
        data: {
          id: scheduleId,
          reportId: report.id,
          name: config.reportName || `Comparative Analysis - ${new Date().toISOString()}`,
          description: `Automated comparative report for project ${config.projectId}`,
          frequency: config.frequency,
          customCron: config.customCron,
          timeframe: 30,
          nextRun: this.calculateNextRun(cronExpression),
          recipients: [],
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
   * Execute a scheduled comparative report (simplified)
   */
  async generateScheduledReport(projectId: string): Promise<{ success: boolean; message: string }> {
    const executionId = createId();
    const execution: ScheduleExecution = {
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

      // Simulate report generation process
      await this.simulateReportGeneration(projectId);

      // Update execution status
      execution.endTime = new Date();
      execution.status = 'completed';
      execution.metrics.totalTime = execution.endTime.getTime() - execution.startTime.getTime();

      logger.info('Scheduled comparative report generation completed', {
        projectId,
        executionId,
        totalTime: execution.metrics.totalTime
      });

      return { success: true, message: 'Report generated successfully' };

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
    config: SimpleSchedulerConfig
  ): Promise<void> {
    if (this.isRunning && config.maxConcurrentJobs === 1) {
      logger.warn('Skipping scheduled report execution - another job is already running', {
        scheduleId
      });
      return;
    }

    this.isRunning = true;

    try {
      const result = await this.generateScheduledReport(config.projectId);

      // Update schedule record
      await prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRun: new Date(),
          nextRun: this.calculateNextRun(this.frequencyToCron(config.frequency))
        }
      });

      // Send notifications if enabled
      if (config.notifyOnCompletion) {
        await this.sendCompletionNotification(scheduleId, result);
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
   * Simulate report generation (placeholder for actual implementation)
   */
  private async simulateReportGeneration(projectId: string): Promise<void> {
    logger.info('Simulating report generation', { projectId });
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    logger.info('Report generation simulation completed', { projectId });
  }

  /**
   * Validate project has required data for scheduling
   */
  private async validateProjectForScheduling(projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    logger.debug('Project validation passed for scheduling', { projectId });
  }

  /**
   * Create report record for scheduling
   */
  private async createReportRecord(projectId: string, scheduleId: string): Promise<any> {
    // Get first competitor for the report (legacy requirement)
    const competitors = await prisma.competitor.findMany({
      where: {
        projects: {
          some: {
            id: projectId
          }
        }
      },
      take: 1
    });

    if (competitors.length === 0) {
      throw new Error(`Project ${projectId} has no competitors`);
    }

    return await prisma.report.create({
      data: {
        name: `Scheduled Comparative Report - ${scheduleId}`,
        description: 'Automated comparative analysis report',
        competitorId: competitors[0].id,
        projectId: projectId,
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
      case 'BIWEEKLY':
        return '0 9 * * 1/2'; // 9 AM every other Monday
      case 'MONTHLY':
        return '0 9 1 * *'; // 9 AM on the 1st of every month
      case 'CUSTOM':
      default:
        return '0 9 * * 1'; // Default to weekly
    }
  }

  /**
   * Calculate next run time based on cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    // Simple calculation - in production would use a proper cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // Default to 1 week
    return nextRun;
  }

  /**
   * Send completion notification
   */
  private async sendCompletionNotification(scheduleId: string, result: any): Promise<void> {
    const message = `
🎊 Comparative Report Generated Successfully

Schedule ID: ${scheduleId}
Result: ${result.message}
Generated: ${new Date().toISOString()}
    `.trim();

    logger.info('Completion notification', { scheduleId, message });
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

    logger.error('Error notification', new Error(message), { scheduleId });
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
  getActiveExecutions(): ScheduleExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get schedule status
   */
  async getScheduleStatus(scheduleId: string): Promise<any> {
    const schedule = await prisma.reportSchedule.findUnique({
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
    const schedules = await prisma.reportSchedule.findMany({
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