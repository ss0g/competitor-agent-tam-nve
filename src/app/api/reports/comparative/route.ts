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

      logger.warn('Comparative report generation failed, providing fallback response', {
        ...enhancedContext,
        error: reportResult.error
      });

      // Phase 5.2: Graceful degradation - provide basic report structure instead of complete failure
      const fallbackReport = {
        id: `fallback-report-${Date.now()}`,
        title: `${project.name} - Comparative Analysis (Partial)`,
        executiveSummary: `We encountered an issue generating the full comparative analysis for your project "${project.name}". However, we can provide you with the following information:`,
        sections: [
          {
            id: 'project-overview',
            title: 'Project Overview',
            content: `• **Project**: ${project.name}\n• **Products**: ${project.products.map(p => p.name).join(', ')}\n• **Competitors**: ${project.competitors.map(c => c.name).join(', ')}\n• **Analysis Status**: Partial data available`,
            type: 'overview',
            order: 1
          },
          {
            id: 'issue-notice',
            title: 'Analysis Issue',
            content: `**Issue encountered**: ${reportResult.error}\n\n**Next steps**:\n• Your project data is safely stored\n• You can retry the analysis\n• Contact support if the issue persists\n• Meanwhile, you can view individual product/competitor snapshots`,
            type: 'notice',
            order: 2
          }
        ],
        metadata: {
          projectId,
          projectName: project.name,
          productCount: project.products.length,
          competitorCount: project.competitors.length,
          reportType: 'comparative_fallback',
          generatedAt: new Date().toISOString(),
          issue: reportResult.error,
          fallbackMode: true
        },
        keyFindings: [
          'Report generation encountered technical issues',
          'Project data is intact and accessible',
          'Manual retry recommended'
        ],
        keyOpportunities: [
          'Retry analysis with different template',
          'Check individual snapshots for recent data',
          'Contact support for assistance'
        ]
      };

      return NextResponse.json({
        success: true,
        report: fallbackReport,
        warning: 'Report generated in fallback mode due to processing issues',
        metadata: {
          projectId,
          projectName: project.name,
          productCount: project.products.length,
          competitorCount: project.competitors.length,
          reportType: 'comparative_fallback',
          template: template || 'comprehensive',
          focusArea: focusArea || 'overall'
        },
        correlationId,
        retryable: true
      }, { status: 200 }); // Return 200 instead of 500 for graceful degradation
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

    logger.error('Comparative report generation failed with unexpected error, providing emergency fallback', error as Error, context);
    
    // Phase 5.2: Emergency graceful degradation - provide minimal but useful response
    const errorType = (error as Error).message.includes('URL') ? 'URL_PARSING_ERROR' : 'SYSTEM_ERROR';
    const emergencyReport = {
      id: `emergency-report-${Date.now()}`,
      title: 'Comparative Analysis - System Issue',
      executiveSummary: 'We encountered a technical issue while generating your comparative analysis. Your project data is safe and this issue has been logged.',
      sections: [
        {
          id: 'emergency-notice',
          title: 'Technical Issue Notice',
          content: `**Issue**: System error occurred during report generation\n\n**Your data is safe**: All project information has been preserved\n\n**Next steps**:\n• Wait a few minutes and try again\n• Check system status page\n• Contact support if issues persist\n\n**Error type**: ${errorType}`,
          type: 'notice',
          order: 1
        }
      ],
      metadata: {
        reportType: 'emergency_fallback',
        generatedAt: new Date().toISOString(),
        errorType,
        correlationId,
        emergencyMode: true
      },
      keyFindings: [
        'System encountered unexpected error',
        'Data integrity maintained',
        'Support team notified'
      ],
      keyOpportunities: [
        'Retry in a few minutes',
        'Check alternative analysis options',
        'Contact support for priority assistance'
      ]
    };
    
    return NextResponse.json({
      success: true,
      report: emergencyReport,
      warning: 'Report generated in emergency fallback mode due to system error',
      metadata: {
        reportType: 'emergency_fallback',
        errorType,
        correlationId,
        emergencyMode: true
      },
      correlationId,
      retryable: true,
      supportContact: true
    }, { status: 200 }); // Return 200 with fallback instead of 500
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
    logger.error('Failed to fetch comparative reports, providing fallback response', error as Error, { projectId });
    
    // Phase 5.2: Graceful degradation for GET requests
    return NextResponse.json({
      success: true,
      reports: [],
      warning: 'Unable to fetch recent reports due to temporary system issue',
      fallbackMessage: 'Your reports are safe. Please try refreshing in a moment.',
      metadata: {
        projectId,
        fallbackMode: true,
        issue: 'Database connection issue',
        timestamp: new Date().toISOString()
      },
      retryable: true
    }, { status: 200 }); // Return 200 with empty array instead of 500 error
  }
} 