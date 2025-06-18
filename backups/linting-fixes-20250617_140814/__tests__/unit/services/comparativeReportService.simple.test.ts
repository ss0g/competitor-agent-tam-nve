import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ComparativeReportService } from '@/services/reports/comparativeReportService';
import { 
  ComparativeAnalysis 
} from '@/types/analysis';
import { Product, ProductSnapshot } from '@/types/product';
import { 
  REPORT_TEMPLATES 
} from '@/types/comparativeReport';

// Mock AI service
const mockAIService = {
  generateCompletion: jest.fn().mockResolvedValue('Mock AI response content' as any)
};

describe('ComparativeReportService - Core Functionality', () => {
  let service: ComparativeReportService;

  // Minimal test data that satisfies the type requirements
  const testProduct: Product = {
    id: 'test-product',
    name: 'Test Product',
    website: 'https://test.com',
    positioning: 'Test positioning',
    customerData: 'Test customers',
    userProblem: 'Test problem',
    industry: 'Software',
    projectId: 'test-project',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const testProductSnapshot: ProductSnapshot = {
    id: 'test-snapshot',
    productId: 'test-product',
    content: {
      title: 'Test Product',
      text: 'Test content ' + 'A'.repeat(2000)
    },
    metadata: {},
    createdAt: new Date()
  };

  const testAnalysis: ComparativeAnalysis = {
    id: 'test-analysis',
    projectId: 'test-project',
    productId: 'test-product',
    competitorIds: ['comp1', 'comp2'],
    analysisDate: new Date(),
    summary: {
      overallPosition: 'competitive',
      keyStrengths: ['Strong AI', 'Good UX'],
      keyWeaknesses: ['High price', 'Limited features'],
      opportunityScore: 85,
      threatLevel: 'low'
    },
    detailed: {
      featureComparison: {
        productFeatures: ['AI automation', 'Analytics'],
        competitorFeatures: [
          {
            competitorId: 'comp1',
            competitorName: 'Competitor 1',
            features: ['Basic automation']
          }
        ],
        uniqueToProduct: ['AI insights'],
        uniqueToCompetitors: ['Advanced API'],
        commonFeatures: ['Analytics'],
        featureGaps: ['Mobile app'],
        innovationScore: 88
      },
      positioningAnalysis: {
        productPositioning: {
          primaryMessage: 'AI-first solution',
          valueProposition: 'Intelligent automation',
          targetAudience: 'B2B companies',
          differentiators: ['AI-powered', 'Easy to use']
        },
        competitorPositioning: [
          {
            competitorId: 'comp1',
            competitorName: 'Competitor 1',
            primaryMessage: 'Simple automation',
            valueProposition: 'Basic workflows',
            targetAudience: 'Small teams',
            differentiators: ['Simple', 'Affordable']
          }
        ],
        positioningGaps: ['Enterprise features'],
        marketOpportunities: ['Enterprise market'],
        messagingEffectiveness: 82
      },
      userExperienceComparison: {
        productUX: {
          designQuality: 85,
          usabilityScore: 80,
          navigationStructure: 'Clean dashboard',
          keyUserFlows: ['Onboarding', 'Setup']
        },
        competitorUX: [
          {
            competitorId: 'comp1',
            competitorName: 'Competitor 1',
            designQuality: 70,
            usabilityScore: 75,
            navigationStructure: 'Traditional menu',
            keyUserFlows: ['Basic setup']
          }
        ],
        uxStrengths: ['Intuitive design'],
        uxWeaknesses: ['Mobile responsiveness'],
        uxRecommendations: ['Improve mobile']
      },
      customerTargeting: {
        productTargeting: {
          primarySegments: ['B2B SaaS'],
          customerTypes: ['Operations managers'],
          useCases: ['Process automation']
        },
        competitorTargeting: [
          {
            competitorId: 'comp1',
            competitorName: 'Competitor 1',
            primarySegments: ['Small business'],
            customerTypes: ['Small business owners'],
            useCases: ['Basic automation']
          }
        ],
        targetingOverlap: ['Automation'],
        untappedSegments: ['Healthcare'],
        competitiveAdvantage: ['AI-first approach']
      }
    },
    recommendations: {
      immediate: ['Improve mobile'],
      shortTerm: ['Add enterprise features'],
      longTerm: ['Expand to new markets'],
      priorityScore: 88
    },
    metadata: {
      analysisMethod: 'ai_powered',
      modelUsed: 'claude-3',
      confidenceScore: 92,
      processingTime: 2500,
      dataQuality: 'high'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComparativeReportService();
  });

  describe('Core Report Generation', () => {
    it('should generate comprehensive report successfully', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot,
        { template: REPORT_TEMPLATES.COMPREHENSIVE }
      );

      expect(result.report).toBeDefined();
      expect(result.report.id).toBeDefined();
      expect(result.report.title).toContain('Test Product');
      expect(result.report.sections).toHaveLength(6); // Comprehensive template
      expect(result.report.status).toBe('completed');
      expect(result.generationTime).toBeGreaterThan(0);
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    it('should generate executive report successfully', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot,
        { template: REPORT_TEMPLATES.EXECUTIVE }
      );

      expect(result.report.sections).toHaveLength(2); // Executive template
      expect(result.report.sections[0].type).toBe('executive_summary');
      expect(result.report.sections[1].type).toBe('recommendations');
    });

    it('should generate technical report successfully', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot,
        { template: REPORT_TEMPLATES.TECHNICAL }
      );

      expect(result.report.sections).toHaveLength(3); // Technical template
      expect(result.report.sections[0].type).toBe('executive_summary');
      expect(result.report.sections[1].type).toBe('feature_comparison');
      expect(result.report.sections[2].type).toBe('ux_comparison');
    });

    it('should generate strategic report successfully', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot,
        { template: REPORT_TEMPLATES.STRATEGIC }
      );

      expect(result.report.sections).toHaveLength(4); // Strategic template
      expect(result.report.sections[0].type).toBe('executive_summary');
      expect(result.report.sections[1].type).toBe('positioning_analysis');
      expect(result.report.sections[2].type).toBe('customer_targeting');
      expect(result.report.sections[3].type).toBe('recommendations');
    });
  });

  describe('Report Content', () => {
    it('should populate report metadata correctly', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot
      );

      const metadata = result.report.metadata;
      expect(metadata.productName).toBe('Test Product');
      expect(metadata.competitorCount).toBe(1);
      expect(metadata.confidenceScore).toBe(92);
      expect(metadata.analysisMethod).toBe('ai_powered');
      expect(metadata.dataQuality).toBe('high');
    });

    it('should extract strategic recommendations correctly', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot
      );

      const recommendations = result.report.strategicRecommendations;
      expect(recommendations.immediate).toEqual(['Improve mobile']);
      expect(recommendations.shortTerm).toEqual(['Add enterprise features']);
      expect(recommendations.longTerm).toEqual(['Expand to new markets']);
      expect(recommendations.priorityScore).toBe(88);
    });

    it('should extract competitive intelligence correctly', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot
      );

      const intelligence = result.report.competitiveIntelligence;
      expect(intelligence.marketPosition).toBe('competitive');
      expect(intelligence.opportunities).toEqual(['Enterprise market']);
      expect(intelligence.competitiveAdvantages).toEqual(['AI-first approach']);
    });

    it('should include key findings', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot
      );

      const findings = result.report.keyFindings;
      expect(findings).toContain('Strength: Strong AI');
      expect(findings).toContain('Weakness: High price');
      expect(findings).toContain('Market Position: competitive');
      expect(findings).toContain('Opportunity Score: 85/100');
    });
  });

  describe('Template System', () => {
    it('should return available templates', () => {
      const templates = service.getAvailableTemplates();
      
      expect(templates).toHaveLength(4);
      expect(templates.map(t => t.id)).toEqual([
        REPORT_TEMPLATES.COMPREHENSIVE,
        REPORT_TEMPLATES.EXECUTIVE,
        REPORT_TEMPLATES.TECHNICAL,
        REPORT_TEMPLATES.STRATEGIC
      ]);
    });

    it('should validate analysis for reporting', () => {
      expect(() => service.validateAnalysisForReporting(testAnalysis)).not.toThrow();
    });

    it('should throw error for missing analysis fields', () => {
      const invalidAnalysis = { ...testAnalysis, summary: undefined } as any;
      
      expect(() => service.validateAnalysisForReporting(invalidAnalysis))
        .toThrow('Analysis missing required field for reporting: summary');
    });
  });

  describe('Report Generation Options', () => {
    it('should handle different formats', async () => {
      const markdownResult = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot,
        { format: 'markdown' }
      );

      const htmlResult = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot,
        { format: 'html' }
      );

      expect(markdownResult.report.format).toBe('markdown');
      expect(htmlResult.report.format).toBe('html');
    });

    it('should calculate costs and tokens', async () => {
      const result = await service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot
      );

      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.cost).toBe((result.tokensUsed / 1000) * 0.003);
    });
  });

  describe('Error Handling', () => {
    it('should handle template not found', async () => {
      await expect(service.generateComparativeReport(
        testAnalysis,
        testProduct,
        testProductSnapshot,
        { template: 'invalid-template' as any }
      )).rejects.toThrow('Template with ID invalid-template not found');
    });

    it('should handle missing analysis data gracefully', async () => {
      const incompleteAnalysis = {
        ...testAnalysis,
        detailed: undefined
      } as any;

      await expect(service.generateComparativeReport(
        incompleteAnalysis,
        testProduct,
        testProductSnapshot
      )).rejects.toThrow();
    });
  });
}); 