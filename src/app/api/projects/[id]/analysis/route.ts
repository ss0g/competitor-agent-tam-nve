import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ComparativeAnalysisService } from '@/services/analysis/comparativeAnalysisService';
import { 
  logger, 
  generateCorrelationId, 
  trackDatabaseOperation,
  trackCorrelation,
  trackError 
} from '@/lib/logger';

// POST /api/projects/[id]/analysis
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const context = {
    endpoint: `/api/projects/${params.id}/analysis`,
    method: 'POST',
    correlationId,
    projectId: params.id
  };

  try {
    trackCorrelation(correlationId, 'project_analysis_request_received', context);
    logger.info('Project analysis request received', context);

    // Validate project ID
    if (!params.id || params.id.length < 1) {
      trackCorrelation(correlationId, 'invalid_project_id', context);
      logger.warn('Invalid project ID provided', context);
      return NextResponse.json({ 
        error: 'Invalid project ID',
        correlationId 
      }, { status: 400 });
    }

    // Get project with competitors and product information
    trackDatabaseOperation('findUnique', 'project', {
      ...context,
      query: 'fetch project with competitors and product'
    });

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        competitors: {
          include: {
            snapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        products: {
          include: {
            snapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    } as any);

    if (!project) {
      trackCorrelation(correlationId, 'project_not_found', context);
      logger.warn('Project not found', context);
      return NextResponse.json({ 
        error: 'Project not found',
        correlationId 
      }, { status: 404 });
    }

    // Check if we have sufficient data for analysis
    if (!project.products || project.products.length === 0 || !project.products[0].snapshots || project.products[0].snapshots.length === 0) {
      trackCorrelation(correlationId, 'no_product_snapshots', context);
      logger.warn('No product snapshots found for analysis', context);
      return NextResponse.json({ 
        error: 'No product snapshots available for analysis',
        message: 'Product snapshots are required to generate analysis. Please ensure the project has been scraped.',
        correlationId 
      }, { status: 400 });
    }

    if (!project.competitors || project.competitors.length === 0) {
      trackCorrelation(correlationId, 'no_competitors', context);
      logger.warn('No competitors found for analysis', context);
      return NextResponse.json({ 
        error: 'No competitors found for analysis',
        message: 'At least one competitor is required to generate comparative analysis.',
        correlationId 
      }, { status: 400 });
    }

    // Check for competitor snapshots
    const competitorsWithSnapshots = project.competitors.filter(
      competitor => competitor.snapshots && competitor.snapshots.length > 0
    );

    if (competitorsWithSnapshots.length === 0) {
      trackCorrelation(correlationId, 'no_competitor_snapshots', context);
      logger.warn('No competitor snapshots found for analysis', context);
      return NextResponse.json({ 
        error: 'No competitor snapshots available for analysis',
        message: 'Competitor snapshots are required to generate analysis. Please ensure competitors have been scraped.',
        correlationId 
      }, { status: 400 });
    }

    trackCorrelation(correlationId, 'analysis_data_validated', {
      ...context,
      competitorsCount: competitorsWithSnapshots.length,
      hasProductSnapshot: true
    });

    // Prepare analysis input
    const analysisInput = {
      product: {
        id: project.id,
        name: project.name,
        description: project.description || ''
      },
      productSnapshot: {
        content: project.products[0].snapshots[0].content,
        metadata: project.products[0].snapshots[0].metadata
      },
      competitors: competitorsWithSnapshots.map(competitor => ({
        competitor: {
          id: competitor.id,
          name: competitor.name,
          website: competitor.website || '',
          description: competitor.description || ''
        },
        snapshot: {
          content: competitor.snapshots[0].content,
          metadata: competitor.snapshots[0].metadata
        }
      })),
      analysisConfig: {
        focusAreas: ['features', 'positioning', 'user_experience', 'customer_targeting'],
        depth: 'detailed',
        includeRecommendations: true
      }
    };

    trackCorrelation(correlationId, 'analysis_input_prepared', {
      ...context,
      inputSize: JSON.stringify(analysisInput).length
    });

    // Initialize analysis service and generate analysis
    const analysisService = new ComparativeAnalysisService();
    
    logger.info('Starting comparative analysis generation', {
      ...context,
      competitorsCount: competitorsWithSnapshots.length
    });

    const analysis = await analysisService.analyzeProductVsCompetitors(analysisInput);

    trackCorrelation(correlationId, 'analysis_generated_successfully', {
      ...context,
      analysisId: analysis.id,
      processingTime: analysis.metadata.processingTime,
      confidenceScore: analysis.metadata.confidenceScore
    });

    // Generate the report text
    const reportContent = await analysisService.generateAnalysisReport(analysis);

    trackCorrelation(correlationId, 'analysis_report_generated', {
      ...context,
      analysisId: analysis.id,
      reportLength: reportContent.length
    });

    logger.info('Project analysis completed successfully', {
      ...context,
      analysisId: analysis.id,
      processingTime: analysis.metadata.processingTime,
      reportLength: reportContent.length
    });

    return NextResponse.json({
      analysis,
      reportContent,
      correlationId
    });

  } catch (error) {
    trackCorrelation(correlationId, 'analysis_generation_error', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to generate project analysis', error as Error, context);
    trackError(error as Error, 'project_analysis', context);

    return NextResponse.json({ 
      error: 'Failed to generate analysis',
      message: (error as Error).message,
      correlationId 
    }, { status: 500 });
  }
}

// GET /api/projects/[id]/analysis - Get existing analysis for project
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const context = {
    endpoint: `/api/projects/${params.id}/analysis`,
    method: 'GET',
    correlationId,
    projectId: params.id
  };

  try {
    trackCorrelation(correlationId, 'get_analysis_request_received', context);
    logger.info('Get analysis request received', context);

    // For now, return a placeholder response since we don't have analysis storage yet
    // This would typically query stored analyses from the database
    
    return NextResponse.json({
      message: 'Analysis history retrieval not yet implemented',
      suggestion: 'Use POST to generate new analysis',
      correlationId
    }, { status: 200 });

  } catch (error) {
    trackCorrelation(correlationId, 'get_analysis_error', {
      ...context,
      errorMessage: (error as Error).message
    });

    logger.error('Failed to retrieve analysis', error as Error, context);
    trackError(error as Error, 'get_analysis', context);

    return NextResponse.json({ 
      error: 'Failed to retrieve analysis',
      correlationId 
    }, { status: 500 });
  }
} 