import { NextRequest, NextResponse } from 'next/server';
import { ReportGenerator } from '@/lib/reports';
import { handleAPIError } from '@/lib/utils/errorHandler';
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
    endpoint: '/api/reports/generate',
    method: 'POST',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'report_generation_request_received', context);
    logger.info('Report generation request received', context);

    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitorId');
    const timeframe = parseInt(searchParams.get('timeframe') || '30', 10);

    // Enhanced input validation with detailed logging
    if (!competitorId || competitorId.trim() === '') {
      trackCorrelation(correlationId, 'validation_failed_missing_competitor_id', context);
      logger.warn('Missing competitor ID in request', context);
      return NextResponse.json(
        { 
          error: 'Competitor ID is required',
          code: 'MISSING_COMPETITOR_ID',
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
      competitorId, 
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

    const { changeLog, reportOptions, reportName, projectId } = requestBody;

    // Enhanced context for logging
    const enhancedContext = {
      ...context,
      competitorId,
      timeframe,
      hasChangeLog: !!changeLog,
      reportOptions: reportOptions || 'default',
      reportName: reportName || 'unnamed',
      projectId: projectId || 'unknown'
    };

    trackReportFlow('initialization', {
      ...enhancedContext,
      stepStatus: 'started',
      stepData: { competitorId, timeframe, reportName, projectId }
    });

    logger.info('Starting report generation', enhancedContext);

    // Initialize generator and generate report with enhanced error handling
    const generator = new ReportGenerator();
    
    trackReportFlow('generator_initialized', {
      ...enhancedContext,
      stepStatus: 'completed'
    });

    const report = await generator.generateReport(competitorId, timeframe, {
      changeLog,
      reportName,
      projectId,
      reportOptions: {
        fallbackToSimpleReport: true, // Always enable fallbacks for API
        maxRetries: 3,
        retryDelay: 1000,
        ...reportOptions
      }
    });

    // Check if report generation failed
    if (report.error) {
      trackReportFlow('generation_failed', {
        ...enhancedContext,
        stepStatus: 'failed',
        stepData: { error: report.error, validationErrors: report.validationErrors }
      });

      trackCorrelation(correlationId, 'report_generation_failed', { 
        ...enhancedContext, 
        error: report.error,
        validationErrors: report.validationErrors
      });

      logger.warn('Report generation failed', { 
        ...enhancedContext, 
        error: report.error,
        validationErrors: report.validationErrors
      });

      // Determine appropriate status code based on error type
      let statusCode = 500;
      let errorCode = 'REPORT_GENERATION_FAILED';

      if (report.error.includes('credentials')) {
        statusCode = 503;
        errorCode = 'AWS_CREDENTIALS_ERROR';
      } else if (report.error.includes('rate limit')) {
        statusCode = 429;
        errorCode = 'RATE_LIMIT_EXCEEDED';
      } else if (report.error.includes('not found')) {
        statusCode = 404;
        errorCode = 'COMPETITOR_NOT_FOUND';
      } else if (report.error.includes('No data available')) {
        statusCode = 422;
        errorCode = 'INSUFFICIENT_DATA';
      }

      return NextResponse.json({
        error: report.error,
        code: errorCode,
        validationErrors: report.validationErrors,
        retryable: statusCode >= 500 || statusCode === 429,
        retryAfter: statusCode === 429 ? 300 : 60,
        timestamp: new Date().toISOString(),
        correlationId
      }, { status: statusCode });
    }

    trackReportFlow('generation_completed', {
      ...enhancedContext,
      stepStatus: 'completed',
      stepData: { 
        reportTitle: report.data?.title || 'unknown',
        sectionsCount: report.data?.sections?.length || 0
      }
    });

    trackCorrelation(correlationId, 'report_generation_completed_successfully', {
      ...enhancedContext,
      reportTitle: report.data?.title || 'unknown'
    });

    logger.info('Report generation completed successfully', enhancedContext);

    return NextResponse.json({
      success: true,
      data: report.data,
      timestamp: new Date().toISOString(),
      correlationId
    });

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

    logger.error('Unexpected error in report generation endpoint', error as Error, context);
    
    const errorResponse = handleAPIError(error as Error, 'report_generation', context);
    
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