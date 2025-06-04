import { NextResponse } from 'next/server';
import { ReportGenerator } from '@/lib/reports';
import { handleAPIError } from '@/lib/utils/errorHandler';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const context = {
    endpoint: '/api/reports/generate',
    method: 'POST'
  };

  try {
    logger.info('Report generation request received', context);

    const { searchParams } = new URL(request.url);
    const competitorId = searchParams.get('competitorId');
    const timeframe = parseInt(searchParams.get('timeframe') || '30', 10);

    // Enhanced input validation
    if (!competitorId || competitorId.trim() === '') {
      logger.warn('Missing competitor ID in request', context);
      return NextResponse.json(
        { 
          error: 'Competitor ID is required',
          code: 'MISSING_COMPETITOR_ID',
          retryable: false
        },
        { status: 400 }
      );
    }

    if (isNaN(timeframe) || timeframe <= 0 || timeframe > 365) {
      logger.warn('Invalid timeframe in request', { ...context, timeframe });
      return NextResponse.json(
        { 
          error: 'Timeframe must be a number between 1 and 365 days',
          code: 'INVALID_TIMEFRAME',
          retryable: false
        },
        { status: 400 }
      );
    }

    // Parse request body for additional options
    let requestBody: any = {};
    try {
      requestBody = await request.json();
    } catch (jsonError) {
      logger.debug('No valid JSON body provided, using defaults', context);
    }

    const { changeLog, reportOptions } = requestBody;

    // Enhanced context for logging
    const enhancedContext = {
      ...context,
      competitorId,
      timeframe,
      hasChangeLog: !!changeLog,
      reportOptions: reportOptions || 'default'
    };

    logger.info('Starting report generation', enhancedContext);

    // Initialize generator and generate report with enhanced error handling
    const generator = new ReportGenerator();
    const report = await generator.generateReport(competitorId, timeframe, {
      changeLog,
      reportOptions: {
        fallbackToSimpleReport: true, // Always enable fallbacks for API
        maxRetries: 3,
        retryDelay: 1000,
        ...reportOptions
      }
    });

    // Check if report generation failed
    if (report.error) {
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
        timestamp: new Date().toISOString()
      }, { status: statusCode });
    }

    logger.info('Report generation completed successfully', enhancedContext);

    return NextResponse.json({
      success: true,
      data: report.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Unexpected error in report generation endpoint', error as Error, context);
    return handleAPIError(error as Error, 'report_generation', context);
  }
} 