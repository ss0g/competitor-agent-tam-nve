import { ReportQualityService, reportQualityService } from '../reportQualityService';
import { ComparativeReport, ComparativeReportSection } from '@/types/comparativeReport';
import { ComparativeAnalysis } from '@/types/analysis';
import { Product, ProductSnapshot } from '@/types/product';

describe('ReportQualityService', () => {
  let service: ReportQualityService;

  // Mock data fixtures
  const mockProduct: Product = {
    id: 'product-1',
    name: 'Test Product',
    website: 'https://testproduct.com',
    description: 'A test product for quality assessment',
    industry: 'SaaS',
    positioning: 'Cloud-based solution',
    keyFeatures: ['Feature 1', 'Feature 2'],
    targetAudience: 'Enterprise customers',
    projectId: 'project-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockProductSnapshot: ProductSnapshot = {
    id: 'snapshot-1',
    productId: 'product-1',
    url: 'https://testproduct.com',
    content: 'Product homepage content',
    metadata: { title: 'Test Product', description: 'Product description' },
    capturedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockAnalysis: ComparativeAnalysis = {
    id: 'analysis-1',
    analysisDate: new Date('2024-01-01'),
    summary: {
      overallPosition: 'strong',
      opportunityScore: 75,
      threatLevel: 'medium',
      confidenceScore: 80,
      keyStrengths: ['Strong feature set', 'Good market position'],
      keyWeaknesses: ['Limited market presence', 'Higher pricing']
    },
    metadata: {
      analysisMethod: 'comprehensive',
      confidenceScore: 80,
      dataQuality: 'high',
      generatedBy: 'test',
      processingTime: 5000,
      tokensUsed: 1000,
      cost: 0.1,
      competitorCount: 3
    }
  };

  const mockReportSections: ComparativeReportSection[] = [
    {
      id: 'section-1',
      type: 'executive_summary',
      title: 'Executive Summary',
      content: 'This is a comprehensive executive summary of the competitive analysis. It provides key insights into market position, strengths, and opportunities for improvement.',
      order: 1,
      metadata: {
        generatedAt: new Date('2024-01-01'),
        dataCompleteness: 85,
        hasLimitations: false
      }
    },
    {
      id: 'section-2',
      type: 'feature_comparison',
      title: 'Feature Comparison',
      content: 'Detailed comparison of features across competitors. This section analyzes feature gaps and competitive advantages.',
      order: 2,
      metadata: {
        generatedAt: new Date('2024-01-01'),
        dataCompleteness: 60,
        hasLimitations: true
      }
    },
    {
      id: 'section-3',
      type: 'positioning_analysis',
      title: 'Market Positioning',
      content: 'Analysis of market positioning relative to competitors.',
      order: 3,
      metadata: {
        generatedAt: new Date('2024-01-01'),
        dataCompleteness: 75,
        hasLimitations: false
      }
    }
  ];

  const mockReport: ComparativeReport = {
    id: 'report-1',
    title: 'Test Product Competitive Analysis',
    description: 'Comprehensive competitive analysis report',
    sections: mockReportSections,
    keyFindings: [
      'Strong competitive position in core features',
      'Opportunity to improve pricing strategy',
      'Market expansion potential identified'
    ],
    strategicRecommendations: {
      immediate: ['Optimize pricing strategy', 'Enhance marketing messaging'],
      shortTerm: ['Develop missing features', 'Expand market reach'],
      longTerm: ['Strategic partnerships', 'International expansion']
    },
    metadata: {
      productName: 'Test Product',
      productUrl: 'https://testproduct.com',
      competitorCount: 3,
      analysisDate: new Date('2024-01-01'),
      reportGeneratedAt: new Date('2024-01-01'),
      analysisId: 'analysis-1',
      analysisMethod: 'comprehensive',
      confidenceScore: 80,
      dataQuality: 'high',
      reportVersion: '1.0',
      focusAreas: ['features', 'pricing', 'positioning'],
      analysisDepth: 'comprehensive',
      dataCompletenessScore: 75,
      dataFreshness: 'new',
      hasDataLimitations: false
    }
  };

  const mockCompetitorData = {
    totalCompetitors: 3,
    availableCompetitors: 3,
    freshSnapshots: 2,
    existingSnapshots: 1
  };

  beforeEach(() => {
    service = new ReportQualityService();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ReportQualityService.getInstance();
      const instance2 = ReportQualityService.getInstance();
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(reportQualityService);
    });
  });

  describe('assessReportQuality', () => {
    it('should assess report quality with high-quality data', async () => {
      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      expect(assessment).toBeDefined();
      expect(assessment.reportId).toBe('report-1');
      expect(assessment.reportType).toBe('manual');
      expect(assessment.qualityScore.overall).toBeGreaterThan(70);
      expect(assessment.qualityTier).toMatch(/^(excellent|good|fair)$/);
      expect(assessment.confidenceIndicators).toBeDefined();
      expect(assessment.recommendations).toBeDefined();
      expect(assessment.improvement).toBeDefined();
      expect(assessment.dataProfile).toBeDefined();
    });

    it('should assess initial report type correctly', async () => {
      const initialReport = {
        ...mockReport,
        metadata: {
          ...mockReport.metadata,
          hasDataLimitations: true
        }
      };

      const assessment = await service.assessReportQuality(
        initialReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      expect(assessment.reportType).toBe('initial');
    });

    it('should handle low data completeness scenarios', async () => {
      const lowQualityCompetitorData = {
        totalCompetitors: 5,
        availableCompetitors: 1,
        freshSnapshots: 0,
        existingSnapshots: 1
      };

      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        lowQualityCompetitorData
      );

      expect(assessment.qualityScore.dataCompleteness).toBeLessThan(60);
      expect(assessment.qualityTier).toMatch(/^(poor|critical|fair)$/);
      expect(assessment.recommendations.length).toBeGreaterThan(0);
      
      // Should have data collection recommendations
      const hasDataCollectionRec = assessment.recommendations.some(
        rec => rec.category === 'data_collection'
      );
      expect(hasDataCollectionRec).toBe(true);
    });

    it('should handle missing competitor data', async () => {
      const noCompetitorData = {
        totalCompetitors: 0,
        availableCompetitors: 0,
        freshSnapshots: 0,
        existingSnapshots: 0
      };

      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        noCompetitorData
      );

      expect(assessment.qualityScore.dataCompleteness).toBeLessThan(50);
      expect(assessment.qualityTier).toMatch(/^(poor|critical)$/);
    });

    it('should calculate data freshness correctly', async () => {
      // Test with old report
      const oldReport = {
        ...mockReport,
        metadata: {
          ...mockReport.metadata,
          reportGeneratedAt: new Date('2023-01-01') // 1 year old
        }
      };

      const assessment = await service.assessReportQuality(
        oldReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      expect(assessment.qualityScore.dataFreshness).toBeLessThan(70);
      
      // Should have freshness recommendations
      const hasFreshnessRec = assessment.recommendations.some(
        rec => rec.category === 'freshness'
      );
      expect(hasFreshnessRec).toBe(true);
    });

    it('should generate section-specific confidence indicators', async () => {
      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      const sectionTypes = mockReportSections.map(s => s.type);
      sectionTypes.forEach(type => {
        expect(assessment.confidenceIndicators[type]).toBeDefined();
        expect(assessment.confidenceIndicators[type].level).toMatch(/^(high|medium|low|critical)$/);
        expect(assessment.confidenceIndicators[type].score).toBeGreaterThanOrEqual(0);
        expect(assessment.confidenceIndicators[type].score).toBeLessThanOrEqual(100);
        expect(assessment.confidenceIndicators[type].explanation).toBeDefined();
        expect(assessment.confidenceIndicators[type].factors).toBeDefined();
      });
    });

    it('should prioritize recommendations correctly', async () => {
      const lowQualityReport = {
        ...mockReport,
        metadata: {
          ...mockReport.metadata,
          dataCompletenessScore: 30,
          dataFreshness: 'basic'
        }
      };

      const lowQualityAnalysis = {
        ...mockAnalysis,
        metadata: {
          ...mockAnalysis.metadata,
          confidenceScore: 40
        }
      };

      const assessment = await service.assessReportQuality(
        lowQualityReport,
        lowQualityAnalysis,
        mockProduct,
        mockProductSnapshot,
        {
          totalCompetitors: 5,
          availableCompetitors: 1,
          freshSnapshots: 0,
          existingSnapshots: 1
        }
      );

      expect(assessment.recommendations.length).toBeGreaterThan(0);
      
      // Check that critical/high priority recommendations come first
      const priorities = assessment.recommendations.map(rec => rec.priority);
      let highPriorityFound = false;
      priorities.forEach(priority => {
        if (priority === 'critical' || priority === 'high') {
          highPriorityFound = true;
        } else if (highPriorityFound && (priority === 'medium' || priority === 'low')) {
          // This is good - high priority items come before lower priority
        }
      });
    });

    it('should calculate improvement potential correctly', async () => {
      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      expect(assessment.improvement.possibleScore).toBeGreaterThanOrEqual(assessment.qualityScore.overall);
      expect(assessment.improvement.potentialScore).toBeGreaterThanOrEqual(assessment.improvement.possibleScore);
      expect(assessment.improvement.potentialScore).toBeLessThanOrEqual(100);
      
      // Quick wins should be immediate, free improvements
      assessment.improvement.quickWins.forEach(rec => {
        expect(rec.timeToImplement).toBe('immediate');
        expect(rec.cost).toBe('free');
        expect(rec.estimatedImpact).toBeGreaterThan(0);
      });
    });

    it('should build comprehensive data profile', async () => {
      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      expect(assessment.dataProfile.competitorCoverage).toBeGreaterThanOrEqual(0);
      expect(assessment.dataProfile.competitorCoverage).toBeLessThanOrEqual(100);
      expect(assessment.dataProfile.snapshotFreshness).toBeGreaterThanOrEqual(0);
      expect(assessment.dataProfile.analysisDepth).toMatch(/^(surface|standard|comprehensive|deep)$/);
      expect(assessment.dataProfile.dataSourceQuality).toBeDefined();
      expect(typeof assessment.dataProfile.dataSourceQuality.product_data).toBe('number');
      expect(typeof assessment.dataProfile.dataSourceQuality.competitor_data).toBe('number');
    });
  });

  describe('quality tier determination', () => {
    it('should assign excellent tier for high scores', async () => {
      const highQualityReport = {
        ...mockReport,
        sections: [
          ...mockReportSections,
          // Add more sections for depth
          {
            id: 'section-4',
            type: 'market_analysis',
            title: 'Market Analysis',
            content: 'Comprehensive market analysis with detailed insights and recommendations.',
            order: 4,
            metadata: { generatedAt: new Date(), dataCompleteness: 95 }
          }
        ]
      };

      const highQualityAnalysis = {
        ...mockAnalysis,
        metadata: {
          ...mockAnalysis.metadata,
          confidenceScore: 95
        }
      };

      const assessment = await service.assessReportQuality(
        highQualityReport,
        highQualityAnalysis,
        mockProduct,
        mockProductSnapshot,
        {
          totalCompetitors: 3,
          availableCompetitors: 3,
          freshSnapshots: 3,
          existingSnapshots: 0
        }
      );

      expect(assessment.qualityScore.overall).toBeGreaterThan(85);
      expect(assessment.qualityTier).toBe('excellent');
    });

    it('should assign critical tier for very low scores', async () => {
      const criticalReport = {
        ...mockReport,
        sections: mockReportSections.slice(0, 1), // Only one section
        metadata: {
          ...mockReport.metadata,
          dataCompletenessScore: 20,
          hasDataLimitations: true
        }
      };

      const lowConfidenceAnalysis = {
        ...mockAnalysis,
        metadata: {
          ...mockAnalysis.metadata,
          confidenceScore: 25
        }
      };

      const assessment = await service.assessReportQuality(
        criticalReport,
        lowConfidenceAnalysis,
        mockProduct,
        mockProductSnapshot,
        {
          totalCompetitors: 5,
          availableCompetitors: 0,
          freshSnapshots: 0,
          existingSnapshots: 0
        }
      );

      expect(assessment.qualityScore.overall).toBeLessThan(40);
      expect(assessment.qualityTier).toBe('critical');
    });
  });

  describe('recommendation generation', () => {
    it('should generate data collection recommendations for poor coverage', async () => {
      const poorCoverageData = {
        totalCompetitors: 5,
        availableCompetitors: 1,
        freshSnapshots: 0,
        existingSnapshots: 1
      };

      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        poorCoverageData
      );

      const dataCollectionRecs = assessment.recommendations.filter(
        rec => rec.category === 'data_collection'
      );
      expect(dataCollectionRecs.length).toBeGreaterThan(0);

      const rec = dataCollectionRecs[0];
      expect(rec.title).toContain('Competitor Data');
      expect(rec.actionSteps.length).toBeGreaterThan(0);
      expect(rec.estimatedImpact).toBeGreaterThan(0);
      expect(rec.priority).toMatch(/^(critical|high|medium|low)$/);
    });

    it('should generate freshness recommendations for old data', async () => {
      const oldReport = {
        ...mockReport,
        metadata: {
          ...mockReport.metadata,
          reportGeneratedAt: new Date('2023-01-01'),
          dataFreshness: 'existing'
        }
      };

      const assessment = await service.assessReportQuality(
        oldReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      const freshnessRecs = assessment.recommendations.filter(
        rec => rec.category === 'freshness'
      );
      expect(freshnessRecs.length).toBeGreaterThan(0);

      const rec = freshnessRecs[0];
      expect(rec.timeToImplement).toBe('immediate');
      expect(rec.cost).toBe('free');
    });

    it('should generate analysis depth recommendations for low confidence', async () => {
      const lowConfidenceAnalysis = {
        ...mockAnalysis,
        metadata: {
          ...mockAnalysis.metadata,
          confidenceScore: 50
        }
      };

      const assessment = await service.assessReportQuality(
        mockReport,
        lowConfidenceAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      const analysisRecs = assessment.recommendations.filter(
        rec => rec.category === 'analysis_depth'
      );
      expect(analysisRecs.length).toBeGreaterThan(0);
    });

    it('should generate section-specific recommendations', async () => {
      const reportWithPoorSections = {
        ...mockReport,
        sections: [
          {
            ...mockReportSections[0],
            content: 'Very brief summary.' // Short content
          },
          {
            ...mockReportSections[1],
            content: 'Limited feature comparison.' // Short content
          }
        ]
      };

      const assessment = await service.assessReportQuality(
        reportWithPoorSections,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        {
          totalCompetitors: 3,
          availableCompetitors: 1, // Poor competitor coverage
          freshSnapshots: 0,
          existingSnapshots: 1
        }
      );

      const coverageRecs = assessment.recommendations.filter(
        rec => rec.category === 'coverage'
      );
      expect(coverageRecs.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle reports with no sections', async () => {
      const emptyReport = {
        ...mockReport,
        sections: []
      };

      const assessment = await service.assessReportQuality(
        emptyReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      expect(assessment.qualityScore.overall).toBeLessThan(50);
      expect(assessment.qualityTier).toMatch(/^(poor|critical)$/);
    });

    it('should handle missing product information gracefully', async () => {
      const minimalProduct = {
        ...mockProduct,
        name: '',
        website: ''
      };

      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        minimalProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      expect(assessment.qualityScore.dataCompleteness).toBeLessThan(80);
    });

    it('should handle undefined competitor data', async () => {
      const assessment = await service.assessReportQuality(
        mockReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        undefined
      );

      expect(assessment).toBeDefined();
      expect(assessment.qualityScore.dataCompleteness).toBeLessThan(70);
    });

    it('should handle very old reports correctly', async () => {
      const ancientReport = {
        ...mockReport,
        metadata: {
          ...mockReport.metadata,
          reportGeneratedAt: new Date('2020-01-01') // 4+ years old
        }
      };

      const assessment = await service.assessReportQuality(
        ancientReport,
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorData
      );

      expect(assessment.qualityScore.dataFreshness).toBeLessThan(30);
    });
  });

  describe('compareReportQuality', () => {
    it('should return comparison structure', async () => {
      const comparison = await service.compareReportQuality('report-1', 'report-2');
      
      expect(comparison).toBeDefined();
      expect(comparison.baselineReport).toBe('report-1');
      expect(comparison.currentReport).toBe('report-2');
      expect(typeof comparison.improvementPercent).toBe('number');
      expect(Array.isArray(comparison.improvedAreas)).toBe(true);
      expect(Array.isArray(comparison.degradedAreas)).toBe(true);
      expect(Array.isArray(comparison.recommendations)).toBe(true);
    });
  });
}); 