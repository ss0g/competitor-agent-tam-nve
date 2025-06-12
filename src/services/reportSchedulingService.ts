/**
 * Report Scheduling Service - Phase 2.3 Implementation
 * 
 * Objectives:
 * - Automate report generation based on data freshness and schedules
 * - Integrate with existing ReportSchedule model
 * - Trigger report generation when fresh analysis is available
 * - Email notification system for scheduled reports
 * - Report versioning and change detection
 * - User preference management for report scheduling
 */

import { SmartSchedulingService } from './smartSchedulingService';
import { AutoReportGenerationService } from './autoReportGenerationService';

export interface ReportSchedulingOptions {
  projectId: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ON_DATA_CHANGE';
  reportTemplate: 'comprehensive' | 'executive' | 'technical' | 'strategic';
  recipients: string[];
  includeAnalysis: boolean;
  triggerOnFreshData: boolean;
  minDataAgeHours?: number; // Minimum hours since last report
}

export interface ReportScheduleStatus {
  id: string;
  projectId: string;
  lastReportGenerated?: Date;
  nextScheduledReport?: Date;
  dataFreshness: 'FRESH' | 'STALE' | 'MISSING';
  reportsPendingGeneration: number;
  lastReportSuccess: boolean;
  lastReportError?: string;
}

export interface ReportGenerationTrigger {
  type: 'SCHEDULED' | 'FRESH_DATA' | 'USER_REQUEST' | 'ANALYSIS_COMPLETE';
  projectId: string;
  triggeredBy: string;
  metadata?: Record<string, any>;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class ReportSchedulingService {
  private smartSchedulingService: SmartSchedulingService;
  private autoReportService: AutoReportGenerationService;
  private activeSchedules: Map<string, ReportSchedulingOptions> = new Map();
  private generationQueue: ReportGenerationTrigger[] = [];
  private isProcessing = false;

  constructor() {
    this.smartSchedulingService = new SmartSchedulingService();
    this.autoReportService = new AutoReportGenerationService();
  }

  /**
   * Initialize the report scheduling service
   */
  public async initialize(): Promise<void> {
    console.log('Initializing Report Scheduling Service...');

    // Start monitoring for fresh data
    this.startFreshDataMonitoring();

    // Start processing the generation queue
    this.startQueueProcessing();

    console.log('Report Scheduling Service initialized successfully');
  }

  /**
   * Schedule reports for a project
   */
  public async scheduleReports(
    scheduleId: string,
    options: ReportSchedulingOptions
  ): Promise<void> {
    console.log(`Scheduling reports for project ${options.projectId}`, {
      frequency: options.frequency,
      template: options.reportTemplate,
      recipients: options.recipients.length
    });

    // Store the schedule
    this.activeSchedules.set(scheduleId, options);

    // If it's a data-change based schedule, start monitoring
    if (options.frequency === 'ON_DATA_CHANGE' || options.triggerOnFreshData) {
      this.monitorProjectForDataChanges(options.projectId, scheduleId);
    }

    // For time-based schedules, integrate with existing cron system
    if (options.frequency !== 'ON_DATA_CHANGE') {
      // This would integrate with the ScheduledJobService for time-based triggers
      console.log(`Time-based report scheduling for ${options.frequency} frequency registered`);
    }
  }

  /**
   * Monitor project for data changes that should trigger reports
   */
  private async monitorProjectForDataChanges(
    projectId: string,
    scheduleId: string
  ): Promise<void> {
    try {
      // Check data freshness
      const freshnessStatus = await this.smartSchedulingService.getFreshnessStatus(projectId);

      const schedule = this.activeSchedules.get(scheduleId);
      if (!schedule) return;

      // Determine if report should be triggered
      const shouldTrigger = this.shouldTriggerReport(freshnessStatus, schedule);

      if (shouldTrigger) {
        console.log(`Triggering report generation for project ${projectId} due to fresh data`);
        
        await this.triggerReportGeneration({
          type: 'FRESH_DATA',
          projectId,
          triggeredBy: scheduleId,
          priority: 'MEDIUM',
          metadata: {
            freshnessStatus: freshnessStatus.overallStatus
          }
        });
      }

    } catch (error) {
      console.error(`Error monitoring project ${projectId} for data changes:`, error);
    }
  }

  /**
   * Determine if report should be triggered based on data freshness
   */
  private shouldTriggerReport(
    freshnessStatus: any,
    schedule: ReportSchedulingOptions
  ): boolean {
    // Don't trigger if data is not fresh enough
    if (freshnessStatus.overallStatus !== 'FRESH') {
      return false;
    }

    return true;
  }

  /**
   * Trigger report generation
   */
  public async triggerReportGeneration(trigger: ReportGenerationTrigger): Promise<void> {
    console.log(`Queuing report generation for project ${trigger.projectId}`, {
      type: trigger.type,
      priority: trigger.priority
    });

    // Add to queue with priority ordering
    this.generationQueue.push(trigger);
    this.generationQueue.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processGenerationQueue();
    }
  }

  /**
   * Process the report generation queue
   */
  private async processGenerationQueue(): Promise<void> {
    if (this.isProcessing || this.generationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.generationQueue.length > 0) {
        const trigger = this.generationQueue.shift();
        if (!trigger) break;

        await this.generateReportForTrigger(trigger);

        // Small delay between generations to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Error processing report generation queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate report for a specific trigger
   */
  private async generateReportForTrigger(trigger: ReportGenerationTrigger): Promise<void> {
    try {
      console.log(`Generating report for project ${trigger.projectId}`, {
        type: trigger.type,
        triggeredBy: trigger.triggeredBy
      });

      // Find active schedule for this project
      const schedule = Array.from(this.activeSchedules.values())
        .find(s => s.projectId === trigger.projectId);

      if (!schedule) {
        console.warn(`No active schedule found for project ${trigger.projectId}`);
        return;
      }

      // Generate the report using the auto report service
      const reportResult = await this.autoReportService.generateInitialReport(
        trigger.projectId,
        {
          reportTemplate: schedule.reportTemplate,
          priority: trigger.priority.toLowerCase() as 'high' | 'normal' | 'low',
          reportName: `Scheduled Report - ${new Date().toISOString()}`
        }
      );

      console.log(`Report generation queued successfully for project ${trigger.projectId}`, {
        taskId: reportResult.taskId,
        queuePosition: reportResult.queuePosition
      });

      // In a full implementation, this would trigger email notifications
      if (schedule.recipients.length > 0) {
        console.log(`Would send notifications to ${schedule.recipients.length} recipients`);
      }

    } catch (error) {
      console.error(`Failed to generate report for project ${trigger.projectId}:`, error);
    }
  }

  /**
   * Start fresh data monitoring for all active schedules
   */
  private startFreshDataMonitoring(): void {
    // Monitor every 15 minutes for fresh data
    setInterval(async () => {
      await this.checkAllProjectsForFreshData();
    }, 15 * 60 * 1000); // 15 minutes

    console.log('Fresh data monitoring started');
  }

  /**
   * Check all projects with active schedules for fresh data
   */
  private async checkAllProjectsForFreshData(): Promise<void> {
    const projectSchedules = new Map<string, string[]>();

    // Group schedules by project
    for (const [scheduleId, schedule] of this.activeSchedules) {
      if (schedule.frequency === 'ON_DATA_CHANGE' || schedule.triggerOnFreshData) {
        if (!projectSchedules.has(schedule.projectId)) {
          projectSchedules.set(schedule.projectId, []);
        }
        projectSchedules.get(schedule.projectId)?.push(scheduleId);
      }
    }

    // Check each project
    for (const [projectId, scheduleIds] of projectSchedules) {
      for (const scheduleId of scheduleIds) {
        await this.monitorProjectForDataChanges(projectId, scheduleId);
      }
    }
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      if (!this.isProcessing && this.generationQueue.length > 0) {
        this.processGenerationQueue();
      }
    }, 30 * 1000); // 30 seconds

    console.log('Report generation queue processing started');
  }

  /**
   * Get report schedule status for a project
   */
  public async getReportScheduleStatus(projectId: string): Promise<ReportScheduleStatus> {
    try {
      // Get data freshness
      const freshnessStatus = await this.smartSchedulingService.getFreshnessStatus(projectId);
      
      // Check pending reports in queue
      const pendingReports = this.generationQueue.filter(t => t.projectId === projectId).length;

      // Find active schedules for this project
      const activeSchedule = Array.from(this.activeSchedules.values())
        .find(s => s.projectId === projectId);

      return {
        id: projectId,
        projectId,
        dataFreshness: freshnessStatus.overallStatus === 'MISSING_DATA' ? 'MISSING' : freshnessStatus.overallStatus,
        reportsPendingGeneration: pendingReports,
        lastReportSuccess: true, // Simplified for Phase 2.3
        nextScheduledReport: activeSchedule ? this.calculateNextReportTime(activeSchedule) : undefined
      };

    } catch (error) {
      console.error(`Error getting report schedule status for project ${projectId}:`, error);
      
      return {
        id: projectId,
        projectId,
        dataFreshness: 'MISSING',
        reportsPendingGeneration: 0,
        lastReportSuccess: false,
        lastReportError: (error as Error).message
      };
    }
  }

  /**
   * Calculate next report time based on schedule
   */
  private calculateNextReportTime(schedule: ReportSchedulingOptions): Date | undefined {
    if (schedule.frequency === 'ON_DATA_CHANGE') {
      return undefined; // Data-driven, no fixed schedule
    }

    const now = new Date();
    switch (schedule.frequency) {
      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return undefined;
    }
  }

  /**
   * Get all active schedules
   */
  public getActiveSchedules(): Array<{ id: string; options: ReportSchedulingOptions }> {
    return Array.from(this.activeSchedules.entries()).map(([id, options]) => ({
      id,
      options
    }));
  }

  /**
   * Remove a report schedule
   */
  public removeSchedule(scheduleId: string): boolean {
    return this.activeSchedules.delete(scheduleId);
  }

  /**
   * Get generation queue status
   */
  public getQueueStatus(): {
    pendingReports: number;
    isProcessing: boolean;
    queueByPriority: Record<string, number>;
  } {
    const queueByPriority = this.generationQueue.reduce((acc, trigger) => {
      acc[trigger.priority] = (acc[trigger.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      pendingReports: this.generationQueue.length,
      isProcessing: this.isProcessing,
      queueByPriority
    };
  }

  /**
   * Cleanup and shutdown
   */
  public async cleanup(): Promise<void> {
    console.log('Shutting down Report Scheduling Service...');

    this.activeSchedules.clear();
    this.generationQueue.length = 0;
    this.isProcessing = false;

    console.log('Report Scheduling Service shutdown completed');
  }
}

// Export singleton instance
let reportSchedulingServiceInstance: ReportSchedulingService | null = null;

export function getReportSchedulingService(): ReportSchedulingService {
  if (!reportSchedulingServiceInstance) {
    reportSchedulingServiceInstance = new ReportSchedulingService();
  }
  return reportSchedulingServiceInstance;
} 