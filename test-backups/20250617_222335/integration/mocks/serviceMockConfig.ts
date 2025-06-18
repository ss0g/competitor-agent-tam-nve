import { 
  ComparativeAnalysis
} from '@/types/analysis';
import { 
  ComparativeReport,
  ReportGenerationResult,
  REPORT_TEMPLATES 
} from '@/types/comparativeReport';

/**
 * Integration Service Mocks - Consistent mock responses across all integration tests
 * Ensures predictable service interaction patterns and data flow validation
 */
export const IntegrationServiceMocks = {
  
  // Standardized analysis response format
  analysisResponse: {
    id: 'mock-analysis-id',
    projectId: 'mock-project-id',
    productId: 'mock-product-id',
    competitorIds: ['competitor-1', 'competitor-2'],
    analysisDate: new Date(),
    summary: {
      overallPosition: 'competitive' as const,
      keyStrengths: ['AI-powered analysis', 'Real-time monitoring', 'Automated reporting'],
      keyWeaknesses: ['Mobile app missing', 'Limited API integrations'],
      opportunityScore: 87,
      threatLevel: 'medium' as const
    },
    detailed: {
      featureComparison: {
        productFeatures: ['AI Analysis', 'Real-time Monitoring', 'Report Generation'],
        competitorFeatures: [
          {
            competitorId: 'competitor-1',
            competitorName: 'MarketScope Analytics',
            features: ['Market Research', 'Analytics Dashboard', 'Report Export']
          }
        ],
        uniqueToProduct: ['AI-powered competitor analysis', 'Real-time market monitoring'],
        uniqueToCompetitors: ['Mobile app', 'API integrations'],
        commonFeatures: ['Dashboard analytics', 'Report generation'],
        featureGaps: ['Mobile app', 'API integrations'],
        innovationScore: 82
      },
      positioningAnalysis: {
        productPositioning: {
          primaryMessage: 'AI-first competitive intelligence platform',
          valueProposition: 'Advanced automation and real-time insights capability',
          targetAudience: 'B2B SaaS companies, strategy teams',
          differentiators: ['AI-powered analysis', 'Real-time monitoring']
        },
        competitorPositioning: [
          {
            competitorId: 'competitor-1',
            competitorName: 'MarketScope Analytics',
            primaryMessage: 'Comprehensive market research platform',
            valueProposition: 'Deep market insights for enterprise customers',
            targetAudience: 'Enterprise customers, market research teams',
            differentiators: ['Enterprise focus', 'Comprehensive data']
          }
        ],
        positioningGaps: ['Mobile-first positioning', 'SMB market focus'],
        marketOpportunities: ['Automated insights', 'Predictive analytics'],
        messagingEffectiveness: 85
      },
      userExperienceComparison: {
        productUX: {
          designQuality: 85,
          usabilityScore: 82,
          navigationStructure: 'Modern sidebar navigation',
          keyUserFlows: ['Analysis creation', 'Report generation', 'Dashboard navigation'],
          loadTime: 1200
        },
        competitorUX: [
          {
            competitorId: 'competitor-1',
            competitorName: 'MarketScope Analytics',
            designQuality: 75,
            usabilityScore: 78,
            navigationStructure: 'Traditional menu navigation',
            keyUserFlows: ['Market research', 'Data analysis', 'Report export'],
            loadTime: 1800
          }
        ],
        uxStrengths: ['Intuitive navigation', 'Responsive design', 'Clean interface'],
        uxWeaknesses: ['Mobile optimization', 'Onboarding complexity'],
        uxRecommendations: ['Improve mobile UX', 'Streamline onboarding']
      },
      customerTargeting: {
        productTargeting: {
          primarySegments: ['B2B SaaS', 'Strategy Teams'],
          customerTypes: ['Product Managers', 'Strategy Directors'],
          useCases: ['Competitive Analysis', 'Market Intelligence']
        },
        competitorTargeting: [
          {
            competitorId: 'competitor-1',
            competitorName: 'MarketScope Analytics',
            primarySegments: ['Enterprise', 'Market Research'],
            customerTypes: ['Market Researchers', 'Business Analysts'],
            useCases: ['Market Research', 'Industry Analysis']
          }
        ],
        targetingOverlap: ['Enterprise customers', 'Market research teams'],
        untappedSegments: ['SMB market', 'Consulting firms'],
        competitiveAdvantage: ['AI automation', 'Real-time insights']
      }
    },
    recommendations: {
      immediate: ['Enhance AI Analysis Capabilities', 'Improve mobile interface'],
      shortTerm: ['Develop API integrations', 'Expand market coverage'],
      longTerm: ['AI-powered predictive analytics', 'Enterprise platform'],
      priorityScore: 85
    },
    metadata: {
      analysisMethod: 'ai_powered' as const,
      modelUsed: 'anthropic.claude-3-sonnet-20240229-v1:0',
      confidenceScore: 87,
      processingTime: 1500,
      dataQuality: 'high' as const
    }
  },

  // Analysis execution response
  analysisExecutionResponse: {
    success: true,
    analysisId: 'mock-execution-analysis-id',
    results: {
      completed: true,
      processingStages: ['validation', 'analysis', 'recommendation'],
      stageResults: {
        validation: { passed: true, warnings: [] },
        analysis: { completedSections: 5, confidence: 0.87 },
        recommendation: { generated: 2, prioritized: true }
      }
    },
    performance: {
      totalTime: 1500,
      tokensUsed: 2500,
      cost: 0.025
    }
  },

  // Bedrock service mock response
  bedrockResponse: {
    success: true,
    content: 'Mock AI-generated analysis content with detailed competitive insights...',
    metadata: {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      requestId: 'mock-bedrock-request-id',
      tokensUsed: 2500,
      cost: 0.025,
      latency: 1200
    },
    tokensUsed: 2500,
    cost: 0.025
  },

  // Standardized report response format
  reportResponse: {
    report: {
      id: 'mock-report-id',
      title: 'Competitive Analysis Report',
      description: 'Comprehensive competitive analysis for product positioning',
      projectId: 'mock-project-id',
      productId: 'mock-product-id',
      analysisId: 'mock-analysis-id',
      metadata: {
        productName: 'AI Research Platform',
        productUrl: 'https://ai-research-platform.com',
        competitorCount: 2,
        analysisDate: new Date(),
        reportGeneratedAt: new Date(),
        analysisId: 'mock-analysis-id',
        analysisMethod: 'ai_powered' as const,
        confidenceScore: 87,
        dataQuality: 'high' as const,
        reportVersion: '1.0.0',
        focusAreas: ['features', 'positioning', 'user_experience'],
        analysisDepth: 'comprehensive' as const
      },
      sections: [
        {
          id: 'executive-summary',
          title: 'Executive Summary',
          content: 'Mock executive summary content with key findings...',
          type: 'executive_summary' as const,
          order: 1
        },
        {
          id: 'competitive-landscape',
          title: 'Competitive Landscape',
          content: 'Mock competitive landscape analysis...',
          type: 'feature_comparison' as const,
          order: 2
        },
        {
          id: 'positioning-analysis',
          title: 'Market Positioning',
          content: 'Mock positioning analysis and recommendations...',
          type: 'positioning_analysis' as const,
          order: 3
        },
        {
          id: 'recommendations',
          title: 'Strategic Recommendations',
          content: 'Mock strategic recommendations with priorities...',
          type: 'recommendations' as const,
          order: 4
        }
      ],
      executiveSummary: 'Product demonstrates strong competitive position with AI-powered capabilities...',
      keyFindings: [
        'Strong differentiation through AI-powered analysis',
        'Competitive advantage in real-time monitoring',
        'Opportunity gaps in mobile and API integration'
      ],
      strategicRecommendations: {
        immediate: ['Enhance AI capabilities', 'Improve mobile interface'],
        shortTerm: ['Develop API integrations', 'Expand market coverage'],
        longTerm: ['AI-powered predictive analytics', 'Enterprise platform'],
        priorityScore: 85
      },
      competitiveIntelligence: {
        marketPosition: 'Strong competitor with AI-first approach',
        keyThreats: ['Established enterprise competitors', 'Traditional market leaders'],
        opportunities: ['SMB market expansion', 'AI automation trend'],
        competitiveAdvantages: ['AI-powered analysis', 'Real-time insights', 'Modern UX']
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'completed' as const,
      format: 'markdown' as const
    },
    generationTime: 1800,
    tokensUsed: 3000,
    cost: 0.035,
    warnings: [],
    errors: []
  },

  // UX Analysis response
  uxAnalysisResponse: {
    summary: 'The product demonstrates strong UX principles with intuitive navigation and clean interface design. Key strengths include responsive design and accessibility features, while areas for improvement focus on mobile optimization and user onboarding flow.',
    strengths: [
      'Intuitive dashboard navigation with clear information hierarchy',
      'Responsive design that works well across device sizes',
      'Good use of white space and visual hierarchy',
      'Accessible color contrast and keyboard navigation support'
    ],
    weaknesses: [
      'Mobile interface could benefit from simplified navigation',
      'User onboarding flow is lengthy and complex',
      'Some advanced features lack proper tooltips or help text',
      'Loading states could be more informative and engaging'
    ],
    recommendations: [
      {
        category: 'navigation',
        priority: 'high' as const,
        title: 'Optimize Mobile Navigation',
        description: 'Implement collapsible menu and touch-friendly interface elements',
        rationale: 'Growing mobile usage requires better mobile UX',
        estimatedImpact: 'high' as const,
        timeframe: 'medium' as const
      },
      {
        category: 'onboarding',
        priority: 'medium' as const,
        title: 'Streamline User Onboarding',
        description: 'Reduce onboarding steps and add progressive disclosure',
        rationale: 'Shorter onboarding improves user activation rates',
        estimatedImpact: 'medium' as const,
        timeframe: 'short' as const
      }
    ],
    confidence: 82,
    metadata: {
      correlationId: 'ux-analysis-correlation',
      analyzedAt: new Date().toISOString(),
      analysisType: 'comprehensive',
      focus: 'both',
      technicalFactors: true,
      accessibilityFactors: true
    }
  },

  // UX-enhanced report response
  uxReportResponse: {
    report: {
      id: 'mock-ux-report-id',
      title: 'UX-Enhanced Competitive Analysis Report',
      description: 'User experience focused competitive analysis',
      projectId: 'mock-project-id',
      productId: 'mock-product-id',
      analysisId: 'mock-analysis-id',
      metadata: {
        productName: 'AI Research Platform',
        productUrl: 'https://ai-research-platform.com',
        competitorCount: 2,
        analysisDate: new Date(),
        reportGeneratedAt: new Date(),
        analysisId: 'mock-analysis-id',
        analysisMethod: 'ai_powered' as const,
        confidenceScore: 85,
        dataQuality: 'high' as const,
        reportVersion: '1.0.0',
        focusAreas: ['user_experience', 'usability'],
        analysisDepth: 'comprehensive' as const
      },
      sections: [
        {
          id: 'ux-executive-summary',
          title: 'UX Executive Summary',
          content: 'Mock UX-focused executive summary...',
          type: 'executive_summary' as const,
          order: 1
        },
        {
          id: 'user-experience-comparison',
          title: 'User Experience Comparison',
          content: 'Mock detailed UX comparison between products...',
          type: 'ux_comparison' as const,
          order: 2
        }
      ],
      executiveSummary: 'UX analysis reveals strong design principles with improvement opportunities...',
      keyFindings: ['Strong navigation design', 'Mobile optimization needed', 'Accessibility compliant'],
      strategicRecommendations: {
        immediate: ['Optimize mobile navigation'],
        shortTerm: ['Streamline onboarding'],
        longTerm: ['Advanced UX personalization'],
        priorityScore: 78
      },
      competitiveIntelligence: {
        marketPosition: 'Leading UX design with modern interface',
        keyThreats: ['Mobile-first competitors'],
        opportunities: ['UX-driven differentiation'],
        competitiveAdvantages: ['Clean interface', 'Responsive design']
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'completed' as const,
      format: 'markdown' as const
    },
    generationTime: 2000,
    tokensUsed: 3500,
    cost: 0.042,
    warnings: [],
    errors: []
  },

  // Template response
  templateResponse: [
    {
      id: 'comprehensive',
      name: 'Comprehensive Analysis',
      description: 'Full competitive analysis with all sections',
      sectionTemplates: [],
      defaultFormat: 'markdown' as const,
      focusAreas: ['features', 'positioning', 'user_experience'],
      analysisDepth: 'comprehensive' as const
    },
    {
      id: 'executive',
      name: 'Executive Summary',
      description: 'High-level competitive analysis for executives',
      sectionTemplates: [],
      defaultFormat: 'markdown' as const,
      focusAreas: ['positioning', 'customer_targeting'],
      analysisDepth: 'basic' as const
    }
  ],

  // Product scraping response
  scrapingResponse: {
    success: true,
    data: {
      title: 'Mock Product Title',
      description: 'Mock product description with key features and benefits...',
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      pricing: 'Starting at $29/month',
      content: 'Mock scraped content with detailed product information...'
    },
    metadata: {
      url: 'https://mock-product.com',
      scrapedAt: new Date().toISOString(),
      statusCode: 200,
      contentLength: 2500,
      scrapingDuration: 1500
    }
  },

  // Competitor scraping response
  competitorScrapingResponse: {
    success: true,
    data: {
      title: 'Mock Competitor Product',
      description: 'Mock competitor description and positioning...',
      features: ['Competitor Feature 1', 'Competitor Feature 2'],
      pricing: 'From $39/month',
      content: 'Mock competitor content with market positioning...'
    },
    metadata: {
      url: 'https://mock-competitor.com',
      scrapedAt: new Date().toISOString(),
      statusCode: 200,
      contentLength: 2200,
      scrapingDuration: 1200
    }
  },

  // Focused UX analysis response
  focusedUXAnalysisResponse: {
    summary: 'Focused UX analysis reveals specific strengths in the targeted area with clear improvement opportunities.',
    findings: {
      primaryFocus: 'Mock focused findings for the specified area',
      secondaryInsights: ['Mock insight 1', 'Mock insight 2'],
      competitiveComparison: 'Mock comparison specific to focus area'
    },
    confidence: 78,
    metadata: {
      correlationId: 'focused-ux-correlation',
      analyzedAt: new Date().toISOString(),
      focusArea: 'mock-focus',
      analysisDepth: 'focused'
    }
  },

  // UX report generation response
  uxReportGenerationResponse: {
    reportId: 'mock-ux-generated-report-id',
    sections: [
      {
        title: 'UX Summary',
        content: 'Mock UX summary content',
        type: 'summary'
      },
      {
        title: 'UX Recommendations',
        content: 'Mock UX recommendations',
        type: 'recommendations'
      }
    ],
    metadata: {
      generatedAt: new Date().toISOString(),
      basedOnAnalysis: true,
      reportType: 'ux-focused'
    }
  }
}; 