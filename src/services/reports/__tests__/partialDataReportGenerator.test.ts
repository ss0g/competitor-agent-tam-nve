import { PartialDataReportGenerator, PartialDataInfo, DataGap, PartialReportOptions } from '../partialDataReportGenerator';
import { ComparativeAnalysis } from '@/types/analysis';
import { Product, ProductSnapshot } from '@/types/product';
import { ComparativeReport } from '@/types/comparativeReport';

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock the template service
jest.mock('../comparativeReportTemplates', () => ({
  getReportTemplate: jest.fn(() => ({
    id: 'comprehensive',
    name: 'Comprehensive Analysis',
    description: 'Complete competitive analysis',
    sectionTemplates: [
      {
        type: 'executive_summary',
        title: 'Executive Summary',
        template: '# Executive Summary\n\n{{productName}} analysis with {{competitorCount}} competitors.',
        order: 1,
        includeCharts: true,
        includeTables: false,
        requiredFields: ['productName', 'competitorCount']
      },
      {
        type: 'feature_comparison',
        title: 'Feature Analysis',
        template: '# Feature Analysis\n\nProduct features: {{#productFeatures}}{{.}}{{/productFeatures}}',
        order: 2,
        includeCharts: true,
        includeTables: true,
        requiredFields: ['productFeatures']
      }
    ],
    defaultFormat: 'markdown',
    focusAreas: ['features', 'positioning'],
    analysisDepth: 'comprehensive'
  }))
}));

describe('PartialDataReportGenerator', () => {
  let generator: PartialDataReportGenerator;
  let mockProduct: Product;
  let mockProductSnapshot: ProductSnapshot;
  let mockAnalysis: ComparativeAnalysis;

  beforeEach(() => {
    generator = new PartialDataReportGenerator();

    mockProduct = {
      id: 'product-1',
      projectId: 'project-1',
      name: 'Test Product',
      website: 'https://testproduct.com',
      positioning: 'Innovative solution',
      customerData: 'B2B customers',
      userProblem: 'Efficiency challenges',
      industry: 'Technology',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockProductSnapshot = {
      id: 'snapshot-1',
      productId: 'product-1',
      metadata: {
        features: ['Feature 1', 'Feature 2'],
        pricing: '$99/month',
        screenshots: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockAnalysis = {
      id: 'analysis-1',
      projectId: 'project-1',
      productId: 'product-1',
      analysisDate: new Date(),
      summary: {
        overallPosition: 'competitive',
        opportunityScore: 65,
        threatLevel: 'medium',
        keyStrengths: ['Good UX', 'Competitive pricing'],
        keyWeaknesses: ['Limited features', 'Small market share'],
        competitiveAdvantages: ['Fast implementation'],
        marketOpportunities: ['Enterprise market', 'International expansion']
      },
      detailed: {
        featureComparison: {
          productFeatures: ['Feature A', 'Feature B'],
          competitorFeatures: [],
          uniqueFeatures: ['Unique Feature'],
          featureGaps: ['Missing Feature C'],
          innovationScore: 70
        },
        positioningAnalysis: {
          primaryMessage: 'Best-in-class solution',
          valueProposition: 'Fastest implementation',
          targetAudience: 'Mid-market companies',
          marketDifferentiators: ['Speed', 'Ease of use']
        },
        userExperienceComparison: {
          designQuality: 80,
          usabilityScore: 85,
          navigationStructure: 'Intuitive',
          competitorUXAnalysis: []
        },
        pricingStrategy: {
          pricingModel: 'Subscription',
          competitorPricing: [],
          pricePositioning: 'Competitive'
        },
        customerTargeting: {
          primarySegments: ['SMBs', 'Enterprises'],
          customerTypes: ['Business users'],
          useCases: ['Daily operations', 'Reporting']
        }
      },
      recommendations: {
        immediate: ['Improve feature X', 'Enhance UX'],
        shortTerm: ['Add feature Y', 'Expand marketing'],
        longTerm: ['Enter new markets', 'Build partnerships'],
        priorityScore: 75
      },
      metadata: {
        analysisMethod: 'hybrid',
        confidenceScore: 80,
        dataQuality: 'medium',
        generatedBy: 'test',
        processingTime: 1000,
        tokensUsed: 500,
        cost: 0.05,
        competitorCount: 2
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('generatePartialDataReport', () => {
    it('should generate meaningful report with 60% data completeness', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 60,
        dataFreshness: 'mixed',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: false,
          competitorCount: 2,
          freshSnapshotCount: 0
        },
        missingData: ['Fresh competitor snapshots'],
        dataGaps: [
          {
            area: 'Competitor Snapshots',
            description: 'No fresh competitor website snapshots available',
            impact: 'high',
            recommendation: 'Capture fresh competitor snapshots',
            canBeImproved: true
          }
        ],
        qualityTier: 'enhanced'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      expect(report).toBeDefined();
      expect(report.title).toContain('Test Product');
      expect(report.title).toContain('60% Complete');
      expect(report.description).toContain('60% data completeness');
      expect(report.sections).toHaveLength(3); // 2 template sections + 1 data gap section
      expect(report.metadata.dataCompletenessScore).toBe(60);
      expect(report.metadata.hasDataLimitations).toBe(true);
      expect(report.keyFindings).toContain('Analysis based on 60% data completeness - enhanced competitor data recommended');
    });

    it('should generate report with placeholder analysis when analysis is null', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 30,
        dataFreshness: 'basic',
        availableData: {
          hasProductData: true,
          hasCompetitorData: false,
          hasSnapshots: false,
          competitorCount: 0,
          freshSnapshotCount: 0
        },
        missingData: ['Competitor data', 'Competitor snapshots'],
        dataGaps: [
          {
            area: 'Competitor Information',
            description: 'No competitor data available for analysis',
            impact: 'high',
            recommendation: 'Add competitor information to project',
            canBeImproved: true
          }
        ],
        qualityTier: 'basic'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        null, // No analysis available
        mockProduct,
        mockProductSnapshot,
        options
      );

      expect(report).toBeDefined();
      expect(report.title).toContain('30% Complete');
      expect(report.sections).toHaveLength(3);
      expect(report.metadata.dataCompletenessScore).toBe(30);
      expect(report.strategicRecommendations.immediate).toContain('Conduct comprehensive competitor analysis to improve report accuracy');
    });

    it('should clearly indicate data gaps and freshness in report', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 45,
        dataFreshness: 'existing',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 3,
          freshSnapshotCount: 0
        },
        missingData: ['Fresh snapshots'],
        dataGaps: [
          {
            area: 'Data Freshness',
            description: 'Using existing snapshots instead of fresh captures',
            impact: 'medium',
            recommendation: 'Schedule fresh competitor snapshot capture',
            canBeImproved: true
          }
        ],
        qualityTier: 'enhanced'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      // Check for data gap section
      const dataGapSection = report.sections.find(s => s.type === 'data_gaps');
      expect(dataGapSection).toBeDefined();
      expect(dataGapSection!.content).toContain('Overall Completeness Score: 45%');
      expect(dataGapSection!.content).toContain('Data Freshness: existing');
      expect(dataGapSection!.content).toContain('Fresh Snapshots: 0/3 captured');
      expect(dataGapSection!.content).toContain('Moderate Data Gaps (Medium Impact)');
      expect(dataGapSection!.content).toContain('Schedule fresh competitor snapshot capture');
    });

    it('should provide actionable recommendations despite partial data', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 55,
        dataFreshness: 'mixed',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 2,
          freshSnapshotCount: 1
        },
        missingData: ['One competitor snapshot'],
        dataGaps: [
          {
            area: 'Incomplete Competitor Coverage',
            description: 'Only 1 of 2 competitors has fresh snapshots',
            impact: 'medium',
            recommendation: 'Capture remaining competitor snapshots',
            canBeImproved: true
          }
        ],
        qualityTier: 'enhanced'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      expect(report.strategicRecommendations.immediate).toContain('Improve feature X');
      expect(report.strategicRecommendations.immediate).toContain('Capture fresh competitor website snapshots for current market intelligence');
      expect(report.strategicRecommendations.shortTerm).toContain('Establish ongoing competitive intelligence process');
      expect(report.strategicRecommendations.longTerm).toContain('Build comprehensive competitive intelligence capability');
    });

    it('should calculate accurate data completeness scores including freshness', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 80,
        dataFreshness: 'new',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 3,
          freshSnapshotCount: 3
        },
        missingData: [],
        dataGaps: [],
        qualityTier: 'fresh'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: false // Don't include for high completeness
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      expect(report.metadata.dataCompletenessScore).toBe(80);
      expect(report.metadata.dataFreshness).toBe('new');
      expect(report.metadata.partialDataInfo?.qualityTier).toBe('fresh');
      expect(report.metadata.partialDataInfo?.freshSnapshotCount).toBe(3);
      expect(report.metadata.partialDataInfo?.totalCompetitors).toBe(3);
      
      // Should not have data quality footers for high-quality data
      const executiveSection = report.sections.find(s => s.type === 'executive_summary');
      expect(executiveSection?.content).not.toContain('📊 **Data Quality:**');
    });

    it('should handle mixed fresh and stale data scenarios', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 65,
        dataFreshness: 'mixed',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 4,
          freshSnapshotCount: 2
        },
        missingData: ['2 fresh competitor snapshots'],
        dataGaps: [
          {
            area: 'Mixed Data Freshness',
            description: '2 competitors have fresh data, 2 have existing data',
            impact: 'medium',
            recommendation: 'Capture fresh snapshots for all competitors',
            canBeImproved: true
          }
        ],
        qualityTier: 'enhanced'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      expect(report.metadata.dataFreshness).toBe('mixed');
      expect(report.description).toContain('Enhanced data collection recommended for more comprehensive insights');
      
      const dataGapSection = report.sections.find(s => s.type === 'data_gaps');
      expect(dataGapSection!.content).toContain('Fresh Snapshots: 2/4 captured');
      expect(dataGapSection!.content).toContain('Mixed Data Freshness');
    });

    it('should add data limitation notices to appropriate sections', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 40,
        dataFreshness: 'basic',
        availableData: {
          hasProductData: true,
          hasCompetitorData: false,
          hasSnapshots: false,
          competitorCount: 0,
          freshSnapshotCount: 0
        },
        missingData: ['Competitor data', 'Competitor snapshots'],
        dataGaps: [],
        qualityTier: 'basic'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        null,
        mockProduct,
        mockProductSnapshot,
        options
      );

      // Check for data limitation notices in sections
      const featureSection = report.sections.find(s => s.type === 'feature_comparison');
      expect(featureSection?.content).toContain('**Data Limitation Notice:**');
      expect(featureSection?.content).toContain('This analysis is based on product data only');
      
      // Check for data quality footers
      expect(featureSection?.content).toContain('📊 **Data Quality:** basic');
      expect(featureSection?.content).toContain('🎯 **Completeness:** 40%');
      expect(featureSection?.content).toContain('🔄 **Freshness:** basic');
    });

    it('should handle error scenarios gracefully', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 50,
        dataFreshness: 'existing',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: false,
          competitorCount: 2,
          freshSnapshotCount: 0
        },
        missingData: ['Fresh snapshots'],
        dataGaps: [],
        qualityTier: 'enhanced'
      };

      // Mock template service to return null to trigger error handling
      const mockGetTemplate = require('../comparativeReportTemplates').getReportTemplate;
      mockGetTemplate.mockReturnValueOnce(null);

      const options: PartialReportOptions = {
        template: 'invalid-template',
        format: 'markdown',
        partialDataInfo
      };

      await expect(generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      )).rejects.toThrow('Failed to generate partial data report');
    });

    it('should create placeholder sections when section generation fails', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 25,
        dataFreshness: 'basic',
        availableData: {
          hasProductData: true,
          hasCompetitorData: false,
          hasSnapshots: false,
          competitorCount: 0,
          freshSnapshotCount: 0
        },
        missingData: ['All competitor data'],
        dataGaps: [
          {
            area: 'No Competitor Data',
            description: 'No competitor information available',
            impact: 'high',
            recommendation: 'Add competitor information to project',
            canBeImproved: true
          }
        ],
        qualityTier: 'basic'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        null,
        mockProduct,
        mockProductSnapshot,
        options
      );

      // Should have created sections despite minimal data
      expect(report.sections.length).toBeGreaterThan(0);
      
      // Check for placeholder content indicators
      const hasPlaceholderContent = report.sections.some(section =>
        section.content.includes('⚠️ Limited Data Notice') ||
        section.content.includes('Data Completeness: 25%')
      );
      expect(hasPlaceholderContent).toBe(true);
    });
  });

  describe('data gap identification', () => {
    it('should identify critical data gaps correctly', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 35,
        dataFreshness: 'basic',
        availableData: {
          hasProductData: true,
          hasCompetitorData: false,
          hasSnapshots: false,
          competitorCount: 0,
          freshSnapshotCount: 0
        },
        missingData: ['Competitor data'],
        dataGaps: [
          {
            area: 'Competitor Analysis',
            description: 'No competitor data available for comparative analysis',
            impact: 'high',
            recommendation: 'Add competitor information to enable competitive insights',
            canBeImproved: true
          },
          {
            area: 'Market Intelligence',
            description: 'Limited market positioning insights without competitor data',
            impact: 'medium',
            recommendation: 'Conduct market research to understand competitive landscape',
            canBeImproved: true
          }
        ],
        qualityTier: 'basic'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        null,
        mockProduct,
        mockProductSnapshot,
        options
      );

      const dataGapSection = report.sections.find(s => s.type === 'data_gaps');
      expect(dataGapSection).toBeDefined();
      expect(dataGapSection!.content).toContain('Critical Data Gaps (High Impact)');
      expect(dataGapSection!.content).toContain('Competitor Analysis');
      expect(dataGapSection!.content).toContain('Add competitor information to enable competitive insights');
      expect(dataGapSection!.content).toContain('Moderate Data Gaps (Medium Impact)');
      expect(dataGapSection!.content).toContain('Market Intelligence');
    });

    it('should provide specific improvement recommendations', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 45,
        dataFreshness: 'existing',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 3,
          freshSnapshotCount: 0
        },
        missingData: ['Fresh competitor snapshots'],
        dataGaps: [
          {
            area: 'Snapshot Freshness',
            description: 'All competitor snapshots are outdated (>30 days old)',
            impact: 'medium',
            recommendation: 'Schedule automated fresh competitor snapshot capture',
            canBeImproved: true
          },
          {
            area: 'Competitive Intelligence',
            description: 'Current competitive analysis may not reflect latest market changes',
            impact: 'medium',
            recommendation: 'Implement regular competitive monitoring process',
            canBeImproved: true
          }
        ],
        qualityTier: 'enhanced'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      const dataGapSection = report.sections.find(s => s.type === 'data_gaps');
      expect(dataGapSection!.content).toContain('Improving Report Quality');
      expect(dataGapSection!.content).toContain('Schedule automated fresh competitor snapshot capture');
      expect(dataGapSection!.content).toContain('Implement regular competitive monitoring process');
      expect(dataGapSection!.content).toContain('Data Collection Status');
    });
  });

  describe('report quality indicators', () => {
    it('should calculate section-specific data completeness correctly', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 60,
        dataFreshness: 'mixed',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 2,
          freshSnapshotCount: 1
        },
        missingData: ['One competitor snapshot'],
        dataGaps: [],
        qualityTier: 'enhanced'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: false
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      // Executive summary should have higher completeness (less dependent on competitor data)
      const executiveSection = report.sections.find(s => s.type === 'executive_summary');
      expect(executiveSection?.metadata.dataCompleteness).toBeGreaterThanOrEqual(48); // 60 * 0.8

      // Feature comparison should have lower completeness (heavily dependent on competitor data)
      const featureSection = report.sections.find(s => s.type === 'feature_comparison');
      expect(featureSection?.metadata.dataCompleteness).toBeLessThanOrEqual(18); // 60 * 0.3
    });

    it('should indicate sections with limitations correctly', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 45,
        dataFreshness: 'existing',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: false,
          competitorCount: 2,
          freshSnapshotCount: 0
        },
        missingData: ['Fresh snapshots'],
        dataGaps: [
          {
            area: 'UX Analysis',
            description: 'No fresh snapshots for UX comparison',
            impact: 'high',
            recommendation: 'Capture fresh competitor snapshots',
            canBeImproved: true
          }
        ],
        qualityTier: 'enhanced'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: true
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      // Feature comparison section should have limitations
      const featureSection = report.sections.find(s => s.type === 'feature_comparison');
      expect(featureSection?.metadata.hasLimitations).toBe(true);
      expect(featureSection?.metadata.improvementPossible).toBe(true);
    });

    it('should not show quality footers for high-quality data', async () => {
      const partialDataInfo: PartialDataInfo = {
        dataCompletenessScore: 85,
        dataFreshness: 'new',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 3,
          freshSnapshotCount: 3
        },
        missingData: [],
        dataGaps: [],
        qualityTier: 'complete'
      };

      const options: PartialReportOptions = {
        template: 'comprehensive',
        format: 'markdown',
        partialDataInfo,
        includeDataGapSection: false
      };

      const report = await generator.generatePartialDataReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        options
      );

      // Should not have data quality footers for high-quality data (>=80%)
      const sections = report.sections;
      const hasQualityFooters = sections.some(section =>
        section.content.includes('📊 **Data Quality:**')
      );
      expect(hasQualityFooters).toBe(false);
    });
  });
}); 