import { NextRequest, NextResponse } from 'next/server';
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
    endpoint: '/api/reports/comparative',
    method: 'POST',
    correlationId
  };

  try {
    trackCorrelation(correlationId, 'comparative_report_generation_request_received', context);
    logger.info('Comparative report generation request received', context);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

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

    const { reportOptions, reportName, template, focusArea, includeRecommendations } = requestBody;

    // Enhanced context for logging
    const enhancedContext = {
      ...context,
      projectId,
      reportOptions: reportOptions || 'default',
      reportName: reportName || 'unnamed',
      template: template || 'comprehensive',
      focusArea: focusArea || 'overall'
    };

    trackReportFlow('comparative_report_initialization', {
      ...enhancedContext,
      stepStatus: 'started',
      stepData: { projectId, reportName, template, focusArea }
    });

    logger.info('Starting comparative report generation', enhancedContext);

    // Validate project exists and has required data
    trackReportFlow('project_validation', { ...enhancedContext, stepStatus: 'started' });
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        products: {
          include: {
            snapshots: {
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        },
        competitors: {
          include: {
            snapshots: {
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        }
      }
    });

    if (!project) {
      trackReportFlow('project_validation', {
        ...enhancedContext,
        stepStatus: 'failed',
        stepData: { error: 'Project not found' }
      });
      logger.warn('Project not found for comparative report', enhancedContext);
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

    if (!project.products || project.products.length === 0) {
      trackReportFlow('project_validation', {
        ...enhancedContext,
        stepStatus: 'failed',
        stepData: { error: 'No product found in project' }
      });
      logger.warn('No product found in project for comparative analysis', enhancedContext);
      return NextResponse.json(
        { 
          error: 'Project must have a product for comparative analysis',
          code: 'NO_PRODUCT_FOUND',
          retryable: false,
          correlationId
        },
        { status: 422 }
      );
    }

    if (!project.competitors || project.competitors.length === 0) {
      trackReportFlow('project_validation', {
        ...enhancedContext,
        stepStatus: 'failed',
        stepData: { error: 'No competitors found in project' }
      });
      logger.warn('No competitors found in project for comparative analysis', enhancedContext);
      return NextResponse.json(
        { 
          error: 'Project must have competitors for comparative analysis',
          code: 'NO_COMPETITORS_FOUND',
          retryable: false,
          correlationId
        },
        { status: 422 }
      );
    }

    trackReportFlow('project_validation', {
      ...enhancedContext,
      stepStatus: 'completed',
      stepData: { 
        projectName: project.name,
        productCount: project.products.length,
        competitorCount: project.competitors.length
      }
    });

    logger.info(`Found project "${project.name}" with ${project.products.length} products and ${project.competitors.length} competitors`, {
      ...enhancedContext,
      productNames: project.products.map(p => p.name),
      competitorNames: project.competitors.map(c => c.name)
    });

    // Initialize generator and generate comparative report
    const generator = new ReportGenerator();
    
    trackReportFlow('comparative_report_generation', {
      ...enhancedContext,
      stepStatus: 'started'
    });

    // Generate single comparative report
    const reportResult = await generator.generateComparativeReport(projectId, {
      reportName: reportName || `${project.name} - Comparative Analysis`,
      template: template || 'comprehensive',
      focusArea: focusArea || 'overall',
      includeRecommendations: includeRecommendations !== false,
      userId: 'chat-system' // Will be replaced with actual user ID from auth
    });

    if (reportResult.error) {
      trackReportFlow('comparative_report_generation', {
        ...enhancedContext,
        stepStatus: 'failed',
        stepData: { error: reportResult.error }
      });

      logger.warn('Comparative report generation failed', {
        ...enhancedContext,
        error: reportResult.error
      });

      return NextResponse.json(
        { 
          error: reportResult.error,
          code: 'REPORT_GENERATION_FAILED',
          retryable: true,
          correlationId
        },
        { status: 500 }
      );
    }

    trackReportFlow('comparative_report_generation', {
      ...enhancedContext,
      stepStatus: 'completed',
      stepData: { 
        reportTitle: reportResult.data?.title || 'unknown',
        sectionsCount: reportResult.data?.sections?.length || 0
      }
    });

    logger.info('Comparative report generated successfully', {
      ...enhancedContext,
      reportTitle: reportResult.data?.title,
      sectionsCount: reportResult.data?.sections?.length
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      report: reportResult.data,
      metadata: {
        projectId,
        projectName: project.name,
        productCount: project.products.length,
        competitorCount: project.competitors.length,
        reportType: 'comparative',
        template: template || 'comprehensive',
        focusArea: focusArea || 'overall'
      },
      correlationId
    });

  } catch (error) {
    trackReportFlow('comparative_report_error', {
      ...context,
      stepStatus: 'failed',
      stepData: { error: (error as Error).message }
    });

    logger.error('Comparative report generation failed with unexpected error', error as Error, context);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate comparative report',
        details: (error as Error).message,
        code: 'COMPARATIVE_REPORT_GENERATION_FAILED',
        retryable: true,
        correlationId
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get recent comparative reports for the project
    const reports = await prisma.report.findMany({
      where: { 
        projectId,
        reportType: 'COMPARATIVE'
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    return NextResponse.json({
      success: true,
      reports: reports.map(report => ({
        id: report.id,
        name: report.name,
        title: report.title,
        status: report.status,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        latestVersion: report.versions[0] || null
      }))
    });

  } catch (error) {
    logger.error('Failed to fetch comparative reports', error as Error, { projectId });
    return NextResponse.json(
      { error: 'Failed to fetch comparative reports' },
      { status: 500 }
    );
  }
} 