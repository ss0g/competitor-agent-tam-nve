// Service Integration Mocks for Cross-Service Validation

export const createMockAnalysisService = () => ({
  analyzeProductVsCompetitors: jest.fn().mockImplementation(async (input: any) => {
    if (!input.product?.id || !input.product?.name) {
      throw new Error('Invalid analysis input: missing required product data');
    }

    return {
      id: 'analysis-test-id',
      productId: input.product.id,
      projectId: input.product.projectId || 'default-project',
      summary: {
        overallPosition: 'competitive',
        keyStrengths: ['AI-powered analysis', 'Real-time monitoring'],
        keyWeaknesses: ['Mobile app missing', 'API limitations'],
        opportunityScore: 87,
        threatLevel: 'medium'
      },
      detailed: {
        featureComparison: {
          coreFeatures: ['Feature A', 'Feature B'],
          missingFeatures: ['Feature C'],
          competitorAdvantages: ['Better mobile experience']
        },
        marketPosition: 'Strong in enterprise segment',
        competitiveLandscape: 'Crowded but differentiated'
      },
      recommendations: [
        'Develop mobile application',
        'Improve API capabilities',
        'Focus on enterprise features'
      ],
      metadata: {
        analysisMethod: 'ai_powered',
        confidenceScore: 87,
        dataQuality: 'high',
        processingTime: 1500,
        correlationId: `analysis-${Date.now()}`,
        competitorCount: input.competitors?.length || 0,
        inputProductId: input.product.id
      },
      analysisDate: new Date(),
      competitorIds: input.competitors?.map((c: any) => c.competitor?.id) || []
    };
  })
});

export const createMockUXAnalyzer = () => ({
  analyzeProductVsCompetitors: jest.fn().mockImplementation(async (productData: any, competitorData: any[], options: any) => {
    return {
      summary: 'UX analysis shows competitive positioning with room for mobile improvement',
      recommendations: [
        'Improve mobile responsiveness',
        'Enhance user onboarding flow',
        'Optimize navigation structure'
      ],
      confidence: 0.78,
      metadata: {
        correlationId: `ux-analysis-${Date.now()}`,
        analyzedAt: new Date(),
        focusAreas: options.focus ? [options.focus] : ['both'],
        technicalAnalysisIncluded: options.includeTechnical || false,
        accessibilityAnalysisIncluded: options.includeAccessibility || false
      }
    };
  })
});

export const createMockReportService = () => ({
  generateUXEnhancedReport: jest.fn().mockImplementation(async (analysis: any, product: any, productSnapshot: any, competitorSnapshots: any[]) => {
    return {
      report: {
        id: `report-${Date.now()}`,
        analysisId: analysis.id,
        sections: [
          {
            title: 'Executive Summary',
            content: 'Comprehensive analysis of competitive positioning',
            order: 1
          },
          {
            title: 'Feature Comparison',
            content: 'Detailed feature analysis and recommendations',
            order: 2
          }
        ],
        metadata: {
          generatedAt: new Date(),
          template: 'comprehensive',
          correlationId: `report-${Date.now()}`
        }
      },
      generationTime: 1200,
      tokensUsed: 2800,
      cost: 0.0320
    };
  })
});
