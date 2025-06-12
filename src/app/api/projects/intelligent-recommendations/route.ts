/**
 * Intelligent Project Recommendations API - Phase AI-2 Implementation
 * REST endpoint for smart project configuration and automated workflow setup
 * 
 * Features:
 * - Industry-specific configuration recommendations
 * - Automated competitive intelligence workflow setup
 * - Smart project onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, generateCorrelationId, trackErrorWithCorrelation } from '@/lib/logger';
import { 
  intelligentProjectService, 
  ProjectIntelligenceRequest 
} from '@/services/intelligentProjectService';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const context = { correlationId, operation: 'intelligentRecommendations', endpoint: 'POST' };

  try {
    logger.info('Intelligent project recommendations API called', context);

    const body: ProjectIntelligenceRequest = await request.json();

    // Validate request
    if (!body.industry && !body.productWebsite && !body.businessStage) {
      return NextResponse.json({
        error: 'At least one parameter (industry, productWebsite, or businessStage) is required',
        correlationId
      }, { status: 400 });
    }

    // Generate intelligent recommendations
    const recommendations = await intelligentProjectService.generateProjectRecommendations(body);

    logger.info('Intelligent recommendations generated successfully', {
      ...context,
      industry: body.industry,
      businessStage: body.businessStage,
      competitorCount: body.competitorCount,
      aiFrequency: recommendations.aiAnalysisConfig.frequency,
      monitoringIntensity: recommendations.monitoringIntensity
    });

    return NextResponse.json({
      success: true,
      recommendations,
      metadata: {
        correlationId,
        generatedAt: new Date().toISOString(),
        inputParameters: body
      }
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'intelligentRecommendations-POST',
      correlationId,
      {
        ...context,
        service: 'IntelligentProjectRecommendationsAPI'
      }
    );

    logger.error('Intelligent recommendations failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to generate intelligent recommendations',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Setup automated workflow for existing project
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const context = { correlationId, operation: 'setupAutomatedWorkflow', endpoint: 'PUT' };

  try {
    logger.info('Automated workflow setup API called', context);

    const body = await request.json();
    const { projectId, recommendations } = body;

    if (!projectId || !recommendations) {
      return NextResponse.json({
        error: 'Both projectId and recommendations are required',
        correlationId
      }, { status: 400 });
    }

    // Setup automated workflow
    const workflowSetup = await intelligentProjectService.setupAutomatedWorkflow(
      projectId,
      recommendations
    );

    logger.info('Automated workflow setup completed', {
      ...context,
      projectId,
      workflowId: workflowSetup.workflowId,
      setupComplete: workflowSetup.setupComplete,
      componentsConfigured: workflowSetup.componentsConfigured
    });

    return NextResponse.json({
      success: true,
      workflow: workflowSetup,
      metadata: {
        correlationId,
        setupAt: new Date().toISOString(),
        projectId
      }
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'setupAutomatedWorkflow-PUT',
      correlationId,
      {
        ...context,
        service: 'IntelligentProjectRecommendationsAPI'
      }
    );

    logger.error('Automated workflow setup failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to setup automated workflow',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get example recommendations for different scenarios
export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const context = { correlationId, operation: 'getExampleRecommendations', endpoint: 'GET' };

  try {
    logger.info('Example recommendations API called', context);

    const examples = {
      technology_startup: {
        industry: 'technology',
        businessStage: 'startup',
        competitorCount: 5,
        analysisGoals: ['competitive_positioning', 'feature_comparison']
      },
      retail_growth: {
        industry: 'retail',
        businessStage: 'growth',
        competitorCount: 12,
        analysisGoals: ['pricing_analysis', 'market_trends']
      },
      healthcare_enterprise: {
        industry: 'healthcare',
        businessStage: 'enterprise',
        competitorCount: 8,
        analysisGoals: ['competitive_positioning', 'market_trends']
      },
      finance_mature: {
        industry: 'finance',
        businessStage: 'mature',
        competitorCount: 15,
        analysisGoals: ['pricing_analysis', 'competitive_positioning']
      }
    };

    // Generate recommendations for each example
    const exampleRecommendations: Record<string, any> = {};
    
    for (const [key, params] of Object.entries(examples)) {
      try {
        const recommendation = await intelligentProjectService.generateProjectRecommendations(params);
        exampleRecommendations[key] = {
          parameters: params,
          recommendations: recommendation
        };
      } catch (error) {
        logger.warn(`Failed to generate example recommendation for ${key}`, {
          ...context,
          exampleKey: key,
          error: (error as Error).message
        });
        exampleRecommendations[key] = {
          parameters: params,
          error: 'Failed to generate recommendation'
        };
      }
    }

    logger.info('Example recommendations generated', {
      ...context,
      exampleCount: Object.keys(exampleRecommendations).length
    });

    return NextResponse.json({
      success: true,
      examples: exampleRecommendations,
      metadata: {
        correlationId,
        generatedAt: new Date().toISOString(),
        availableScenarios: Object.keys(examples)
      }
    });

  } catch (error) {
    trackErrorWithCorrelation(
      error as Error,
      'getExampleRecommendations-GET',
      correlationId,
      {
        ...context,
        service: 'IntelligentProjectRecommendationsAPI'
      }
    );

    logger.error('Example recommendations failed', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      error: 'Failed to generate example recommendations',
      correlationId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 