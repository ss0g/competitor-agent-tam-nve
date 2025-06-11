/**
 * Standardized Report Task Types for Phase 2.1
 * This addresses the "Task Result Interface" gap item by providing
 * consistent interfaces across all report generation services
 */

export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ReportType = 'individual' | 'comparative' | 'scheduled' | 'event-driven' | 'manual';

export interface BaseTaskResult {
  taskId: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  correlationId: string;
}

export interface TaskMetadata {
  service: string;
  operation: string;
  version: string;
  environment: string;
  requestedBy?: string;
  priority: TaskPriority;
  retryCount: number;
  maxRetries: number;
  tags?: string[];
}

export interface TaskProgress {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  stepDescription?: string;
  percentage: number;
  estimatedTimeRemaining?: number; // milliseconds
}

export interface TaskError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  isRecoverable: boolean;
  suggestedAction?: string;
  retryAfter?: number; // milliseconds
  affectedResources?: string[];
}

export interface TaskTiming {
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  processingTime?: number; // milliseconds
  queueTime?: number; // milliseconds
  estimatedCompletion?: Date;
  queuePosition?: number;
}

// Standardized ReportTaskResult interface
export interface ReportTaskResult extends BaseTaskResult {
  reportType: ReportType;
  projectId: string;
  metadata: TaskMetadata;
  timing: TaskTiming;
  progress?: TaskProgress;
  error?: TaskError;
  result?: ReportTaskSuccess;
}

export interface ReportTaskSuccess {
  reportId?: string;
  reportContent?: string;
  reportUrl?: string;
  filesGenerated?: string[];
  metrics: {
    contentLength: number;
    sectionsCount: number;
    confidenceScore: number;
    processingTimeMs: number;
    tokenUsage?: number;
    cost?: number;
  };
  warnings?: string[];
}

// Specific task types for different report generation scenarios

export interface IndividualReportTaskResult extends ReportTaskResult {
  reportType: 'individual';
  competitorId: string;
  competitorName: string;
}

export interface ComparativeReportTaskResult extends ReportTaskResult {
  reportType: 'comparative';
  productId: string;
  competitorIds: string[];
  comparisons: {
    totalCompetitors: number;
    successfulComparisons: number;
    failedComparisons: number;
    partialComparisons: number;
  };
}

export interface ScheduledReportTaskResult extends ReportTaskResult {
  reportType: 'scheduled';
  scheduleId: string;
  frequency: string;
  nextExecution?: Date;
}

// Queue status interfaces
export interface QueueStatus {
  queueName: string;
  isHealthy: boolean;
  metrics: {
    activeJobs: number;
    waitingJobs: number;
    completedJobs: number;
    failedJobs: number;
    delayedJobs: number;
  };
  performance: {
    averageProcessingTime: number; // milliseconds
    throughputPerMinute: number;
    successRate: number; // percentage
    lastProcessedAt?: Date;
  };
  errors: {
    recentErrors: TaskError[];
    errorRate: number; // percentage
    criticalErrors: number;
  };
}

export interface ProjectQueueStatus {
  projectId: string;
  projectName: string;
  queues: {
    individual: QueueStatus;
    comparative: QueueStatus;
    scheduled: QueueStatus;
  };
  activeTasks: ReportTaskResult[];
  recentTasks: ReportTaskResult[];
  nextScheduledTask?: Date;
}

// Factory functions for creating standardized task results

export function createTaskResult(
  taskId: string,
  reportType: ReportType,
  projectId: string,
  correlationId: string,
  metadata: Partial<TaskMetadata> = {}
): ReportTaskResult {
  const now = new Date();
  
  return {
    taskId,
    status: 'queued',
    reportType,
    projectId,
    correlationId,
    createdAt: now,
    updatedAt: now,
    metadata: {
      service: metadata.service || 'report-service',
      operation: metadata.operation || 'generate-report',
      version: metadata.version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      requestedBy: metadata.requestedBy,
      priority: metadata.priority || 'normal',
      retryCount: metadata.retryCount || 0,
      maxRetries: metadata.maxRetries || 3,
      tags: metadata.tags || []
    },
    timing: {
      queuedAt: now,
      queuePosition: 1
    }
  };
}

export function updateTaskProgress(
  task: ReportTaskResult,
  progress: Partial<TaskProgress>
): ReportTaskResult {
  return {
    ...task,
    status: 'processing',
    updatedAt: new Date(),
    progress: {
      ...task.progress,
      ...progress
    } as TaskProgress,
    timing: {
      ...task.timing,
      startedAt: task.timing.startedAt || new Date()
    }
  };
}

export function completeTask(
  task: ReportTaskResult,
  result: ReportTaskSuccess
): ReportTaskResult {
  const now = new Date();
  const processingTime = task.timing.startedAt ? 
    now.getTime() - task.timing.startedAt.getTime() : 0;
  
  return {
    ...task,
    status: 'completed',
    updatedAt: now,
    result,
    timing: {
      ...task.timing,
      completedAt: now,
      processingTime
    }
  };
}

export function failTask(
  task: ReportTaskResult,
  error: Partial<TaskError>
): ReportTaskResult {
  const now = new Date();
  
  return {
    ...task,
    status: 'failed',
    updatedAt: now,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: error.details,
      timestamp: now,
      isRecoverable: error.isRecoverable ?? false,
      suggestedAction: error.suggestedAction,
      retryAfter: error.retryAfter,
      affectedResources: error.affectedResources
    },
    timing: {
      ...task.timing,
      completedAt: now
    }
  };
}

// Validation functions
export function validateTaskResult(task: any): task is ReportTaskResult {
  return (
    typeof task === 'object' &&
    typeof task.taskId === 'string' &&
    typeof task.status === 'string' &&
    typeof task.reportType === 'string' &&
    typeof task.projectId === 'string' &&
    typeof task.correlationId === 'string' &&
    task.createdAt instanceof Date &&
    task.updatedAt instanceof Date &&
    typeof task.metadata === 'object' &&
    typeof task.timing === 'object'
  );
}

export function isTaskComplete(task: ReportTaskResult): boolean {
  return task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled';
}

export function canRetryTask(task: ReportTaskResult): boolean {
  return (
    task.status === 'failed' &&
    task.error?.isRecoverable === true &&
    task.metadata.retryCount < task.metadata.maxRetries
  );
}

// Utility functions for task management
export function calculateEstimatedCompletion(
  queuePosition: number,
  averageProcessingTime: number
): Date {
  const estimatedMs = queuePosition * averageProcessingTime;
  return new Date(Date.now() + estimatedMs);
}

export function calculateProgress(currentStep: number, totalSteps: number): number {
  return Math.round((currentStep / totalSteps) * 100);
}

export function formatTaskDuration(task: ReportTaskResult): string {
  if (!task.timing.processingTime) {
    return 'N/A';
  }
  
  const seconds = Math.round(task.timing.processingTime / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function getTaskPriorityWeight(priority: TaskPriority): number {
  switch (priority) {
    case 'urgent': return 10;
    case 'high': return 7;
    case 'normal': return 5;
    case 'low': return 1;
    default: return 5;
  }
} 