import { NextResponse } from 'next/server';
import { getAutoReportService } from '@/services/autoReportGenerationService';
import { handleAPIError } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/prisma';
import { 
  logger, 
  generateCorrelationId, 
  trackBusinessEvent,
  trackCorrelation 
} from '@/lib/logger';

export async function POST(request: Request) {
  const correlationId = generateCorrelationId();
  
  const context = {
    endpoint: '/api/reports/schedule',
    method: 'POST',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'schedule_report_request_received', context);
    logger.info('Schedule report request received', context);

    const body = await request.json();
    const { projectId, frequency, template = 'comprehensive', startDate } = body;

    // Enhanced input validation
    if (!projectId || projectId.trim() === '') {
      trackCorrelation(correlationId, 'validation_failed_missing_project_id', context);
      logger.warn('Missing project ID in schedule request', context);
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

    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly'];
    if (!frequency || !validFrequencies.includes(frequency)) {
      trackCorrelation(correlationId, 'validation_failed_invalid_frequency', { ...context, frequency });
      logger.warn('Invalid frequency in schedule request', { ...context, frequency });
      return NextResponse.json(
        { 
          error: `Frequency must be one of: ${validFrequencies.join(', ')}`,
          code: 'INVALID_FREQUENCY',
          retryable: false,
          correlationId
        },
        { status: 400 }
      );
    }

    const validTemplates = ['comprehensive', 'executive', 'technical', 'strategic'];
    if (!validTemplates.includes(template)) {
      trackCorrelation(correlationId, 'validation_failed_invalid_template', { ...context, template });
      logger.warn('Invalid template in schedule request', { ...context, template });
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

    // Validate startDate if provided
    let parsedStartDate;
    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        trackCorrelation(correlationId, 'validation_failed_invalid_start_date', { ...context, startDate });
        logger.warn('Invalid start date in schedule request', { ...context, startDate });
        return NextResponse.json(
          { 
            error: 'Start date must be a valid ISO date string',
            code: 'INVALID_START_DATE',
            retryable: false,
            correlationId
          },
          { status: 400 }
        );
      }
    }

    trackCorrelation(correlationId, 'input_validation_passed', { 
      ...context, 
      projectId, 
      frequency,
      template,
      hasStartDate: !!startDate
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
      logger.warn('Project not found for schedule request', { ...context, projectId });
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

    trackBusinessEvent('report_schedule_requested', {
      ...context,
      projectId,
      projectName: project.name,
      competitorCount: project.competitors.length,
      frequency,
      template
    });

    logger.info('Creating report schedule for project', {
      ...context,
      projectId,
      projectName: project.name,
      frequency,
      template
    });

    // Get auto report service and create schedule
    const autoReportService = getAutoReportService();
    
    const schedule = await autoReportService.schedulePeriodicReports(
      projectId,
      frequency,
      {
        reportTemplate: template,
        startDate: parsedStartDate
      }
    );

    trackBusinessEvent('report_schedule_created', {
      ...context,
      projectId,
      scheduleId: schedule.id,
      frequency,
      nextRunTime: schedule.nextRunTime.toISOString()
    });

    logger.info('Report schedule created successfully', {
      ...context,
      projectId,
      scheduleId: schedule.id,
      nextRunTime: schedule.nextRunTime.toISOString()
    });

    const response = {
      success: true,
      projectId: project.id,
      projectName: project.name,
      schedule: {
        id: schedule.id,
        frequency: schedule.frequency,
        reportTemplate: schedule.reportTemplate,
        nextRunTime: schedule.nextRunTime,
        isActive: schedule.isActive,
        createdAt: schedule.createdAt
      },
      competitorCount: project.competitors.length,
      timestamp: new Date().toISOString(),
      correlationId
    };

    trackCorrelation(correlationId, 'schedule_response_sent', {
      ...context,
      success: true,
      scheduleId: schedule.id
    });

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    trackCorrelation(correlationId, 'unexpected_error_occurred', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Unexpected error in schedule report endpoint', error as Error, context);
    
    const errorResponse = handleAPIError(error as Error, 'schedule_report', context);
    
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

// GET endpoint to retrieve existing schedules
export async function GET(request: Request) {
  const correlationId = generateCorrelationId();
  
  const context = {
    endpoint: '/api/reports/schedule',
    method: 'GET',
    correlationId
  };

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    trackCorrelation(correlationId, 'get_schedules_request_received', context);
    logger.info('Get schedules request received', { ...context, projectId: projectId || 'undefined' });

    if (!projectId) {
      trackCorrelation(correlationId, 'validation_failed_missing_project_id', context);
      logger.warn('Missing project ID in get schedules request', context);
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
      trackCorrelation(correlationId, 'project_not_found', { ...context, projectId });
      logger.warn('Project not found for get schedules request', { ...context, projectId });
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

    // Extract schedule information from project parameters
    const projectParams = project.parameters as any;
    const scheduleInfo = projectParams?.autoReportSchedule || null;

    const response = {
      success: true,
      projectId: project.id,
      projectName: project.name,
      schedule: scheduleInfo,
      timestamp: new Date().toISOString(),
      correlationId
    };

    trackCorrelation(correlationId, 'get_schedules_response_sent', {
      ...context,
      projectId,
      hasSchedule: !!scheduleInfo
    });

    logger.info('Schedules retrieved successfully', {
      ...context,
      projectId,
      hasSchedule: !!scheduleInfo
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    trackCorrelation(correlationId, 'unexpected_error_occurred', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Unexpected error in get schedules endpoint', error as Error, context);
    
    const errorResponse = handleAPIError(error as Error, 'get_schedules', context);
    
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