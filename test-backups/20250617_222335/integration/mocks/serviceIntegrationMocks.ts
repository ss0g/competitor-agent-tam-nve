// Service Integration Mocks for Cross-Service Validation

interface AnalysisInput {
  product?: { id?: string; name?: string };
  competitors?: unknown[];
  productSnapshot?: { content?: { features?: string[] } };
}

interface UXAnalysisOptions {
  focus?: string;
  includeTechnical?: boolean;
  includeAccessibility?: boolean;
}

export const createMockAnalysisService = () => ({
  analyzeProductVsCompetitors: jest.fn().mockImplementation(async (input: AnalysisInput) => {
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
      competitorIds: input.competitors?.map((c: unknown) => (c as { competitor?: { id?: string } }).competitor?.id) || []
    };
  })
});

export const createMockUXAnalyzer = () => ({
  analyzeProductVsCompetitors: jest.fn().mockImplementation(async (
    _productData: unknown, 
    _competitorData: unknown[], 
    options: UXAnalysisOptions
  ) => {
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
  generateUXEnhancedReport: jest.fn().mockImplementation(async (
    analysis: { id: string }, 
    _product: unknown, 
    _productSnapshot: unknown, 
    _competitorSnapshots: unknown[]
  ) => {
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
