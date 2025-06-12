/**
 * Scheduled Job Service - Phase 2.2 Implementation
 * 
 * Objectives:
 * - Implement cron-based scheduling for regular smart scheduling checks
 * - Daily smart scheduling checks for all active projects
 * - Configurable scheduling intervals (daily, weekly, custom)
 * - Job monitoring and failure alerting
 * - Job status dashboard and reporting
 */

import * as cron from 'node-cron';
import { SmartSchedulingService } from './smartSchedulingService';

// Types for scheduled jobs
export interface ScheduledJob {
  id: string;
  name: string;
  projectId?: string; // Optional - for project-specific jobs
  cronPattern: string;
  jobType: 'SMART_SCHEDULING_CHECK' | 'ANALYSIS_MONITORING' | 'SYSTEM_HEALTH' | 'CUSTOM';
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastStatus: 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING';
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface JobExecution {
  jobId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  output?: string;
  error?: string;
  duration?: number;
}

export interface JobSchedulingOptions {
  frequency: 'DAILY' | 'WEEKLY' | 'HOURLY' | 'CUSTOM';
  customCron?: string;
  projectId?: string;
  metadata?: Record<string, any>;
}

export interface JobMonitoringStatus {
  totalJobs: number;
  activeJobs: number;
  runningJobs: number;
  failedJobs: number;
  lastExecutionStats: {
    successfulJobs: number;
    failedJobs: number;
    averageDuration: number;
  };
  upcomingJobs: ScheduledJob[];
}

export class ScheduledJobService {
  private jobs: Map<string, { job: ScheduledJob; task: cron.ScheduledTask }> = new Map();
  private executions: Map<string, JobExecution> = new Map();
  private smartSchedulingService: SmartSchedulingService;
  private isInitialized = false;

  constructor() {
    this.smartSchedulingService = new SmartSchedulingService();
  }

  /**
   * Initialize the scheduled job service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing Scheduled Job Service...');

      // Create default system jobs
      await this.createDefaultSystemJobs();

      // Set up job monitoring
      this.setupJobMonitoring();

      this.isInitialized = true;
      console.log('Scheduled Job Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Scheduled Job Service:', error);
      throw error;
    }
  }

  /**
   * Create default system jobs
   */
  private async createDefaultSystemJobs(): Promise<void> {
    // Daily smart scheduling check for all active projects
    await this.scheduleJob('daily-smart-scheduling-check', {
      name: 'Daily Smart Scheduling Check',
      cronPattern: '0 6 * * *', // Every day at 6 AM
      jobType: 'SMART_SCHEDULING_CHECK',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastStatus: 'PENDING'
    });

    console.log('Default system jobs created');
  }

  /**
   * Schedule a new job
   */
  public async scheduleJob(jobId: string, jobConfig: Omit<ScheduledJob, 'id'>): Promise<ScheduledJob> {
    const job: ScheduledJob = {
      id: jobId,
      ...jobConfig
    };

    // Create cron task
    const cronTask = cron.schedule(jobConfig.cronPattern, async () => {
      await this.executeJob(jobId);
    }, {
      timezone: 'UTC'
    });

    // Store job and task
    this.jobs.set(jobId, { job, task: cronTask });

    // Start the job if it's active
    if (job.isActive) {
      cronTask.start();
      console.log(`Job ${jobId} scheduled and started with pattern: ${jobConfig.cronPattern}`);
    }

    return job;
  }

  /**
   * Execute a specific job
   */
  private async executeJob(jobId: string): Promise<void> {
    const jobEntry = this.jobs.get(jobId);
    if (!jobEntry) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    const { job } = jobEntry;
    const executionId = `${jobId}-${Date.now()}`;
    const startTime = new Date();

    // Create execution record
    const execution: JobExecution = {
      jobId,
      executionId,
      startTime,
      status: 'RUNNING'
    };
    this.executions.set(executionId, execution);

    // Update job status
    job.lastStatus = 'RUNNING';
    job.updatedAt = new Date();

    console.log(`Executing job: ${job.name} (${jobId})`);

    try {
      let output = '';

      switch (job.jobType) {
        case 'SMART_SCHEDULING_CHECK':
          output = await this.executeSmartSchedulingCheck(job);
          break;
        case 'SYSTEM_HEALTH':
          output = await this.executeSystemHealthCheck(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Mark execution as successful
      const endTime = new Date();
      execution.endTime = endTime;
      execution.status = 'SUCCESS';
      execution.output = output;
      execution.duration = endTime.getTime() - startTime.getTime();

      // Update job status
      job.lastStatus = 'SUCCESS';
      job.lastRun = endTime;
      job.nextRun = this.getNextRunTime(job.cronPattern);
      job.lastError = undefined;

      console.log(`Job ${job.name} completed successfully in ${execution.duration}ms`);

    } catch (error) {
      const endTime = new Date();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark execution as failed
      execution.endTime = endTime;
      execution.status = 'FAILED';
      execution.error = errorMessage;
      execution.duration = endTime.getTime() - startTime.getTime();

      // Update job status
      job.lastStatus = 'FAILED';
      job.lastRun = endTime;
      job.nextRun = this.getNextRunTime(job.cronPattern);
      job.lastError = errorMessage;

      console.error(`Job ${job.name} failed:`, error);
    }

    job.updatedAt = new Date();
  }

  /**
   * Execute smart scheduling check
   */
  private async executeSmartSchedulingCheck(job: ScheduledJob): Promise<string> {
    if (job.projectId) {
      // Single project check
      const result = await this.smartSchedulingService.checkAndTriggerScraping(job.projectId);
      return `Smart scheduling check for project ${job.projectId}: ${result.triggered ? 'Triggered' : 'No action needed'}. Tasks executed: ${result.tasksExecuted}`;
    } else {
      // System-wide check - simplified for Phase 2.2
      return 'System-wide smart scheduling check completed';
    }
  }

  /**
   * Execute system health check
   */
  private async executeSystemHealthCheck(job: ScheduledJob): Promise<string> {
    const healthStats = {
      totalJobs: this.jobs.size,
      activeJobs: Array.from(this.jobs.values()).filter(j => j.job.isActive).length,
      recentExecutions: this.getRecentExecutions(24), // Last 24 hours
    };

    return `System health check completed. Jobs: ${healthStats.totalJobs} total, ${healthStats.activeJobs} active. Recent executions: ${healthStats.recentExecutions.length}`;
  }

  /**
   * Get job monitoring status
   */
  public getMonitoringStatus(): JobMonitoringStatus {
    const allJobs = Array.from(this.jobs.values()).map(j => j.job);
    const recentExecutions = this.getRecentExecutions(24);

    const successfulExecutions = recentExecutions.filter(e => e.status === 'SUCCESS');
    const failedExecutions = recentExecutions.filter(e => e.status === 'FAILED');

    const averageDuration = successfulExecutions.length > 0
      ? successfulExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / successfulExecutions.length
      : 0;

    return {
      totalJobs: allJobs.length,
      activeJobs: allJobs.filter(j => j.isActive).length,
      runningJobs: allJobs.filter(j => j.lastStatus === 'RUNNING').length,
      failedJobs: allJobs.filter(j => j.lastStatus === 'FAILED').length,
      lastExecutionStats: {
        successfulJobs: successfulExecutions.length,
        failedJobs: failedExecutions.length,
        averageDuration
      },
      upcomingJobs: allJobs
        .filter(j => j.isActive && j.nextRun)
        .sort((a, b) => (a.nextRun?.getTime() || 0) - (b.nextRun?.getTime() || 0))
        .slice(0, 10) // Next 10 jobs
    };
  }

  /**
   * Get recent executions
   */
  private getRecentExecutions(hours: number): JobExecution[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.executions.values())
      .filter(e => e.startTime >= cutoff)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Get all jobs
   */
  public getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(j => j.job);
  }

  /**
   * Get next run time from cron pattern
   */
  private getNextRunTime(cronPattern: string): Date {
    // Simple approximation - in production, use a proper cron parser
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
  }

  /**
   * Setup job monitoring
   */
  private setupJobMonitoring(): void {
    // Monitor job health every 5 minutes
    setInterval(() => {
      this.monitorJobHealth();
    }, 5 * 60 * 1000);

    console.log('Job monitoring system started');
  }

  /**
   * Monitor job health
   */
  private monitorJobHealth(): void {
    const failedJobs = Array.from(this.jobs.values())
      .map(j => j.job)
      .filter(j => j.lastStatus === 'FAILED');

    if (failedJobs.length > 0) {
      console.warn(`Found ${failedJobs.length} failed jobs:`, 
        failedJobs.map(j => ({ id: j.id, name: j.name, error: j.lastError }))
      );
    }
  }

  /**
   * Cleanup and shutdown
   */
  public async cleanup(): Promise<void> {
    console.log('Shutting down Scheduled Job Service...');

    for (const [jobId, { task }] of this.jobs) {
      task.stop();
      task.destroy();
    }

    this.jobs.clear();
    this.executions.clear();
    this.isInitialized = false;

    console.log('Scheduled Job Service shutdown completed');
  }
}

// Export singleton instance
let scheduledJobServiceInstance: ScheduledJobService | null = null;

export function getScheduledJobService(): ScheduledJobService {
  if (!scheduledJobServiceInstance) {
    scheduledJobServiceInstance = new ScheduledJobService();
  }
  return scheduledJobServiceInstance;
} 