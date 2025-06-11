import { NextRequest, NextResponse } from 'next/server';
import { ComparativeAnalysisService } from '@/services/analysis/comparativeAnalysisService';
import { ComparativeReportService } from '@/services/reports/comparativeReportService';
import { AnalysisDataService } from '@/services/analysis/analysisDataService';
import { ProductScrapingService } from '@/services/productScrapingService';
import { 
  logger, 
  generateCorrelationId, 
  createCorrelationLogger,
  trackCorrelation 
} from '@/lib/logger';

const analysisService = new ComparativeAnalysisService();
const reportService = new ComparativeReportService();
const dataService = new AnalysisDataService();
const scrapingService = new ProductScrapingService();

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const correlatedLogger = createCorrelationLogger(correlationId);
  
  const context = {
    endpoint: '/api/reports/comparative',
    method: 'POST',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'comparative_report_request_received', context);
    logger.info('Comparative report generation request received', context);

    const body = await request.json();
    const { 
      projectId, 
      reportName, 
      templateType = 'comprehensive',
      triggerScraping = false 
    } = body;

    // Validate required fields
    if (!projectId) {
      trackCorrelation(correlationId, 'comparative_report_validation_failed', { 
        ...context, 
        error: 'Missing projectId' 
      });
      
      return NextResponse.json(
        { 
          error: 'Project ID is required',
          code: 'MISSING_PROJECT_ID',
          correlationId
        },
        { status: 400 }
      );
    }

    const enhancedContext = {
      ...context,
      projectId,
      reportName: reportName || `Comparative Report - ${new Date().toISOString()}`,
      templateType,
      triggerScraping
    };

    trackCorrelation(correlationId, 'comparative_report_generation_started', enhancedContext);

    // Step 1: Trigger scraping if requested
    if (triggerScraping) {
      trackCorrelation(correlationId, 'product_scraping_triggered', enhancedContext);
      logger.info('Triggering product scraping before analysis', enhancedContext);
      
      try {
        await scrapingService.triggerManualProductScraping(projectId);
        trackCorrelation(correlationId, 'product_scraping_completed', enhancedContext);
      } catch (scrapingError) {
        trackCorrelation(correlationId, 'product_scraping_failed', { 
          ...enhancedContext, 
          scrapingError: (scrapingError as Error).message 
        });
        logger.warn('Product scraping failed, continuing with existing data', enhancedContext);
      }
    }

    // Step 2: Prepare analysis data
    trackCorrelation(correlationId, 'analysis_data_preparation_started', enhancedContext);
    logger.info('Preparing analysis data', enhancedContext);

    const analysisInputs = await dataService.prepareProjectAnalysisInputs(projectId);
    
    if (analysisInputs.length === 0) {
      throw new Error('No products found for analysis in this project');
    }

    // Use the first product for analysis (could be enhanced to analyze all products)
    const analysisInput = analysisInputs[0];

    // Step 3: Perform comparative analysis
    trackCorrelation(correlationId, 'comparative_analysis_started', enhancedContext);
    logger.info('Starting comparative analysis', enhancedContext);

    const analysisResult = await analysisService.analyzeProductVsCompetitors(analysisInput);

    trackCorrelation(correlationId, 'comparative_analysis_completed', { 
      ...enhancedContext, 
      analysisId: analysisResult.id,
      confidenceScore: analysisResult.metadata.confidenceScore 
    });

    // Step 3: Generate analysis report (simplified)
    trackCorrelation(correlationId, 'comparative_report_generation_started', { 
      ...enhancedContext, 
      analysisId: analysisResult.id 
    });
    logger.info('Starting comparative report generation', { 
      ...enhancedContext, 
      analysisId: analysisResult.id 
    });

    const reportContent = await analysisService.generateAnalysisReport(analysisResult);

    trackCorrelation(correlationId, 'comparative_report_generated_successfully', { 
      ...enhancedContext, 
      analysisId: analysisResult.id,
      reportSize: reportContent.length 
    });

    logger.info('Comparative report generated successfully', { 
      ...enhancedContext, 
      analysisId: analysisResult.id,
      reportSize: reportContent.length 
    });

    return NextResponse.json({
      success: true,
      data: {
        analysisId: analysisResult.id,
        reportName: enhancedContext.reportName,
        templateType,
        confidenceScore: analysisResult.metadata.confidenceScore,
        generatedAt: new Date().toISOString(),
        reportContent: reportContent,
        metadata: {
          contentLength: reportContent.length,
          analysisMethod: analysisResult.metadata.analysisMethod,
          dataQuality: analysisResult.metadata.dataQuality,
          processingTime: analysisResult.metadata.processingTime
        }
      },
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'comparative_report_generation_failed', { 
      ...context, 
      error: (error as Error).message 
    });
    
    logger.error('Comparative report generation failed', error as Error, context);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    let errorCode = 'COMPARATIVE_REPORT_GENERATION_FAILED';

    if ((error as Error).message.includes('Project not found')) {
      statusCode = 404;
      errorCode = 'PROJECT_NOT_FOUND';
    } else if ((error as Error).message.includes('No product found')) {
      statusCode = 422;
      errorCode = 'NO_PRODUCT_FOUND';
    } else if ((error as Error).message.includes('Insufficient data')) {
      statusCode = 422;
      errorCode = 'INSUFFICIENT_DATA';
    } else if ((error as Error).message.includes('AI service')) {
      statusCode = 503;
      errorCode = 'AI_SERVICE_UNAVAILABLE';
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate comparative report',
        details: (error as Error).message,
        code: errorCode,
        retryable: statusCode >= 500,
        correlationId
      },
      { status: statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  
  const context = {
    endpoint: '/api/reports/comparative',
    method: 'GET',
    correlationId,
    projectId: projectId || undefined
  };

  try {
    trackCorrelation(correlationId, 'comparative_report_status_request_received', context);
    logger.info('Comparative report status request received', context);

    if (!projectId) {
      trackCorrelation(correlationId, 'comparative_report_status_validation_failed', { 
        ...context, 
        error: 'Missing projectId parameter' 
      });
      
      return NextResponse.json(
        { 
          error: 'Project ID is required',
          code: 'MISSING_PROJECT_ID',
          correlationId
        },
        { status: 400 }
      );
    }

    // Get scraping status
    const scrapingStatus = await scrapingService.getProductScrapingStatus(projectId);
    
    // Get recent reports (this would need to be implemented in the report service)
    // For now, return basic status
    const status = {
      projectId,
      scrapingStatus,
      lastAnalysisAt: null, // Would come from analysis service
      reportsGenerated: 0,   // Would come from report service
      nextScheduledRun: null // Would come from scheduler
    };

    trackCorrelation(correlationId, 'comparative_report_status_retrieved', { 
      ...context, 
      hasScrapingData: !!scrapingStatus 
    });

    return NextResponse.json({
      success: true,
      data: status,
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'comparative_report_status_failed', { 
      ...context, 
      error: (error as Error).message 
    });
    
    logger.error('Comparative report status retrieval failed', error as Error, context);
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve comparative report status',
        details: (error as Error).message,
        correlationId
      },
      { status: 500 }
    );
  }
} 