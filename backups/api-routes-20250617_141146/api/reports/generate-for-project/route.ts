import { NextResponse } from 'next/server';
import { ReportGenerator } from '@/lib/reports';
import { handleAPIError } from '@/lib/utils/errorHandler';
import { prisma } from '@/lib/prisma';
import { 
  logger, 
  generateCorrelationId, 
  createCorrelationLogger,
  trackReportFlow,
  trackCorrelation 
} from '@/lib/logger';

export async function POST(request: Request) {
  // Generate correlation ID for end-to-end tracking
  const correlationId = generateCorrelationId();
  const correlatedLogger = createCorrelationLogger(correlationId);
  
  const context = {
    endpoint: '/api/reports/generate-for-project',
    method: 'POST',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'project_report_generation_request_received', context);
    logger.info('Project report generation request received', context);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const timeframe = parseInt(searchParams.get('timeframe') || '30', 10);

    // Enhanced input validation with detailed logging
    if (!projectId || projectId.trim() === '') {
      trackCorrelation(correlationId, 'validation_failed_missing_project_id', context);
      logger.warn('Missing project ID in request', context);
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

    if (isNaN(timeframe) || timeframe <= 0 || timeframe > 365) {
      trackCorrelation(correlationId, 'validation_failed_invalid_timeframe', { ...context, timeframe });
      logger.warn('Invalid timeframe in request', { ...context, timeframe });
      return NextResponse.json(
        { 
          error: 'Timeframe must be a number between 1 and 365 days',
          code: 'INVALID_TIMEFRAME',
          retryable: false,
          correlationId
        },
        { status: 400 }
      );
    }

    trackCorrelation(correlationId, 'input_validation_passed', { 
      ...context, 
      projectId, 
      timeframe 
    });

    // Parse request body for additional options
    let requestBody: any = {};
    try {
      requestBody = await request.json();
      trackCorrelation(correlationId, 'request_body_parsed', { 
        ...context, 
        hasBody: true,
        bodyKeys: Object.keys(requestBody)
      });
    } catch (jsonError) {
      trackCorrelation(correlationId, 'request_body_empty', context);
      logger.debug('No valid JSON body provided, using defaults', context);
    }

    const { reportOptions, reportName } = requestBody;

    // Enhanced context for logging
    const enhancedContext = {
      ...context,
      projectId,
      timeframe,
      reportOptions: reportOptions || 'default',
      reportName: reportName || 'unnamed'
    };

    trackReportFlow('project_initialization', {
      ...enhancedContext,
      stepStatus: 'started',
      stepData: { projectId, timeframe, reportName }
    });

    logger.info('Starting project report generation', enhancedContext);

    // Get project with all competitors
    trackReportFlow('project_data_fetch', { ...enhancedContext, stepStatus: 'started' });
    logger.debug('Fetching project data with competitors', enhancedContext);
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        competitors: {
          select: {
            id: true,
            name: true,
            website: true
          }
        }
      }
    });

    if (!project) {
      trackReportFlow('project_data_fetch', {
        ...enhancedContext,
        stepStatus: 'failed',
        stepData: { error: 'Project not found' }
      });
      logger.warn('Project not found', enhancedContext);
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
      trackReportFlow('project_data_fetch', {
        ...enhancedContext,
        stepStatus: 'failed',
        stepData: { error: 'No competitors assigned to project' }
      });
      logger.warn('No competitors assigned to project', enhancedContext);
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

    trackReportFlow('project_data_fetch', {
      ...enhancedContext,
      stepStatus: 'completed',
      stepData: { 
        projectName: project.name,
        competitorCount: project.competitors.length,
        competitorNames: project.competitors.map(c => c.name)
      }
    });

    logger.info(`Found project "${project.name}" with ${project.competitors.length} competitors`, {
      ...enhancedContext,
      competitorNames: project.competitors.map(c => c.name)
    });

    // Initialize generator
    const generator = new ReportGenerator();
    
    trackReportFlow('generator_initialized', {
      ...enhancedContext,
      stepStatus: 'completed'
    });

    // Generate reports for all competitors
    const reportResults = [];
    const errors = [];

    for (const competitor of project.competitors) {
      const competitorContext = {
        ...enhancedContext,
        competitorId: competitor.id,
        competitorName: competitor.name
      };

      try {
        trackReportFlow('competitor_report_generation', {
          ...competitorContext,
          stepStatus: 'started',
          stepData: { competitorId: competitor.id, competitorName: competitor.name }
        });

        logger.info(`Generating report for competitor: ${competitor.name}`, competitorContext);

        const report = await generator.generateReport(competitor.id, timeframe, {
          reportName: reportName ? `${reportName} - ${competitor.name}` : `${project.name} - ${competitor.name}`,
          projectId: project.id,
          reportOptions: {
            fallbackToSimpleReport: true,
            maxRetries: 3,
            retryDelay: 1000,
            ...reportOptions
          }
        });

        if (report.error) {
          trackReportFlow('competitor_report_generation', {
            ...competitorContext,
            stepStatus: 'failed',
            stepData: { error: report.error, validationErrors: report.validationErrors }
          });

          logger.warn(`Report generation failed for competitor ${competitor.name}`, {
            ...competitorContext,
            error: report.error,
            validationErrors: report.validationErrors
          });

          errors.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            error: report.error,
            validationErrors: report.validationErrors
          });
        } else {
          trackReportFlow('competitor_report_generation', {
            ...competitorContext,
            stepStatus: 'completed',
            stepData: { 
              reportTitle: report.data?.title || 'unknown',
              sectionsCount: report.data?.sections?.length || 0
            }
          });

          logger.info(`Report generated successfully for competitor: ${competitor.name}`, competitorContext);

          reportResults.push({
            competitorId: competitor.id,
            competitorName: competitor.name,
            report: report.data,
            success: true
          });
        }
      } catch (error) {
        trackReportFlow('competitor_report_generation', {
          ...competitorContext,
          stepStatus: 'failed',
          stepData: { errorMessage: (error as Error).message }
        });

        logger.error(`Unexpected error generating report for competitor ${competitor.name}`, error as Error, competitorContext);

        errors.push({
          competitorId: competitor.id,
          competitorName: competitor.name,
          error: (error as Error).message
        });
      }
    }

    trackReportFlow('project_generation_completed', {
      ...enhancedContext,
      stepStatus: 'completed',
      stepData: { 
        successfulReports: reportResults.length,
        failedReports: errors.length,
        totalCompetitors: project.competitors.length
      }
    });

    trackCorrelation(correlationId, 'project_report_generation_completed', {
      ...enhancedContext,
      successfulReports: reportResults.length,
      failedReports: errors.length
    });

    logger.info('Project report generation completed', {
      ...enhancedContext,
      successfulReports: reportResults.length,
      failedReports: errors.length
    });

    // Determine response status
    let status = 200;
    if (errors.length > 0 && reportResults.length === 0) {
      status = 500; // All failed
    } else if (errors.length > 0) {
      status = 207; // Partial success
    }

    return NextResponse.json({
      success: reportResults.length > 0,
      projectId: project.id,
      projectName: project.name,
      totalCompetitors: project.competitors.length,
      successfulReports: reportResults.length,
      failedReports: errors.length,
      reports: reportResults,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      correlationId
    }, { status });

  } catch (error) {
    trackReportFlow('unexpected_error', {
      ...context,
      stepStatus: 'failed',
      stepData: { errorMessage: (error as Error).message }
    });

    trackCorrelation(correlationId, 'unexpected_error_occurred', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Unexpected error in project report generation endpoint', error as Error, context);
    
    const errorResponse = handleAPIError(error as Error, 'project_report_generation', context);
    
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