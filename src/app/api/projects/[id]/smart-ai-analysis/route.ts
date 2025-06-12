/**
 * Smart AI Analysis API - Phase AI-1 Implementation
 * REST endpoint for Claude AI integration with Smart Scheduling
 * 
 * Features:
 * - Fresh data-guaranteed AI analysis
 * - Smart scheduling integration
 * - Enhanced context with freshness metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, generateCorrelationId, trackErrorWithCorrelation } from '@/lib/logger';
import { smartAIService, SmartAIAnalysisRequest } from '@/services/smartAIService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const projectId = params.id;
  const context = { projectId, correlationId, operation: 'smartAIAnalysis', endpoint: 'POST' };

  try {
    logger.info('Smart AI analysis API called', context);

    const body = await request.json();
    const {
      analysisType = 'comprehensive',
      forceFreshData = false,
      dataCutoff,
      context: additionalContext
    } = body;

    // Validate analysis type
    const validTypes = ['competitive', 'trend', 'comprehensive'];
    if (!validTypes.includes(analysisType)) {
      return NextResponse.json({
        error: 'Invalid analysis type',
        validTypes,
        correlationId
      }, { status: 400 });
    }

    // Build analysis request
    const analysisRequest: SmartAIAnalysisRequest = {
      projectId,
      analysisType,
      forceFreshData,
      dataCutoff: dataCutoff ? new Date(dataCutoff) : undefined,
      context: additionalContext
    };

    // Execute smart AI analysis
    const result = await smartAIService.analyzeWithSmartScheduling(analysisRequest);

    logger.info('Smart AI analysis completed successfully', {
      ...context,
      analysisType,
      dataFreshGuaranteed: result.analysisMetadata.dataFreshGuaranteed,
      scrapingTriggered: result.analysisMetadata.scrapingTriggered,
      analysisLength: result.analysis.length
    });

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      dataFreshness: result.dataFreshness,
      metadata: result.analysisMetadata,
      recommendations: result.recommendations,
      correlationId
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'smartAIAnalysis-POST',
      correlationId,
      {
        ...context,
        service: 'SmartAIAnalysisAPI'
      }
    );

    logger.error('Smart AI analysis failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to generate smart AI analysis',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const projectId = params.id;
  const context = { projectId, correlationId, operation: 'smartAIStatus', endpoint: 'GET' };

  try {
    logger.info('Smart AI status check called', context);

    // Get project AI configuration and freshness status
    const smartScheduler = smartAIService['smartScheduler'];
    const freshnessStatus = await smartScheduler.getFreshnessStatus(projectId);

    // Check if project has AI analysis configured
    const project = await smartAIService['prisma'] || require('@/lib/prisma').default;
    const projectData = await project.project.findUnique({
      where: { id: projectId },
      select: { description: true, name: true, status: true }
    });

    if (!projectData) {
      return NextResponse.json({
        error: 'Project not found',
        correlationId
      }, { status: 404 });
    }

    // Try to parse AI configuration from description
    let aiConfig = null;
    try {
      const parsedDescription = JSON.parse(projectData.description || '{}');
      aiConfig = parsedDescription.aiAnalysisConfig || null;
    } catch {
      // Description is not JSON, that's okay
    }

    const response = {
      success: true,
      projectId,
      projectName: projectData.name,
      projectStatus: projectData.status,
      dataFreshness: freshnessStatus,
      aiAnalysisEnabled: !!aiConfig,
      aiConfiguration: aiConfig,
      smartSchedulingAvailable: true,
      recommendations: [
        ...(freshnessStatus.overallStatus !== 'FRESH' ? 
          ['Consider running analysis with forceFreshData=true for most current insights'] : []),
        ...(freshnessStatus.recommendedActions || [])
      ],
      correlationId
    };

    logger.info('Smart AI status retrieved', {
      ...context,
      freshnessStatus: freshnessStatus.overallStatus,
      aiEnabled: !!aiConfig
    });

    return NextResponse.json(response);

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'smartAIStatus-GET',
      correlationId,
      {
        ...context,
        service: 'SmartAIAnalysisAPI'
      }
    );

    logger.error('Smart AI status check failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to get smart AI status',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 