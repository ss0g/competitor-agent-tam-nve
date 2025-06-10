import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ComparativeReportService } from '@/services/reports/comparativeReportService';
import { BedrockService } from '@/services/bedrock/bedrock.service';
import { 
  ComparativeAnalysis, 
  AnalysisConfiguration,
  AnalysisFocusArea 
} from '@/types/analysis';
import { Product, ProductSnapshot } from '@/types/product';
import { 
  ReportGenerationOptions, 
  REPORT_TEMPLATES,
  ComparativeReportError,
  ReportGenerationError 
} from '@/types/comparativeReport';

// Mock BedrockService
jest.mock('@/services/bedrock/bedrockService');
const MockedBedrockService = BedrockService as jest.MockedClass<typeof BedrockService>;

describe('ComparativeReportService', () => {
  let service: ComparativeReportService;
  let mockBedrockService: jest.Mocked<BedrockService>;

  // Sample test data
  const sampleProduct: Product = {
    id: 'test-product-id',
    name: 'Test Product',
    website: 'https://testproduct.com',
    positioning: 'AI-powered productivity solution',
    customerData: 'B2B SaaS customers looking to improve efficiency',
    userProblem: 'Manual processes are time-consuming and error-prone',
    industry: 'Software',
    projectId: 'test-project-id',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const sampleProductSnapshot: ProductSnapshot = {
    id: 'test-snapshot-id',
    productId: 'test-product-id',
    content: {
      title: 'Test Product - Productivity Platform',
      text: 'Revolutionary AI-powered platform that transforms business productivity through intelligent automation. ' + 'A'.repeat(2500),
      html: '<h1>Test Product</h1><p>AI-powered platform...</p>',
      description: 'AI productivity platform for business automation'
    },
    metadata: {
      url: 'https://testproduct.com',
      statusCode: 200,
      contentLength: 2500,
      lastModified: '2024-01-01',
      headers: {}
    },
    createdAt: new Date('2024-01-01')
  };

  const sampleAnalysis: ComparativeAnalysis = {
    id: 'test-analysis-id',
    summary: {
      overallPosition: 'competitive',
      keyStrengths: ['Strong AI capabilities', 'User-friendly interface', 'Comprehensive automation'],
      keyWeaknesses: ['Limited market presence', 'Higher price point'],
      opportunityScore: 85,
      threatLevel: 'low'
    },
    detailed: {
      featureComparison: {
        productFeatures: ['AI-powered automation', 'Real-time analytics', 'Custom workflows'],
        competitorFeatures: [
          {
            competitorId: 'competitor-a-id',
            competitorName: 'Competitor A',
            features: ['Basic automation', 'Standard analytics', 'Templates']
          },
          {
            competitorId: 'competitor-b-id',
            competitorName: 'Competitor B',
            features: ['Advanced workflows', 'Custom reporting', 'API integration']
          }
        ],
        uniqueToProduct: ['AI-powered insights', 'Predictive automation'],
        uniqueToCompetitors: ['Advanced API features', 'Mobile optimization'],
        commonFeatures: ['Automation', 'Analytics', 'Workflows'],
        featureGaps: ['Advanced API features', 'Mobile optimization'],
        innovationScore: 88
      },
      positioningAnalysis: {
        productPositioning: {
          primaryMessage: 'AI-First Productivity Revolution',
          valueProposition: 'Transform business operations with intelligent automation',
          targetAudience: 'Mid-market B2B companies',
          differentiators: ['AI-powered insights', 'Zero-code automation', 'Predictive analytics']
        },
        competitorPositioning: [
          {
            competitorName: 'Competitor A',
            primaryMessage: 'Simple Automation Solutions',
            valueProposition: 'Easy-to-use automation for small teams',
            targetAudience: 'Small businesses'
          }
        ],
        marketOpportunities: ['Enterprise market expansion', 'Industry-specific solutions'],
        messagingEffectiveness: 82
      },
      userExperienceComparison: {
        productUX: {
          designQuality: 85,
          usabilityScore: 80,
          navigationStructure: 'Intuitive dashboard with clear navigation',
          keyUserFlows: ['Onboarding flow', 'Workflow creation', 'Analytics review']
        },
        competitorUX: [
          {
            competitorName: 'Competitor A',
            designQuality: 70,
            usabilityScore: 75,
            navigationStructure: 'Traditional menu-based navigation'
          }
        ],
        uxStrengths: ['Clean interface design', 'Intuitive workflow builder'],
        uxWeaknesses: ['Mobile responsiveness', 'Advanced feature discovery'],
        uxRecommendations: ['Improve mobile experience', 'Add guided tours for complex features']
      },
      customerTargeting: {
        productTargeting: {
          primarySegments: ['B2B SaaS', 'Enterprise software', 'Productivity tools'],
          customerTypes: ['Operations managers', 'IT directors', 'Business analysts'],
          useCases: ['Process automation', 'Data analysis', 'Workflow optimization']
        },
        competitorTargeting: [
          {
            competitorName: 'Competitor A',
            primarySegments: ['Small business'],
            customerTypes: ['Small business owners']
          }
        ],
        targetingOverlap: ['Process automation', 'Workflow management'],
        untappedSegments: ['Healthcare', 'Financial services'],
        competitiveAdvantage: ['AI-first approach', 'Comprehensive automation', 'Predictive insights']
      }
    },
    recommendations: {
      immediate: ['Enhance mobile experience', 'Expand API capabilities'],
      shortTerm: ['Develop industry-specific features', 'Improve onboarding'],
      longTerm: ['Enter enterprise market', 'Build marketplace ecosystem'],
      priorityScore: 88
    },
    metadata: {
      analysisMethod: 'ai_powered' as const,
      modelUsed: 'anthropic.claude-3-sonnet-20240229-v1:0',
      confidenceScore: 92,
      processingTime: 2500,
      dataQuality: 'high' as const
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock BedrockService
    mockBedrockService = new MockedBedrockService() as jest.Mocked<BedrockService>;
    service = new ComparativeReportService();
    (service as any).bedrockService = mockBedrockService;
  });

  describe('generateComparativeReport', () => {
    it('should generate comprehensive report with all sections', async () => {
      const options: ReportGenerationOptions = {
        template: REPORT_TEMPLATES.COMPREHENSIVE,
        format: 'markdown',
        includeCharts: true,
        includeTables: true
      };

      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot,
        options
      );

      expect(result.report).toBeDefined();
      expect(result.report.id).toBeDefined();
      expect(result.report.title).toContain('Test Product');
      expect(result.report.title).toContain('Comprehensive');
      expect(result.report.projectId).toBe(sampleProduct.projectId);
      expect(result.report.productId).toBe(sampleProduct.id);
      expect(result.report.analysisId).toBe(sampleAnalysis.id);
      expect(result.report.status).toBe('completed');
      expect(result.report.format).toBe('markdown');

      // Check sections
      expect(result.report.sections).toHaveLength(6); // Comprehensive template has 6 sections
      expect(result.report.sections[0].type).toBe('executive_summary');
      expect(result.report.sections[1].type).toBe('feature_comparison');
      expect(result.report.sections[2].type).toBe('positioning_analysis');
      expect(result.report.sections[3].type).toBe('ux_comparison');
      expect(result.report.sections[4].type).toBe('customer_targeting');
      expect(result.report.sections[5].type).toBe('recommendations');

      // Check metadata
      expect(result.report.metadata.productName).toBe('Test Product');
      expect(result.report.metadata.competitorCount).toBe(2);
      expect(result.report.metadata.confidenceScore).toBe(92);
      expect(result.report.metadata.analysisMethod).toBe('ai_powered');
      expect(result.report.metadata.dataQuality).toBe('high');

      // Check strategic recommendations
      expect(result.report.strategicRecommendations.immediate).toEqual(sampleAnalysis.recommendations.immediate);
      expect(result.report.strategicRecommendations.shortTerm).toEqual(sampleAnalysis.recommendations.shortTerm);
      expect(result.report.strategicRecommendations.longTerm).toEqual(sampleAnalysis.recommendations.longTerm);
      expect(result.report.strategicRecommendations.priorityScore).toBe(88);

      // Check competitive intelligence
      expect(result.report.competitiveIntelligence.marketPosition).toBe('competitive');
      expect(result.report.competitiveIntelligence.opportunities).toEqual(['Enterprise market expansion', 'Industry-specific solutions']);

      // Check generation metrics
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should generate executive report with limited sections', async () => {
      const options: ReportGenerationOptions = {
        template: REPORT_TEMPLATES.EXECUTIVE,
        format: 'html'
      };

      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot,
        options
      );

      expect(result.report.sections).toHaveLength(2); // Executive template has 2 sections
      expect(result.report.sections[0].type).toBe('executive_summary');
      expect(result.report.sections[1].type).toBe('recommendations');
      expect(result.report.format).toBe('html');
    });

    it('should generate technical report with feature focus', async () => {
      const options: ReportGenerationOptions = {
        template: REPORT_TEMPLATES.TECHNICAL,
        format: 'markdown'
      };

      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot,
        options
      );

      expect(result.report.sections).toHaveLength(3); // Technical template has 3 sections
      expect(result.report.sections[0].type).toBe('executive_summary');
      expect(result.report.sections[1].type).toBe('feature_comparison');
      expect(result.report.sections[2].type).toBe('ux_comparison');
    });

    it('should generate strategic report with positioning focus', async () => {
      const options: ReportGenerationOptions = {
        template: REPORT_TEMPLATES.STRATEGIC,
        format: 'markdown'
      };

      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot,
        options
      );

      expect(result.report.sections).toHaveLength(4); // Strategic template has 4 sections
      expect(result.report.sections[0].type).toBe('executive_summary');
      expect(result.report.sections[1].type).toBe('positioning_analysis');
      expect(result.report.sections[2].type).toBe('customer_targeting');
      expect(result.report.sections[3].type).toBe('recommendations');
    });

    it('should use default template when none specified', async () => {
      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot
      );

      expect(result.report.sections).toHaveLength(6); // Default comprehensive template
      expect(result.report.format).toBe('markdown'); // Default format
    });

    it('should throw error for invalid template', async () => {
      const options: ReportGenerationOptions = {
        template: 'invalid-template' as any
      };

      await expect(service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot,
        options
      )).rejects.toThrow('Template with ID invalid-template not found');
    });

    it('should handle section generation errors gracefully', async () => {
      // Create analysis with missing required data
      const incompleteAnalysis = {
        ...sampleAnalysis,
        detailed: {
          ...sampleAnalysis.detailed,
          featureComparison: {
            ...sampleAnalysis.detailed.featureComparison,
            productFeatures: undefined // Missing required field
          }
        }
      } as ComparativeAnalysis;

      await expect(service.generateComparativeReport(
        incompleteAnalysis,
        sampleProduct,
        sampleProductSnapshot
      )).rejects.toThrow(ReportGenerationError);
    });
  });

  describe('generateEnhancedReportContent', () => {
    it('should generate enhanced content using AI', async () => {
      const mockEnhancedContent = `
# Enhanced Competitive Analysis Report

## Executive Summary
Based on our comprehensive analysis, Test Product demonstrates strong competitive positioning...

## Key Strategic Insights
1. Market opportunity in enterprise segment
2. AI capabilities provide significant differentiation
3. UX improvements needed for mobile experience

## Recommendations
Immediate focus should be on expanding API capabilities and improving mobile responsiveness.
`;

      mockBedrockService.generateCompletion.mockResolvedValue(mockEnhancedContent);

      const result = await service.generateEnhancedReportContent(
        'test-analysis-id',
        REPORT_TEMPLATES.COMPREHENSIVE,
        {
          maxTokens: 3000,
          temperature: 0.2
        }
      );

      expect(result).toBe(mockEnhancedContent);
      expect(mockBedrockService.generateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('Generate an enhanced comprehensive'),
        {
          maxTokens: 3000,
          temperature: 0.2
        }
      );
    });

    it('should handle AI service errors', async () => {
      mockBedrockService.generateCompletion.mockRejectedValue(new Error('AI service unavailable'));

      await expect(service.generateEnhancedReportContent(
        'test-analysis-id',
        REPORT_TEMPLATES.COMPREHENSIVE
      )).rejects.toThrow(ReportGenerationError);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return all available templates', () => {
      const templates = service.getAvailableTemplates();

      expect(templates).toHaveLength(4);
      expect(templates.map(t => t.id)).toEqual([
        REPORT_TEMPLATES.COMPREHENSIVE,
        REPORT_TEMPLATES.EXECUTIVE,
        REPORT_TEMPLATES.TECHNICAL,
        REPORT_TEMPLATES.STRATEGIC
      ]);

      // Check template details
      const comprehensiveTemplate = templates.find(t => t.id === REPORT_TEMPLATES.COMPREHENSIVE);
      expect(comprehensiveTemplate).toBeDefined();
      expect(comprehensiveTemplate!.name).toBe('Comprehensive Comparative Analysis');
      expect(comprehensiveTemplate!.sectionTemplates).toHaveLength(6);
      expect(comprehensiveTemplate!.focusAreas).toEqual(['features', 'positioning', 'user_experience', 'customer_targeting']);
    });
  });

  describe('validateAnalysisForReporting', () => {
    it('should validate complete analysis successfully', () => {
      expect(() => service.validateAnalysisForReporting(sampleAnalysis)).not.toThrow();
    });

    it('should throw error for missing summary', () => {
      const incompleteAnalysis = {
        ...sampleAnalysis,
        summary: undefined
      } as any;

      expect(() => service.validateAnalysisForReporting(incompleteAnalysis))
        .toThrow('Analysis missing required field for reporting: summary');
    });

    it('should throw error for missing detailed analysis', () => {
      const incompleteAnalysis = {
        ...sampleAnalysis,
        detailed: undefined
      } as any;

      expect(() => service.validateAnalysisForReporting(incompleteAnalysis))
        .toThrow('Analysis missing required field for reporting: detailed');
    });

    it('should throw error for missing recommendations', () => {
      const incompleteAnalysis = {
        ...sampleAnalysis,
        recommendations: undefined
      } as any;

      expect(() => service.validateAnalysisForReporting(incompleteAnalysis))
        .toThrow('Analysis missing required field for reporting: recommendations');
    });

    it('should throw error for missing metadata', () => {
      const incompleteAnalysis = {
        ...sampleAnalysis,
        metadata: undefined
      } as any;

      expect(() => service.validateAnalysisForReporting(incompleteAnalysis))
        .toThrow('Analysis missing required field for reporting: metadata');
    });

    it('should warn for low confidence analysis but not throw', () => {
      const loggerSpy = jest.spyOn(require('@/lib/logger').logger, 'warn').mockImplementation();

      const lowConfidenceAnalysis = {
        ...sampleAnalysis,
        metadata: {
          ...sampleAnalysis.metadata,
          confidenceScore: 40
        }
      };

      expect(() => service.validateAnalysisForReporting(lowConfidenceAnalysis)).not.toThrow();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Analysis confidence score is low for reporting',
        expect.objectContaining({
          analysisId: sampleAnalysis.id,
          confidenceScore: 40
        })
      );

      loggerSpy.mockRestore();
    });
  });

  describe('template content generation', () => {
    it('should populate template variables correctly', async () => {
      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot,
        { template: REPORT_TEMPLATES.COMPREHENSIVE }
      );

      const executiveSummary = result.report.sections.find(s => s.type === 'executive_summary');
      expect(executiveSummary?.content).toContain('Test Product');
      expect(executiveSummary?.content).toContain('competitive');
      expect(executiveSummary?.content).toContain('85');
      expect(executiveSummary?.content).toContain('low');
      expect(executiveSummary?.content).toContain('92%');
      expect(executiveSummary?.content).toContain('Strong AI capabilities');

      const featureComparison = result.report.sections.find(s => s.type === 'feature_comparison');
      expect(featureComparison?.content).toContain('AI-powered automation');
      expect(featureComparison?.content).toContain('Competitor A');
      expect(featureComparison?.content).toContain('AI-powered insights');
      expect(featureComparison?.content).toContain('88/100');
    });

    it('should handle missing optional template variables', async () => {
      const analysisWithMissingData = {
        ...sampleAnalysis,
        detailed: {
          ...sampleAnalysis.detailed,
          positioningAnalysis: {
            ...sampleAnalysis.detailed.positioningAnalysis,
            competitorPositioning: undefined // Missing optional field
          }
        }
      } as ComparativeAnalysis;

      const result = await service.generateComparativeReport(
        analysisWithMissingData,
        sampleProduct,
        sampleProductSnapshot,
        { template: REPORT_TEMPLATES.STRATEGIC }
      );

      expect(result.report.sections).toHaveLength(4);
      expect(result.report.sections[1].type).toBe('positioning_analysis');
      // Should not crash even with missing competitor positioning data
    });
  });

  describe('report content structure', () => {
    it('should include executive summary in keyFindings', async () => {
      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot
      );

      expect(result.report.keyFindings).toContain('Strength: Strong AI capabilities');
      expect(result.report.keyFindings).toContain('Weakness: Limited market presence');
      expect(result.report.keyFindings).toContain('Market Position: competitive');
      expect(result.report.keyFindings).toContain('Opportunity Score: 85/100');
    });

    it('should extract key threats correctly', async () => {
      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot
      );

      expect(result.report.competitiveIntelligence.keyThreats).toContain('Overall threat level: low');
      expect(result.report.competitiveIntelligence.keyThreats).toContain('Advanced API features');
      expect(result.report.competitiveIntelligence.keyThreats).toContain('Mobile responsiveness');
    });

    it('should calculate cost and tokens correctly', async () => {
      const result = await service.generateComparativeReport(
        sampleAnalysis,
        sampleProduct,
        sampleProductSnapshot
      );

      expect(result.tokensUsed).toBeGreaterThan(100);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBe((result.tokensUsed / 1000) * 0.003); // Verify cost calculation
    });
  });
}); 