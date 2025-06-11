import { NextResponse } from 'next/server';
import { getAutoReportService } from '@/services/autoReportGenerationService';
import { handleAPIError } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/prisma';
import { 
  logger, 
  generateCorrelationId, 
  createCorrelationLogger,
  trackBusinessEvent,
  trackCorrelation 
} from '@/lib/logger';

export async function POST(request: Request) {
  const correlationId = generateCorrelationId();
  const correlatedLogger = createCorrelationLogger(correlationId);
  
  const context = {
    endpoint: '/api/reports/auto-generate',
    method: 'POST',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'auto_report_generation_request_received', context);
    logger.info('Auto report generation request received', context);

    const body = await request.json();
    const { projectId, immediate = true, template = 'comprehensive', notify = true } = body;

    // Enhanced input validation
    if (!projectId || projectId.trim() === '') {
      trackCorrelation(correlationId, 'validation_failed_missing_project_id', context);
      logger.warn('Missing project ID in auto-generate request', context);
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

    const validTemplates = ['comprehensive', 'executive', 'technical', 'strategic'];
    if (!validTemplates.includes(template)) {
      trackCorrelation(correlationId, 'validation_failed_invalid_template', { ...context, template });
      logger.warn('Invalid report template in request', { ...context, template });
      return NextResponse.json(
        { 
          error: `Template must be one of: ${validTemplates.join(', ')}`,
          code: 'INVALID_TEMPLATE',
          retryable: false,
          correlationId
        },
        { status: 400 }
      );
    }

    trackCorrelation(correlationId, 'input_validation_passed', { 
      ...context, 
      projectId, 
      template,
      immediate,
      notify
    });

    // Verify project exists and has competitors
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        competitors: {
          select: { id: true, name: true }
        }
      }
    });

    if (!project) {
      trackCorrelation(correlationId, 'project_not_found', { ...context, projectId });
      logger.warn('Project not found for auto-generate request', { ...context, projectId });
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

    if (!project.competitors || project.competitors.length === 0) {
      trackCorrelation(correlationId, 'no_competitors_assigned', { ...context, projectId });
      logger.warn('No competitors assigned to project', { ...context, projectId });
      return NextResponse.json(
        { 
          error: 'No competitors assigned to project',
          code: 'NO_COMPETITORS_ASSIGNED',
          retryable: false,
          correlationId
        },
        { status: 422 }
      );
    }

    trackBusinessEvent('auto_report_manual_trigger_requested', {
      ...context,
      projectId,
      projectName: project.name,
      competitorCount: project.competitors.length,
      template,
      immediate
    });

    logger.info('Starting auto report generation', {
      ...context,
      projectId,
      projectName: project.name,
      competitorCount: project.competitors.length,
      template
    });

    // Get auto report service and generate report
    const autoReportService = getAutoReportService();
    
    if (immediate) {
      // Generate initial report with high priority
      const reportTask = await autoReportService.generateInitialReport(projectId, {
        reportTemplate: template,
        reportName: `Manual Report - ${project.name}`,
        priority: 'high'
      });

      trackBusinessEvent('auto_report_task_queued', {
        ...context,
        projectId,
        taskId: reportTask.taskId,
        queuePosition: reportTask.queuePosition
      });

      logger.info('Auto report generation task queued', {
        ...context,
        projectId,
        taskId: reportTask.taskId,
        queuePosition: reportTask.queuePosition
      });

      // Get current queue status
      const queueStatus = await autoReportService.getQueueStatus(projectId);

      const response = {
        success: true,
        projectId: project.id,
        projectName: project.name,
        taskId: reportTask.taskId,
        queuePosition: reportTask.queuePosition,
        estimatedCompletion: new Date(Date.now() + (reportTask.queuePosition * 120000)), // 2 min per report
        competitorCount: project.competitors.length,
        template,
        queueStatus,
        timestamp: new Date().toISOString(),
        correlationId
      };

      trackCorrelation(correlationId, 'auto_report_generation_response_sent', {
        ...context,
        success: true,
        taskId: reportTask.taskId
      });

      return NextResponse.json(response, { status: 200 });
    } else {
      // Just check current status without generating new report
      const queueStatus = await autoReportService.getQueueStatus(projectId);

      const response = {
        success: true,
        projectId: project.id,
        projectName: project.name,
        queueStatus,
        message: 'Queue status retrieved without generating new report',
        timestamp: new Date().toISOString(),
        correlationId
      };

      trackCorrelation(correlationId, 'queue_status_retrieved', {
        ...context,
        projectId,
        isGenerating: queueStatus.isGenerating
      });

      return NextResponse.json(response, { status: 200 });
    }

  } catch (error) {
    trackCorrelation(correlationId, 'unexpected_error_occurred', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Unexpected error in auto report generation endpoint', error as Error, context);
    
    const errorResponse = handleAPIError(error as Error, 'auto_report_generation', context);
    
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