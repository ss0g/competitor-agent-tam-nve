import { 
  ComparativeAnalysisService 
} from '@/services/analysis/comparativeAnalysisService';
import { 
  ComparativeReportService 
} from '@/services/reports/comparativeReportService';
import { 
  UserExperienceAnalyzer 
} from '@/services/analysis/userExperienceAnalyzer';
import { 
  ProductScrapingService 
} from '@/services/productScrapingService';
import { 
  AutoReportGenerationService 
} from '@/services/autoReportGenerationService';
import { jest } from '@jest/globals';
import { IntegrationServiceMocks } from './serviceMockConfig';
import { IntegrationRepositoryMocks } from './repositoryMocks';

/**
 * Integration Mock Factory - Implements realistic data flow patterns
 * between mocked services to eliminate external dependencies while
 * maintaining service interaction patterns.
 */
export class IntegrationMockFactory {
  
  /**
   * Creates a fully mocked ComparativeAnalysisService with realistic data flow
   */
  static createMockedComparativeAnalysisService(): ComparativeAnalysisService {
    const mockService = {
      analyzeProductVsCompetitors: jest.fn().mockImplementation(async (input: any) => {
        // Simulate realistic analysis workflow
        const correlationId = `analysis-${Date.now()}`;
        
        // Validate input structure (realistic service behavior)
        if (!input?.product || !input?.productSnapshot || !input?.competitors) {
          throw new Error('Invalid analysis input structure');
        }
        
        // Simulate processing time and token usage
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Return realistic analysis response with correlation tracking
        return {
          ...IntegrationServiceMocks.analysisResponse,
          id: correlationId,
          productId: input.product.id,
          competitorIds: input.competitors.map((c: any) => c.competitor?.id || 'unknown'),
          metadata: {
            ...IntegrationServiceMocks.analysisResponse.metadata,
            correlationId,
            analyzedAt: new Date().toISOString(),
            inputValidation: {
              productValid: true,
              competitorsCount: input.competitors.length,
              snapshotSize: input.productSnapshot.content?.text?.length || 0
            }
          }
        };
      }),
      
      executeAnalysis: jest.fn().mockImplementation(async (input) => {
        const correlationId = `exec-${Date.now()}`;
        
        // Simulate BedrockService interaction (mocked)
        const bedrockResponse = IntegrationServiceMocks.bedrockResponse;
        
        return {
          ...IntegrationServiceMocks.analysisExecutionResponse,
          correlationId,
          bedrockMetadata: bedrockResponse.metadata,
          tokensUsed: bedrockResponse.tokensUsed,
          processingTime: 1200
        };
      }),
      
      updateAnalysisConfiguration: jest.fn().mockImplementation(async (config) => {
        return {
          success: true,
          configuration: config,
          updatedAt: new Date().toISOString()
        };
      })
    };
    
    return mockService as unknown as ComparativeAnalysisService;
  }
  
  /**
   * Creates a fully mocked ComparativeReportService with dependency injection
   */
  static createMockedComparativeReportService(): ComparativeReportService {
    const mockService = {
      generateComparativeReport: jest.fn().mockImplementation(async (analysis, product, snapshot, options) => {
        // Validate service-to-service data flow
        if (!analysis?.id || !analysis?.summary) {
          throw new Error('Invalid analysis data for report generation');
        }
        
        // Simulate realistic report generation workflow
        const reportId = `report-${Date.now()}`;
        
        // Mock repository interaction
        const repositoryResult = await IntegrationRepositoryMocks.comparativeReportRepository.create({
          id: reportId,
          title: `Comparative Analysis: ${product.name}`,
          analysisId: analysis.id
        });
        
        return {
          ...IntegrationServiceMocks.reportResponse,
          report: {
            ...IntegrationServiceMocks.reportResponse.report,
            id: reportId,
            title: `Comparative Analysis: ${product.name}`,
            analysisId: analysis.id,
            metadata: {
              correlationId: analysis.metadata?.correlationId,
              generatedAt: new Date().toISOString(),
              basedOnAnalysis: analysis.id,
              repositoryId: repositoryResult.id
            }
          }
        };
      }),
      
      generateUXEnhancedReport: jest.fn().mockImplementation(async (analysis, product, snapshot, competitors) => {
        // Validate cross-service integration
        if (!analysis?.metadata?.correlationId) {
          throw new Error('Analysis missing correlation metadata for UX integration');
        }
        
        // Mock UX analyzer integration
        const uxAnalysis = IntegrationServiceMocks.uxAnalysisResponse;
        
        const reportId = `ux-report-${Date.now()}`;
        
        return {
          ...IntegrationServiceMocks.uxReportResponse,
          report: {
            ...IntegrationServiceMocks.uxReportResponse.report,
            id: reportId,
            title: `UX-Enhanced Analysis: ${product.name}`,
            analysisId: analysis.id,
            uxAnalysisData: uxAnalysis,
            metadata: {
              correlationId: analysis.metadata.correlationId,
              uxIntegration: true,
              competitorsAnalyzed: competitors.length
            }
          }
        };
      }),
      
      getAvailableTemplates: jest.fn().mockReturnValue(IntegrationServiceMocks.templateResponse),
      
      validateAnalysisForReporting: jest.fn().mockImplementation((analysis) => {
        if (!analysis?.id || !analysis?.summary) {
          throw new Error('Analysis validation failed - missing required fields');
        }
        return true;
      })
    };
    
    return mockService as unknown as ComparativeReportService;
  }
  
  /**
   * Creates a fully mocked UserExperienceAnalyzer with realistic UX analysis patterns
   */
  static createMockedUserExperienceAnalyzer(): UserExperienceAnalyzer {
    const mockService = {
      analyzeProductVsCompetitors: jest.fn().mockImplementation(async (product, competitors, options) => {
        // Simulate realistic UX analysis processing
        const correlationId = `ux-${Date.now()}`;
        
        // Validate UX analysis input
        if (!product?.content || !competitors?.length) {
          throw new Error('Insufficient data for UX analysis');
        }
        
        // Simulate processing time for UX analysis
        await new Promise(resolve => setTimeout(resolve, 150));
        
        return {
          ...IntegrationServiceMocks.uxAnalysisResponse,
          metadata: {
            ...IntegrationServiceMocks.uxAnalysisResponse.metadata,
            correlationId,
            analyzedAt: new Date().toISOString(),
            options: options,
            competitorsAnalyzed: competitors.length,
            productFeatures: product.content.features?.length || 0
          }
        };
      }),
      
      generateFocusedAnalysis: jest.fn().mockImplementation(async (product, competitors, focus) => {
        return {
          ...IntegrationServiceMocks.focusedUXAnalysisResponse,
          focus: focus,
          metadata: {
            correlationId: `focused-ux-${Date.now()}`,
            focusArea: focus,
            analyzedAt: new Date().toISOString()
          }
        };
      }),
      
      generateUXReport: jest.fn().mockImplementation(async (analysis) => {
        // Validate UX analysis for report generation
        if (!analysis?.metadata?.correlationId) {
          throw new Error('UX analysis missing correlation metadata');
        }
        
        return {
          ...IntegrationServiceMocks.uxReportGenerationResponse,
          baseAnalysisId: analysis.metadata.correlationId,
          generatedAt: new Date().toISOString()
        };
      })
    };
    
    return mockService as unknown as UserExperienceAnalyzer;
  }
  
  /**
   * Creates a fully mocked ProductScrapingService with realistic scraping patterns
   */
  static createMockedProductScrapingService(): ProductScrapingService {
    const mockService = {
      scrapeProduct: jest.fn().mockImplementation(async (url, options) => {
        // Simulate realistic scraping workflow
        const scrapingId = `scrape-${Date.now()}`;
        
        if (!url || !url.startsWith('http')) {
          throw new Error('Invalid URL format for scraping workflow');
        }
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return {
          ...IntegrationServiceMocks.scrapingResponse,
          metadata: {
            ...IntegrationServiceMocks.scrapingResponse.metadata,
            scrapingId,
            url,
            scrapedAt: new Date().toISOString(),
            options: options
          }
        };
      }),
      
      scrapeCompetitor: jest.fn().mockImplementation(async (competitorUrl) => {
        return {
          ...IntegrationServiceMocks.competitorScrapingResponse,
          metadata: {
            url: competitorUrl,
            scrapedAt: new Date().toISOString(),
            type: 'competitor'
          }
        };
      }),

      scrapeProductById: jest.fn().mockImplementation(async (productId: string) => {
        if (!productId) {
          throw new Error('Invalid product ID for scraping workflow');
        }

        // Simulate product lookup and scraping
        await new Promise(resolve => setTimeout(resolve, 150));

        return {
          id: `snapshot-${Date.now()}`,
          productId: productId,
          content: {
            html: '<html><body>Mock scraped content</body></html>',
            text: 'Mock scraped content text',
            title: 'Mock Scraped Product',
            description: 'Product content scraped by ID',
            url: 'https://example.com',
            timestamp: new Date()
          },
          metadata: {
            scrapedAt: new Date().toISOString(),
            correlationId: `scrape-correlation-${Date.now()}`,
            contentLength: 200,
            scrapingDuration: 150,
            scrapingMethod: 'byId',
            statusCode: 200,
            inputProductId: productId
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }),

      triggerManualProductScraping: jest.fn().mockImplementation(async (projectId: string) => {
        if (!projectId) {
          throw new Error('Invalid project ID for scraping workflow');
        }

        // Simulate fetching products for project and scraping them
        await new Promise(resolve => setTimeout(resolve, 300));

        // Mock multiple product scraping results
        const results = [
          {
            id: `snapshot-${Date.now()}-1`,
            productId: 'product-1',
            content: {
              html: '<html><body>Product 1 content</body></html>',
              text: 'Product 1 scraped content',
              title: 'Product 1',
              description: 'First product in batch scraping',
              url: 'https://example.com/product/1',
              timestamp: new Date()
            },
            metadata: {
              scrapedAt: new Date().toISOString(),
              batchId: `batch-${Date.now()}`,
              batchSize: 2,
              correlationId: `batch-correlation-${Date.now()}`,
              projectId: projectId
            },
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: `snapshot-${Date.now()}-2`,
            productId: 'product-2',
            content: {
              html: '<html><body>Product 2 content</body></html>',
              text: 'Product 2 scraped content',
              title: 'Product 2',
              description: 'Second product in batch scraping',
              url: 'https://example.com/product/2',
              timestamp: new Date()
            },
            metadata: {
              scrapedAt: new Date().toISOString(),
              batchId: `batch-${Date.now()}`,
              batchSize: 2,
              correlationId: `batch-correlation-${Date.now()}`,
              projectId: projectId
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        return results;
      })
    };
    
    return mockService as unknown as ProductScrapingService;
  }
  
  /**
   * Creates an integrated service chain with realistic cross-service interactions
   */
  static createIntegratedServiceChain() {
    const analysisService = this.createMockedComparativeAnalysisService();
    const reportService = this.createMockedComparativeReportService();
    const uxAnalyzer = this.createMockedUserExperienceAnalyzer();
    const scrapingService = this.createMockedProductScrapingService();
    
    // Set up realistic cross-service interactions
    const originalReportGenerate = reportService.generateUXEnhancedReport;
    reportService.generateUXEnhancedReport = jest.fn().mockImplementation(async (analysis, product, snapshot, competitors) => {
      // Simulate calling UX analyzer as part of report generation
      const uxAnalysis = await uxAnalyzer.analyzeProductVsCompetitors(
        snapshot,
        competitors,
        { focus: 'both', includeTechnical: true }
      );
      
      // Continue with original mock behavior but include UX integration
      const result = await originalReportGenerate.call(reportService, analysis, product, snapshot, competitors);
      result.report.uxAnalysisData = uxAnalysis;
      
      return result;
    });
    
    return {
      analysisService,
      reportService,
      uxAnalyzer,
      scrapingService,
      // Utility method to verify service interactions
      verifyServiceInteractions: () => {
        const interactions = {
          analysisServiceCalled: analysisService.analyzeProductVsCompetitors.mock.calls.length > 0,
          reportServiceCalled: reportService.generateComparativeReport.mock.calls.length > 0 || 
                                reportService.generateUXEnhancedReport.mock.calls.length > 0,
          uxAnalyzerCalled: uxAnalyzer.analyzeProductVsCompetitors.mock.calls.length > 0,
          scrapingServiceCalled: scrapingService.scrapeProduct.mock.calls.length > 0
        };
        
        return interactions;
      }
    };
  }
} 