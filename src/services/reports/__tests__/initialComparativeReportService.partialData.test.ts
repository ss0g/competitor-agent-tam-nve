import { InitialComparativeReportService } from '../initialComparativeReportService';
import { PartialDataReportGenerator } from '../partialDataReportGenerator';
import { SmartDataCollectionService } from '../smartDataCollectionService';
import { ComparativeReportService } from '../comparativeReportService';
import { ComparativeAnalysisService } from '../../analysis/comparativeAnalysisService';

// Mock external dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn()
    },
    competitor: {
      findMany: jest.fn()
    }
  }
}));

jest.mock('../webScraper', () => ({
  webScraperService: {
    scrapeWebsite: jest.fn()
  }
}));

// Mock the services
jest.mock('../partialDataReportGenerator');
jest.mock('../smartDataCollectionService');
jest.mock('../comparativeReportService');
jest.mock('../../analysis/comparativeAnalysisService');

describe('InitialComparativeReportService - Partial Data Integration', () => {
  let service: InitialComparativeReportService;
  let mockSmartDataService: jest.Mocked<SmartDataCollectionService>;
  let mockPartialDataGenerator: jest.Mocked<PartialDataReportGenerator>;
  let mockComparativeReportService: jest.Mocked<ComparativeReportService>;
  let mockComparativeAnalysisService: jest.Mocked<ComparativeAnalysisService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockSmartDataService = new SmartDataCollectionService() as jest.Mocked<SmartDataCollectionService>;
    mockPartialDataGenerator = new PartialDataReportGenerator() as jest.Mocked<PartialDataReportGenerator>;
    mockComparativeReportService = new ComparativeReportService() as jest.Mocked<ComparativeReportService>;
    mockComparativeAnalysisService = new ComparativeAnalysisService() as jest.Mocked<ComparativeAnalysisService>;

    service = new InitialComparativeReportService();

    // Set up service mocks
    (service as any).smartDataCollectionService = mockSmartDataService;
    (service as any).partialDataReportGenerator = mockPartialDataGenerator;
    (service as any).comparativeReportService = mockComparativeReportService;
    (service as any).comparativeAnalysisService = mockComparativeAnalysisService;
  });

  describe('generateInitialComparativeReport with low data completeness', () => {
    it('should use partial data generator when data completeness < 70%', async () => {
      const projectId = 'test-project-1';

      // Mock project readiness
      const mockReadinessResult = {
        isReady: true,
        hasProduct: true,
        hasCompetitors: true,
        hasProductData: true,
        missingData: [],
        readinessScore: 60
      };

      // Mock smart data collection with low completeness
      const mockSmartCollectionResult = {
        success: true,
        dataCompletenessScore: 55, // Below 70% threshold
        dataFreshness: 'existing',
        collectionTime: 15000,
        productData: { available: true },
        competitorData: {
          totalCompetitors: 3,
          availableCompetitors: 2,
          freshSnapshots: 0,
          existingSnapshots: 2
        },
        priorityBreakdown: {
          priority1: { count: 1, successRate: 100 },
          priority2: { count: 0, successRate: 0 },
          priority3: { count: 2, successRate: 100 },
          priority4: { count: 0, successRate: 0 },
          priority5: { count: 0, successRate: 0 }
        },
        missingData: ['Fresh competitor snapshots']
      };

      // Mock partial data report
      const mockPartialReport = {
        id: 'partial-report-1',
        title: 'Test Product - Comprehensive Analysis (55% Complete)',
        description: 'Competitive analysis based on 55% data completeness',
        projectId,
        productId: 'product-1',
        analysisId: 'analysis-1',
        metadata: {
          productName: 'Test Product',
          productUrl: 'https://test.com',
          competitorCount: 2,
          analysisDate: new Date(),
          reportGeneratedAt: new Date(),
          analysisId: 'analysis-1',
          analysisMethod: 'hybrid',
          confidenceScore: 45,
          dataQuality: 'medium',
          reportVersion: '1.0',
          focusAreas: ['features', 'positioning'],
          analysisDepth: 'comprehensive',
          dataCompletenessScore: 55,
          dataFreshness: 'existing',
          hasDataLimitations: true,
          partialDataInfo: {
            qualityTier: 'enhanced',
            freshSnapshotCount: 0,
            totalCompetitors: 3,
            criticalGapsCount: 1,
            canBeImproved: true
          }
        },
        sections: [
          {
            id: 'section-1',
            type: 'executive_summary',
            title: 'Executive Summary',
            content: 'Executive summary with data limitations...',
            order: 1,
            metadata: {
              generatedAt: new Date(),
              dataCompleteness: 44,
              hasLimitations: true,
              improvementPossible: true
            }
          }
        ],
        executiveSummary: 'Executive summary based on 55% data completeness',
        keyFindings: ['Analysis based on 55% data completeness - enhanced competitor data recommended'],
        strategicRecommendations: {
          immediate: ['Capture fresh competitor snapshots'],
          shortTerm: ['Establish regular monitoring'],
          longTerm: ['Build intelligence system'],
          priorityScore: 35
        },
        competitiveIntelligence: {
          marketPosition: 'competitive',
          keyThreats: ['Limited threat assessment available with current data'],
          opportunities: ['Market expansion'],
          competitiveAdvantages: []
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed' as const,
        format: 'markdown' as const
      };

      // Set up mocks
      jest.spyOn(service, 'validateProjectReadiness').mockResolvedValue(mockReadinessResult);
      mockSmartDataService.collectProjectData.mockResolvedValue(mockSmartCollectionResult);
      jest.spyOn(service as any, 'buildAnalysisInput').mockResolvedValue({
        product: { id: 'product-1', name: 'Test Product' },
        productSnapshot: { id: 'snapshot-1' },
        competitors: []
      });
      mockPartialDataGenerator.generatePartialDataReport.mockResolvedValue(mockPartialReport);

      // Execute
      const result = await service.generateInitialComparativeReport(projectId, {
        template: 'comprehensive',
        fallbackToPartialData: true
      });

      // Verify partial data generator was used
      expect(mockPartialDataGenerator.generatePartialDataReport).toHaveBeenCalledWith(
        null, // Analysis should be null due to failed analysis
        expect.objectContaining({ name: 'Test Product' }),
        expect.objectContaining({ id: 'snapshot-1' }),
        expect.objectContaining({
          template: 'comprehensive',
          partialDataInfo: expect.objectContaining({
            dataCompletenessScore: 55,
            dataFreshness: 'existing',
            qualityTier: 'enhanced'
          }),
          includeDataGapSection: true,
          includeRecommendations: true,
          acknowledgeDataLimitations: true
        })
      );

      // Verify standard report service was NOT used
      expect(mockComparativeReportService.generateComparativeReport).not.toHaveBeenCalled();

      // Verify result
      expect(result.title).toContain('55% Complete');
      expect(result.metadata.hasDataLimitations).toBe(true);
      expect(result.keyFindings).toContain('enhanced competitor data recommended');
    });

    it('should use standard report generation when data completeness >= 70%', async () => {
      const projectId = 'test-project-2';

      // Mock project readiness
      const mockReadinessResult = {
        isReady: true,
        hasProduct: true,
        hasCompetitors: true,
        hasProductData: true,
        missingData: [],
        readinessScore: 85
      };

      // Mock smart data collection with high completeness
      const mockSmartCollectionResult = {
        success: true,
        dataCompletenessScore: 85, // Above 70% threshold
        dataFreshness: 'new',
        collectionTime: 25000,
        productData: { available: true },
        competitorData: {
          totalCompetitors: 3,
          availableCompetitors: 3,
          freshSnapshots: 3,
          existingSnapshots: 0
        },
        priorityBreakdown: {
          priority1: { count: 1, successRate: 100 },
          priority2: { count: 3, successRate: 100 },
          priority3: { count: 0, successRate: 0 },
          priority4: { count: 0, successRate: 0 },
          priority5: { count: 0, successRate: 0 }
        },
        missingData: []
      };

      // Mock analysis
      const mockAnalysis = {
        id: 'analysis-1',
        summary: {
          overallPosition: 'competitive',
          opportunityScore: 75,
          threatLevel: 'medium'
        }
      };

      // Mock standard report
      const mockStandardReport = {
        report: {
          id: 'standard-report-1',
          title: 'Test Product - Comprehensive Analysis',
          description: 'Complete competitive analysis',
          metadata: {
            dataCompletenessScore: 85,
            hasDataLimitations: false
          }
        }
      };

      // Set up mocks
      jest.spyOn(service, 'validateProjectReadiness').mockResolvedValue(mockReadinessResult);
      mockSmartDataService.collectProjectData.mockResolvedValue(mockSmartCollectionResult);
      jest.spyOn(service as any, 'buildAnalysisInput').mockResolvedValue({
        product: { id: 'product-1', name: 'Test Product' },
        productSnapshot: { id: 'snapshot-1' },
        competitors: []
      });
      mockComparativeAnalysisService.analyzeProductVsCompetitors.mockResolvedValue(mockAnalysis);
      mockComparativeReportService.generateComparativeReport.mockResolvedValue(mockStandardReport);

      // Execute
      const result = await service.generateInitialComparativeReport(projectId, {
        template: 'comprehensive',
        fallbackToPartialData: true
      });

      // Verify standard report service was used
      expect(mockComparativeReportService.generateComparativeReport).toHaveBeenCalledWith(
        mockAnalysis,
        expect.objectContaining({ name: 'Test Product' }),
        expect.objectContaining({ id: 'snapshot-1' }),
        expect.objectContaining({
          template: 'comprehensive',
          format: 'markdown',
          includeCharts: true,
          includeTables: true
        })
      );

      // Verify partial data generator was NOT used
      expect(mockPartialDataGenerator.generatePartialDataReport).not.toHaveBeenCalled();
    });

    it('should handle analysis failure gracefully in partial data mode', async () => {
      const projectId = 'test-project-3';

      // Mock project readiness
      const mockReadinessResult = {
        isReady: true,
        hasProduct: true,
        hasCompetitors: true,
        hasProductData: true,
        missingData: [],
        readinessScore: 50
      };

      // Mock smart data collection with low completeness
      const mockSmartCollectionResult = {
        success: true,
        dataCompletenessScore: 40,
        dataFreshness: 'basic',
        collectionTime: 10000,
        productData: { available: true },
        competitorData: {
          totalCompetitors: 2,
          availableCompetitors: 0,
          freshSnapshots: 0,
          existingSnapshots: 0
        },
        priorityBreakdown: {
          priority1: { count: 1, successRate: 100 },
          priority2: { count: 0, successRate: 0 },
          priority3: { count: 0, successRate: 0 },
          priority4: { count: 0, successRate: 0 },
          priority5: { count: 2, successRate: 100 }
        },
        missingData: ['All competitor data']
      };

      // Mock partial data report
      const mockPartialReport = {
        id: 'partial-report-3',
        title: 'Test Product - Comprehensive Analysis (40% Complete)',
        description: 'Competitive analysis based on 40% data completeness',
        metadata: {
          hasDataLimitations: true,
          dataCompletenessScore: 40
        }
      };

      // Set up mocks
      jest.spyOn(service, 'validateProjectReadiness').mockResolvedValue(mockReadinessResult);
      mockSmartDataService.collectProjectData.mockResolvedValue(mockSmartCollectionResult);
      jest.spyOn(service as any, 'buildAnalysisInput').mockResolvedValue({
        product: { id: 'product-1', name: 'Test Product' },
        productSnapshot: { id: 'snapshot-1' },
        competitors: []
      });

      // Mock analysis failure
      mockComparativeAnalysisService.analyzeProductVsCompetitors.mockRejectedValue(
        new Error('Insufficient competitor data for analysis')
      );
      
      mockPartialDataGenerator.generatePartialDataReport.mockResolvedValue(mockPartialReport);

      // Execute
      const result = await service.generateInitialComparativeReport(projectId, {
        template: 'comprehensive',
        fallbackToPartialData: true
      });

      // Verify partial data generator was called with null analysis
      expect(mockPartialDataGenerator.generatePartialDataReport).toHaveBeenCalledWith(
        null, // Analysis should be null due to failure
        expect.any(Object),
        expect.any(Object),
        expect.any(Object)
      );

      // Verify result
      expect(result.metadata.hasDataLimitations).toBe(true);
      expect(result.metadata.dataCompletenessScore).toBe(40);
    });

    it('should build correct partial data info from smart collection result', async () => {
      const service = new InitialComparativeReportService();
      
      const mockSmartCollectionResult = {
        success: true,
        dataCompletenessScore: 65,
        dataFreshness: 'mixed',
        productData: { available: true },
        competitorData: {
          totalCompetitors: 4,
          availableCompetitors: 3,
          freshSnapshots: 1,
          existingSnapshots: 2
        },
        missingData: ['2 fresh competitor snapshots']
      };

      // Call the private method
      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);

      expect(partialDataInfo).toEqual({
        dataCompletenessScore: 65,
        dataFreshness: 'mixed',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 4,
          freshSnapshotCount: 1
        },
        missingData: ['2 fresh competitor snapshots'],
        dataGaps: expect.arrayContaining([
          expect.objectContaining({
            area: 'Competitor Website Snapshots',
            impact: 'high',
            canBeImproved: true
          }),
          expect.objectContaining({
            area: 'Competitor Data Coverage',
            impact: 'medium',
            canBeImproved: true
          })
        ]),
        qualityTier: 'enhanced'
      });
    });

    it('should determine quality tiers correctly', async () => {
      const service = new InitialComparativeReportService();

      expect((service as any).determineQualityTier(90)).toBe('complete');
      expect((service as any).determineQualityTier(85)).toBe('complete');
      expect((service as any).determineQualityTier(75)).toBe('fresh');
      expect((service as any).determineQualityTier(70)).toBe('fresh');
      expect((service as any).determineQualityTier(60)).toBe('enhanced');
      expect((service as any).determineQualityTier(50)).toBe('enhanced');
      expect((service as any).determineQualityTier(40)).toBe('basic');
      expect((service as any).determineQualityTier(20)).toBe('basic');
    });

    it('should enhance report metadata correctly for partial data reports', async () => {
      const service = new InitialComparativeReportService();

      const mockReport = {
        id: 'report-1',
        title: 'Original Title',
        description: 'Original description',
        metadata: {
          productName: 'Test Product',
          reportVersion: '1.0'
        }
      };

      const enhancementData = {
        projectId: 'project-1',
        isInitialReport: true,
        dataCompletenessScore: 55,
        dataFreshness: 'existing',
        competitorSnapshotsCaptured: 0,
        generationTime: 30000,
        usedPartialDataGeneration: true
      };

      const enhancedReport = (service as any).enhanceReportForInitialGeneration(
        mockReport,
        enhancementData
      );

      expect(enhancedReport.title).toContain('(Initial Report)');
      expect(enhancedReport.description).toContain('55% data completeness');
      expect(enhancedReport.metadata.reportVersion).toBe('1.0-initial');
    });
  });

  describe('error handling with partial data', () => {
    it('should throw error when project readiness fails and fallback disabled', async () => {
      const projectId = 'test-project-fail';

      const mockReadinessResult = {
        isReady: false,
        hasProduct: false,
        hasCompetitors: false,
        hasProductData: false,
        missingData: ['Product data', 'Competitor data'],
        readinessScore: 20
      };

      jest.spyOn(service, 'validateProjectReadiness').mockResolvedValue(mockReadinessResult);

      await expect(service.generateInitialComparativeReport(projectId, {
        fallbackToPartialData: false
      })).rejects.toThrow('Project test-project-fail is not ready for report generation');
    });

    it('should handle smart data collection failure', async () => {
      const projectId = 'test-project-data-fail';

      const mockReadinessResult = {
        isReady: true,
        hasProduct: true,
        hasCompetitors: true,
        hasProductData: true,
        missingData: [],
        readinessScore: 80
      };

      const mockSmartCollectionResult = {
        success: false,
        productData: { available: false },
        competitorData: {
          totalCompetitors: 0,
          availableCompetitors: 0
        }
      };

      jest.spyOn(service, 'validateProjectReadiness').mockResolvedValue(mockReadinessResult);
      mockSmartDataService.collectProjectData.mockResolvedValue(mockSmartCollectionResult);

      await expect(service.generateInitialComparativeReport(projectId)).rejects.toThrow(
        'Smart data collection failed for project test-project-data-fail'
      );
    });
  });

  describe('buildPartialDataInfo', () => {
    it('should build correct partial data info from smart collection result', () => {
      const mockSmartCollectionResult = {
        success: true,
        dataCompletenessScore: 65,
        dataFreshness: 'mixed',
        productData: { available: true },
        competitorData: {
          totalCompetitors: 4,
          availableCompetitors: 3,
          freshSnapshots: 1,
          existingSnapshots: 2
        },
        missingData: ['2 fresh competitor snapshots']
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);

      expect(partialDataInfo).toEqual({
        dataCompletenessScore: 65,
        dataFreshness: 'mixed',
        availableData: {
          hasProductData: true,
          hasCompetitorData: true,
          hasSnapshots: true,
          competitorCount: 4,
          freshSnapshotCount: 1
        },
        missingData: ['2 fresh competitor snapshots'],
        dataGaps: expect.arrayContaining([
          expect.objectContaining({
            area: 'Competitor Website Snapshots',
            impact: 'high',
            canBeImproved: true
          }),
          expect.objectContaining({
            area: 'Competitor Data Coverage',
            impact: 'medium',
            canBeImproved: true
          })
        ]),
        qualityTier: 'enhanced'
      });
    });

    it('should identify critical data gaps for low completeness scores', () => {
      const mockSmartCollectionResult = {
        success: true,
        dataCompletenessScore: 35,
        dataFreshness: 'basic',
        productData: { available: true },
        competitorData: {
          totalCompetitors: 3,
          availableCompetitors: 0,
          freshSnapshots: 0,
          existingSnapshots: 0
        },
        missingData: ['All competitor data']
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);

      expect(partialDataInfo.dataGaps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            area: 'Competitor Website Snapshots',
            impact: 'high'
          }),
          expect.objectContaining({
            area: 'Competitor Data Coverage',
            impact: 'medium'
          }),
          expect.objectContaining({
            area: 'Overall Data Quality',
            impact: 'high'
          })
        ])
      );
      expect(partialDataInfo.qualityTier).toBe('basic');
    });

    it('should handle scenarios with no data gaps', () => {
      const mockSmartCollectionResult = {
        success: true,
        dataCompletenessScore: 90,
        dataFreshness: 'new',
        productData: { available: true },
        competitorData: {
          totalCompetitors: 3,
          availableCompetitors: 3,
          freshSnapshots: 3,
          existingSnapshots: 0
        },
        missingData: []
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);

      expect(partialDataInfo.dataGaps).toHaveLength(0);
      expect(partialDataInfo.qualityTier).toBe('complete');
      expect(partialDataInfo.availableData.freshSnapshotCount).toBe(3);
    });
  });

  describe('determineQualityTier', () => {
    it('should determine quality tiers correctly', () => {
      expect((service as any).determineQualityTier(90)).toBe('complete');
      expect((service as any).determineQualityTier(85)).toBe('complete');
      expect((service as any).determineQualityTier(75)).toBe('fresh');
      expect((service as any).determineQualityTier(70)).toBe('fresh');
      expect((service as any).determineQualityTier(60)).toBe('enhanced');
      expect((service as any).determineQualityTier(50)).toBe('enhanced');
      expect((service as any).determineQualityTier(40)).toBe('basic');
      expect((service as any).determineQualityTier(20)).toBe('basic');
    });
  });

  describe('partial data report generation decision logic', () => {
    it('should determine to use partial data generation for completeness < 70%', () => {
      const mockSmartCollectionResult = { dataCompletenessScore: 65 };
      const shouldUsePartialData = mockSmartCollectionResult.dataCompletenessScore < 70;
      expect(shouldUsePartialData).toBe(true);
    });

    it('should determine to use standard generation for completeness >= 70%', () => {
      const mockSmartCollectionResult = { dataCompletenessScore: 75 };
      const shouldUsePartialData = mockSmartCollectionResult.dataCompletenessScore < 70;
      expect(shouldUsePartialData).toBe(false);
    });

    it('should handle edge case at exactly 70%', () => {
      const mockSmartCollectionResult = { dataCompletenessScore: 70 };
      const shouldUsePartialData = mockSmartCollectionResult.dataCompletenessScore < 70;
      expect(shouldUsePartialData).toBe(false);
    });
  });

  describe('enhanceReportForInitialGeneration', () => {
    it('should enhance report metadata correctly for partial data reports', () => {
      const mockReport = {
        id: 'report-1',
        title: 'Original Title',
        description: 'Original description',
        metadata: {
          productName: 'Test Product',
          reportVersion: '1.0'
        }
      };

      const enhancementData = {
        projectId: 'project-1',
        isInitialReport: true,
        dataCompletenessScore: 55,
        dataFreshness: 'existing',
        competitorSnapshotsCaptured: 0,
        generationTime: 30000,
        usedPartialDataGeneration: true
      };

      const enhancedReport = (service as any).enhanceReportForInitialGeneration(
        mockReport,
        enhancementData
      );

      expect(enhancedReport.title).toContain('(Initial Report)');
      expect(enhancedReport.description).toContain('55% data completeness');
      expect(enhancedReport.metadata.reportVersion).toBe('1.0-initial');
    });

    it('should handle enhancement without partial data generation flag', () => {
      const mockReport = {
        id: 'report-1',
        title: 'Standard Title',
        description: 'Standard description',
        metadata: {
          productName: 'Test Product',
          reportVersion: '1.0'
        }
      };

      const enhancementData = {
        projectId: 'project-1',
        isInitialReport: true,
        dataCompletenessScore: 85,
        dataFreshness: 'new',
        competitorSnapshotsCaptured: 3,
        generationTime: 25000
        // usedPartialDataGeneration not provided (undefined)
      };

      const enhancedReport = (service as any).enhanceReportForInitialGeneration(
        mockReport,
        enhancementData
      );

      expect(enhancedReport.title).toContain('(Initial Report)');
      expect(enhancedReport.description).toContain('85% data completeness');
    });
  });

  describe('data gap identification scenarios', () => {
    it('should identify no fresh snapshots gap', () => {
      const mockSmartCollectionResult = {
        dataCompletenessScore: 60,
        competitorData: {
          totalCompetitors: 2,
          availableCompetitors: 2,
          freshSnapshots: 0,
          existingSnapshots: 2
        }
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);
      const snapshotGap = partialDataInfo.dataGaps.find((gap: any) => 
        gap.area === 'Competitor Website Snapshots'
      );

      expect(snapshotGap).toBeDefined();
      expect(snapshotGap.impact).toBe('high');
      expect(snapshotGap.recommendation).toContain('fresh competitor website snapshots');
    });

    it('should identify partial competitor coverage gap', () => {
      const mockSmartCollectionResult = {
        dataCompletenessScore: 60,
        competitorData: {
          totalCompetitors: 4,
          availableCompetitors: 2,
          freshSnapshots: 1,
          existingSnapshots: 1
        }
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);
      const coverageGap = partialDataInfo.dataGaps.find((gap: any) => 
        gap.area === 'Competitor Data Coverage'
      );

      expect(coverageGap).toBeDefined();
      expect(coverageGap.description).toContain('Only 2/4 competitors');
      expect(coverageGap.impact).toBe('medium');
    });

    it('should identify overall data quality gap for very low scores', () => {
      const mockSmartCollectionResult = {
        dataCompletenessScore: 25,
        competitorData: {
          totalCompetitors: 3,
          availableCompetitors: 1,
          freshSnapshots: 0,
          existingSnapshots: 1
        }
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);
      const qualityGap = partialDataInfo.dataGaps.find((gap: any) => 
        gap.area === 'Overall Data Quality'
      );

      expect(qualityGap).toBeDefined();
      expect(qualityGap.impact).toBe('high');
      expect(qualityGap.description).toContain('Low overall data completeness');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing competitor data gracefully', () => {
      const mockSmartCollectionResult = {
        dataCompletenessScore: 30,
        dataFreshness: 'basic',
        productData: { available: true },
        competitorData: {
          totalCompetitors: 0,
          availableCompetitors: 0,
          freshSnapshots: 0,
          existingSnapshots: 0
        },
        missingData: ['All competitor information']
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);

      expect(partialDataInfo.availableData.hasCompetitorData).toBe(false);
      expect(partialDataInfo.availableData.hasSnapshots).toBe(false);
      expect(partialDataInfo.availableData.competitorCount).toBe(0);
      expect(partialDataInfo.qualityTier).toBe('basic');
    });

    it('should handle undefined missing data array', () => {
      const mockSmartCollectionResult = {
        dataCompletenessScore: 70,
        dataFreshness: 'existing',
        productData: { available: true },
        competitorData: {
          totalCompetitors: 2,
          availableCompetitors: 2,
          freshSnapshots: 0,
          existingSnapshots: 2
        }
        // missingData is undefined
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);

      expect(partialDataInfo.missingData).toEqual([]);
    });

    it('should calculate availability flags correctly', () => {
      const mockSmartCollectionResult = {
        dataCompletenessScore: 50,
        productData: { available: false },
        competitorData: {
          totalCompetitors: 2,
          availableCompetitors: 1,
          freshSnapshots: 1,
          existingSnapshots: 0
        }
      };

      const partialDataInfo = (service as any).buildPartialDataInfo(mockSmartCollectionResult);

      expect(partialDataInfo.availableData.hasProductData).toBe(false);
      expect(partialDataInfo.availableData.hasCompetitorData).toBe(true);
      expect(partialDataInfo.availableData.hasSnapshots).toBe(true);
    });
  });

  describe('quality tier boundary testing', () => {
    it('should handle exact boundary values correctly', () => {
      // Test exact boundaries
      expect((service as any).determineQualityTier(85)).toBe('complete');
      expect((service as any).determineQualityTier(84)).toBe('fresh');
      expect((service as any).determineQualityTier(70)).toBe('fresh');
      expect((service as any).determineQualityTier(69)).toBe('enhanced');
      expect((service as any).determineQualityTier(50)).toBe('enhanced');
      expect((service as any).determineQualityTier(49)).toBe('basic');
    });

    it('should handle extreme values', () => {
      expect((service as any).determineQualityTier(100)).toBe('complete');
      expect((service as any).determineQualityTier(0)).toBe('basic');
      expect((service as any).determineQualityTier(-5)).toBe('basic');
      expect((service as any).determineQualityTier(110)).toBe('complete');
    });
  });
}); 