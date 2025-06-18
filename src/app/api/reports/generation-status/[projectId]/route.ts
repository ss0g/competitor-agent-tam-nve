import { NextRequest, NextResponse } from 'next/server';
import { getAutoReportService } from '@/services/autoReportGenerationService';
import { handleAPIError } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/prisma';
import { 
  logger, 
  generateCorrelationId, 
  trackCorrelation 
} from '@/lib/logger';
import Bull from 'bull';

// NEW: Interface for comparative queue status
interface ComparativeQueueStatus {
  isGenerating: boolean;
  queuePosition: number;
  estimatedCompletion: Date | null;
  activeTasks: number;
  completedToday: number;
  failedToday: number;
  averageProcessingTime: number;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  const correlationId = generateCorrelationId();
  
  const logContext = {
    endpoint: '/api/reports/generation-status/[projectId]',
    method: 'GET',
    projectId: (await context.params).projectId,
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'generation_status_request_received', logContext);
    logger.info('Generation status request received', logContext);

    const { projectId } = await context.params;

    // Input validation
    if (!projectId || projectId.trim() === '') {
      trackCorrelation(correlationId, 'validation_failed_missing_project_id', logContext);
      logger.warn('Missing project ID in generation status request', logContext);
      return NextResponse.json(
        { 
          error: 'Project ID is required',
          code: 'MISSING_PROJECT_ID',
          retryable: false,
          correlationId
        },
        { status: 400 }
      );
    }

    trackCorrelation(correlationId, 'input_validation_passed', { ...logContext, projectId });

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { 
        id: true, 
        name: true,
        parameters: true
      }
    });

    if (!project) {
      trackCorrelation(correlationId, 'project_not_found', { ...logContext, projectId });
      logger.warn('Project not found for generation status request', { ...logContext, projectId });
      return NextResponse.json(
        { 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND',
          retryable: false,
          correlationId
        },
        { status: 404 }
      );
    }

    logger.info('Retrieving generation status for project', {
      ...logContext,
      projectName: project.name
    });

    // Get auto report service and check status
    const autoReportService = getAutoReportService();
    const queueStatus = await autoReportService.getQueueStatus(projectId);

    // NEW: Get comparative report queue status
    const comparativeQueueStatus = await getComparativeQueueStatus(projectId);

    // Get recent reports count
    const recentReportsCount = await prisma.report.count({
      where: { 
        competitorId: {
          in: await prisma.competitor.findMany({
            where: {
              projects: {
                some: {
                  id: projectId
                }
              }
            },
            select: { id: true }
          }).then(competitors => competitors.map(c => c.id))
        }
      }
    });

    // NEW: Get comparative reports count
    const comparativeReportsCount = await prisma.report.count({
      where: {
        projectId,
        // Filter by report name patterns that indicate comparative reports
        OR: [
          {
            name: {
              contains: 'Competitive Analysis',
              mode: 'insensitive'
            }
          },
          {
            name: {
              contains: 'vs',
              mode: 'insensitive'
            }
          }
        ]
      }
    });

    // Extract schedule information from project parameters
    const projectParams = project.parameters as any;
    const scheduleInfo = projectParams?.autoReportSchedule || null;

    const response = {
      success: true,
      projectId: project.id,
      projectName: project.name,
      generationStatus: {
        isGenerating: queueStatus.isGenerating,
        queuePosition: queueStatus.queuePosition,
        estimatedCompletion: queueStatus.estimatedCompletion,
        lastGenerated: queueStatus.lastGenerated,
        nextScheduled: queueStatus.nextScheduled
      },
      // NEW: Comparative report queue status
      comparativeQueueStatus: {
        isGenerating: comparativeQueueStatus.isGenerating,
        queuePosition: comparativeQueueStatus.queuePosition,
        estimatedCompletion: comparativeQueueStatus.estimatedCompletion,
        activeTasks: comparativeQueueStatus.activeTasks,
        completedToday: comparativeQueueStatus.completedToday,
        failedToday: comparativeQueueStatus.failedToday,
        averageProcessingTime: comparativeQueueStatus.averageProcessingTime
      },
      reports: {
        individual: recentReportsCount,
        comparative: comparativeReportsCount,
        total: recentReportsCount + comparativeReportsCount
      },
      schedule: scheduleInfo ? {
        frequency: scheduleInfo.frequency,
        nextRunTime: scheduleInfo.nextRunTime,
        lastExecuted: scheduleInfo.lastExecuted,
        isActive: scheduleInfo.isActive,
        reportTemplate: scheduleInfo.reportTemplate
      } : null,
      timestamp: new Date().toISOString(),
      correlationId
    };

    trackCorrelation(correlationId, 'generation_status_response_sent', {
      ...logContext,
      isGenerating: queueStatus.isGenerating,
      queuePosition: queueStatus.queuePosition,
      recentReportsCount,
      comparativeReportsCount,
      hasSchedule: !!scheduleInfo
    });

    logger.info('Generation status retrieved successfully', {
      ...logContext,
      isGenerating: queueStatus.isGenerating,
      queuePosition: queueStatus.queuePosition,
      recentReportsCount,
      comparativeReportsCount
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    trackCorrelation(correlationId, 'unexpected_error_occurred', {
      ...logContext,
      errorMessage: (error as Error).message
    });

    logger.error('Unexpected error in generation status endpoint', error as Error, logContext);
    
    const errorResponse = handleAPIError(error as Error, 'generation_status', logContext);
    
    // Add correlation ID to error response
    if (errorResponse instanceof NextResponse) {
      const body = await errorResponse.json();
      return NextResponse.json({
        ...body,
        correlationId
      }, { status: errorResponse.status });
    }
    
    return errorResponse;
  }
}

/**
 * NEW: Get comprehensive status of comparative report queue
 */
async function getComparativeQueueStatus(projectId: string): Promise<ComparativeQueueStatus> {
  try {
    // Connect to the comparative report queue
    const comparativeQueue = new Bull('comparative-report-generation', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    // Get queue metrics
    const [active, waiting, completed, failed] = await Promise.all([
      comparativeQueue.getActive(),
      comparativeQueue.getWaiting(),
      comparativeQueue.getCompleted(),
      comparativeQueue.getFailed()
    ]);

    // Check if current project has active/waiting tasks
    const projectTasks = [...active, ...waiting].filter(job => 
      job.data.projectId === projectId
    );

    const isGenerating = projectTasks.length > 0;
    const queuePosition = waiting.findIndex(job => job.data.projectId === projectId) + 1;

    // Calculate today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completedToday = completed.filter(job => 
      new Date(job.finishedOn || 0) >= today
    ).length;
    
    const failedToday = failed.filter(job => 
      new Date(job.finishedOn || 0) >= today
    ).length;

    // Calculate average processing time from recent completed jobs
    const recentCompleted = completed.slice(-10); // Last 10 jobs
    const processingTimes = recentCompleted
      .filter(job => job.finishedOn && job.processedOn)
      .map(job => (job.finishedOn! - job.processedOn!));
    
    const averageProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    // Estimate completion time for current project
    let estimatedCompletion: Date | null = null;
    if (isGenerating && queuePosition > 0) {
      const estimatedMs = queuePosition * (averageProcessingTime || 120000); // Default 2 min
      estimatedCompletion = new Date(Date.now() + estimatedMs);
    }

    // Close the queue connection
    await comparativeQueue.close();

    return {
      isGenerating,
      queuePosition: queuePosition > 0 ? queuePosition : 0,
      estimatedCompletion,
      activeTasks: active.length,
      completedToday,
      failedToday,
      averageProcessingTime: Math.round(averageProcessingTime / 1000) // Convert to seconds
    };

  } catch (error) {
    logger.error('Failed to get comparative queue status', error as Error, { projectId });
    
    // Return default status on error
    return {
      isGenerating: false,
      queuePosition: 0,
      estimatedCompletion: null,
      activeTasks: 0,
      completedToday: 0,
      failedToday: 0,
      averageProcessingTime: 0
    };
  }
} 