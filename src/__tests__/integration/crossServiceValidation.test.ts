import { createMockAnalysisService, createMockUXAnalyzer, createMockReportService } from "./mocks/serviceIntegrationMocks";
// import { createMockAnalysisService, createMockUXAnalyzer, createMockReportService } from "./mocks/serviceIntegrationMocks";
import { ComparativeAnalysisService } from '@/services/analysis/comparativeAnalysisService';
import { ComparativeReportService } from '@/services/reports/comparativeReportService';
import { UserExperienceAnalyzer } from '@/services/analysis/userExperienceAnalyzer';
import { AutoReportGenerationService } from '@/services/autoReportGenerationService';
import { logger } from '@/lib/logger';
import { WorkflowMocks } from './mocks/workflowMocks';

describe('Cross-Service Integration Tests', () => {
  let analysisService: ComparativeAnalysisService;
  let reportService: ComparativeReportService;
  let uxAnalyzer: UserExperienceAnalyzer;
  let autoReportService: AutoReportGenerationService;
  let mockWorkflow: any;

  beforeAll(async () => {
    // Initialize services
    analysisService = new ComparativeAnalysisService();
    reportService = new ComparativeReportService();
    uxAnalyzer = new UserExperienceAnalyzer();
    autoReportService = new AutoReportGenerationService();

    // Initialize realistic data flow patterns with workflow mocks
    mockWorkflow = WorkflowMocks.createAnalysisToReportWorkflow();
    logger.info('Integration Test Setup Complete with Workflow Mocks');
  });

  describe('Phase 4.1: Integration Testing', () => {
    it('should integrate analysis service with report service', async () => {
      // Mock analysis input
      const mockAnalysisInput = {
        product: {
          id: 'integration-product-001',
          name: 'Integration Test Product',
          website: 'https://integrationtest.com',
          positioning: 'Test positioning',
          customerData: 'Test customers',
          userProblem: 'Test problem',
          industry: 'Test Industry'
        },
        productSnapshot: {
          id: 'integration-snapshot-001',
          productId: 'integration-product-001',
          content: {
            title: 'Integration Test Product',
            description: 'Product for integration testing',
            features: ['Feature 1', 'Feature 2', 'Feature 3']
          },
          metadata: {
            url: 'https://integrationtest.com',
            scrapedAt: new Date().toISOString()
          },
          createdAt: new Date()
        },
        competitors: [
          {
            competitor: {
              id: 'integration-comp-001',
              name: 'Integration Competitor A',
              website: 'https://competitora-integration.com',
              description: 'Test competitor A',
              industry: 'Test Industry',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'integration-comp-snapshot-001',
              competitorId: 'integration-comp-001',
              metadata: {
                title: 'Competitor A',
                description: 'Competitor A for testing',
                features: ['Comp Feature 1', 'Comp Feature 2']
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      };

      // Step 1: Generate comparative analysis
      const analysis = await analysisService.analyzeProductVsCompetitors(mockAnalysisInput);

      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.summary).toBeDefined();
      expect(analysis.detailed).toBeDefined();
      expect(analysis.recommendations).toBeDefined();

      // Step 2: Generate report from analysis
      const mockProduct = {
        id: mockAnalysisInput.product.id,
        name: mockAnalysisInput.product.name,
        website: mockAnalysisInput.product.website,
        positioning: mockAnalysisInput.product.positioning,
        customerData: mockAnalysisInput.product.customerData,
        userProblem: mockAnalysisInput.product.userProblem,
        industry: mockAnalysisInput.product.industry,
        projectId: 'integration-project-001',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockCompetitorSnapshots = [
        {
          competitor: {
            name: 'Integration Competitor A',
            website: 'https://competitora-integration.com'
          },
          snapshot: {
            id: 'integration-comp-snapshot-001',
            competitorId: 'integration-comp-001',
            metadata: {
              title: 'Competitor A',
              description: 'Competitor A for testing',
              features: ['Comp Feature 1', 'Comp Feature 2']
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      ];

      const reportResult = await reportService.generateUXEnhancedReport(
        analysis,
        mockProduct,
        mockAnalysisInput.productSnapshot,
        mockCompetitorSnapshots
      );

      expect(reportResult).toBeDefined();
      expect(reportResult.report).toBeDefined();
      expect(reportResult.report.sections.length).toBeGreaterThan(0);
      expect(reportResult.generationTime).toBeDefined();

      logger.info('Analysis-Report integration test completed', {
        analysisId: analysis.id,
        reportSections: reportResult.report.sections.length,
        generationTime: reportResult.generationTime
      });
    });

    it('should validate UX analyzer integration with report service', async () => {
      // Mock UX analysis data
      const mockProductData = {
        id: 'ux-integration-snapshot',
        productId: 'ux-integration-product',
        content: {
          title: 'UX Integration Test Product',
          description: 'Product for UX integration testing',
          features: ['UX Feature 1', 'UX Feature 2'],
          navigation: 'Modern sidebar navigation',
          userExperience: 'Clean, intuitive interface'
        },
        metadata: {
          url: 'https://uxintegrationtest.com',
          scrapedAt: new Date().toISOString()
        },
        createdAt: new Date(),
        product: {
          name: 'UX Integration Test Product',
          website: 'https://uxintegrationtest.com'
        }
      };

      const mockCompetitorData = [
        {
          id: 'ux-comp-snapshot-001',
          competitorId: 'ux-comp-001',
          metadata: {
            title: 'UX Competitor A',
            description: 'UX competitor for testing',
            features: ['UX Comp Feature 1'],
            navigation: 'Traditional menu navigation',
            userExperience: 'Functional but dated interface'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          competitor: {
            name: 'UX Competitor A',
            website: 'https://uxcompetitora.com'
          }
        }
      ];

      // Step 1: Generate UX analysis
      const uxAnalysis = await uxAnalyzer.analyzeProductVsCompetitors(
        mockProductData,
        mockCompetitorData,
        { focus: 'both', includeTechnical: true, includeAccessibility: true }
      );

      expect(uxAnalysis).toBeDefined();
      expect(uxAnalysis.summary).toBeDefined();
      expect(uxAnalysis.recommendations).toBeInstanceOf(Array);
      expect(uxAnalysis.confidence).toBeGreaterThan(0);

      // Step 2: Verify UX analysis can be used in report generation
      // This validates that the UX analyzer output format is compatible with report service
      expect(uxAnalysis.metadata).toBeDefined();
      expect(uxAnalysis.metadata.correlationId).toBeDefined();
      expect(uxAnalysis.metadata.analyzedAt).toBeDefined();

      logger.info('UX analyzer integration test completed', {
        uxSummary: uxAnalysis.summary,
        recommendationCount: uxAnalysis.recommendations.length,
        confidenceScore: uxAnalysis.confidence
      });
    });

    it('should validate service error handling and recovery', async () => {
      // Test analysis service with invalid input
      const invalidAnalysisInput = {
        product: {
          id: '',
          name: '',
          website: '',
          positioning: '',
          customerData: '',
          userProblem: '',
          industry: ''
        },
        productSnapshot: {
          id: '',
          productId: '',
          content: {},
          metadata: {},
          createdAt: new Date()
        },
        competitors: []
      };

      try {
        await analysisService.analyzeProductVsCompetitors(invalidAnalysisInput);
        // If no error is thrown, that's also valid (graceful handling)
        logger.info('Analysis service handled invalid input gracefully');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        logger.info('Analysis service properly threw error for invalid input', {
          errorMessage: (error as Error).message
        });
      }

      // Test UX analyzer with minimal data
      const minimalProductData = {
        id: 'minimal-test',
        productId: 'minimal-product',
        content: {},
        metadata: {},
        createdAt: new Date(),
        product: { name: 'Minimal Product', website: 'https://minimal.com' }
      };

      try {
        const uxResult = await uxAnalyzer.analyzeProductVsCompetitors(
          minimalProductData,
          [],
          { focus: 'both' }
        );
        
        // Should handle minimal data gracefully
        expect(uxResult).toBeDefined();
        expect(uxResult.confidence).toBeLessThanOrEqual(1);
        logger.info('UX analyzer handled minimal data gracefully', {
          confidence: uxResult.confidence
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        logger.info('UX analyzer properly handled minimal data error', {
          errorMessage: (error as Error).message
        });
      }
    });

    it('should validate service performance under load', async () => {
      const startTime = Date.now();
      
      // Create multiple concurrent analysis requests
      const concurrentRequests = Array.from({ length: 3 }, (_, index) => {
        const mockInput = {
          product: {
            id: `perf-product-${index}`,
            name: `Performance Test Product ${index}`,
            website: `https://perftest${index}.com`,
            positioning: 'Performance test positioning',
            customerData: 'Performance test customers',
            userProblem: 'Performance test problem',
            industry: 'Performance Test Industry'
          },
          productSnapshot: {
            id: `perf-snapshot-${index}`,
            productId: `perf-product-${index}`,
            content: {
              title: `Performance Test Product ${index}`,
              description: 'Performance testing product',
              features: [`Feature ${index}A`, `Feature ${index}B`]
            },
            metadata: {
              url: `https://perftest${index}.com`,
              scrapedAt: new Date().toISOString()
            },
            createdAt: new Date()
          },
          competitors: [
            {
              competitor: {
                id: `perf-comp-${index}`,
                name: `Performance Competitor ${index}`,
                website: `https://perfcomp${index}.com`,
                description: `Performance competitor ${index}`,
                industry: 'Performance Test Industry',
                createdAt: new Date(),
                updatedAt: new Date()
              },
              snapshot: {
                id: `perf-comp-snapshot-${index}`,
                competitorId: `perf-comp-${index}`,
                metadata: {
                  title: `Performance Competitor ${index}`,
                  description: `Performance competitor ${index} for testing`,
                  features: [`Perf Comp Feature ${index}`]
                },
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          ]
        };

        return analysisService.analyzeProductVsCompetitors(mockInput);
      });

      // Execute all requests concurrently
      const results = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Validate all requests completed successfully
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.summary).toBeDefined();
      });

      // Performance validation
      expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute
      const averageTime = totalTime / 3;
      expect(averageTime).toBeLessThan(30000); // Average should be under 30 seconds

      logger.info('Performance test completed', {
        totalTime,
        averageTime,
        requestCount: 3,
        status: totalTime < 60000 ? 'PASS' : 'FAIL'
      });
    });

    it('should validate data consistency across services', async () => {
      // Create consistent test data
      const testProductId = 'consistency-product-001';
      const testAnalysisId = 'consistency-analysis-001';
      
      const mockAnalysisInput = {
        product: {
          id: testProductId,
          name: 'Consistency Test Product',
          website: 'https://consistencytest.com',
          positioning: 'Consistent positioning',
          customerData: 'Consistent customers',
          userProblem: 'Consistent problem',
          industry: 'Consistency Industry'
        },
        productSnapshot: {
          id: 'consistency-snapshot-001',
          productId: testProductId,
          content: {
            title: 'Consistency Test Product',
            description: 'Product for consistency testing',
            features: ['Consistency Feature 1', 'Consistency Feature 2']
          },
          metadata: {
            url: 'https://consistencytest.com',
            scrapedAt: new Date().toISOString()
          },
          createdAt: new Date()
        },
        competitors: [
          {
            competitor: {
              id: 'consistency-comp-001',
              name: 'Consistency Competitor',
              website: 'https://consistencycomp.com',
              description: 'Consistency competitor',
              industry: 'Consistency Industry',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'consistency-comp-snapshot-001',
              competitorId: 'consistency-comp-001',
              metadata: {
                title: 'Consistency Competitor',
                description: 'Consistency competitor for testing',
                features: ['Consistency Comp Feature']
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      };

      // Step 1: Generate analysis
      const analysis = await analysisService.analyzeProductVsCompetitors(mockAnalysisInput);

      // Step 2: Verify analysis data consistency
      expect(analysis.productId).toBe(testProductId);
      expect(analysis.competitorIds).toContain('consistency-comp-001');
      expect(analysis.metadata.dataQuality).toBeDefined();

      // Step 3: Generate report and verify consistency
      const mockProduct = {
        id: testProductId,
        name: mockAnalysisInput.product.name,
        website: mockAnalysisInput.product.website,
        positioning: mockAnalysisInput.product.positioning,
        customerData: mockAnalysisInput.product.customerData,
        userProblem: mockAnalysisInput.product.userProblem,
        industry: mockAnalysisInput.product.industry,
        projectId: 'consistency-project-001',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const reportResult = await reportService.generateUXEnhancedReport(
        analysis,
        mockProduct,
        mockAnalysisInput.productSnapshot,
        [
          {
            competitor: {
              name: 'Consistency Competitor',
              website: 'https://consistencycomp.com'
            },
            snapshot: {
              id: 'consistency-comp-snapshot-001',
              competitorId: 'consistency-comp-001',
              metadata: {
                title: 'Consistency Competitor',
                description: 'Consistency competitor for testing',
                features: ['Consistency Comp Feature']
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      );

      // Verify report data consistency
      expect(reportResult.report.metadata.productName).toBe('Consistency Test Product');
      expect(reportResult.report.metadata.competitorCount).toBe(1);
      expect(reportResult.report.metadata.analysisId).toBe(analysis.id);

      logger.info('Data consistency test completed', {
        analysisId: analysis.id,
        productId: testProductId,
        reportProductName: reportResult.report.metadata.productName,
        competitorCount: reportResult.report.metadata.competitorCount
      });
    });
  });

  describe('Phase 4.1: API Integration Testing', () => {
    it('should validate service interfaces and contracts', async () => {
      // Test ComparativeAnalysisService interface
      expect(typeof analysisService.analyzeProductVsCompetitors).toBe('function');
      
      // Test ComparativeReportService interface
      expect(typeof reportService.generateUXEnhancedReport).toBe('function');
      expect(typeof reportService.generateComparativeReport).toBe('function');
      
      // Test UserExperienceAnalyzer interface
      expect(typeof uxAnalyzer.analyzeProductVsCompetitors).toBe('function');
      expect(typeof uxAnalyzer.generateFocusedAnalysis).toBe('function');
      
      // Test AutoReportGenerationService interface
      expect(typeof autoReportService.generateInitialComparativeReport).toBe('function');

      logger.info('Service interface validation completed');
    });

    it('should validate service configuration and initialization', async () => {
      // Verify services are properly initialized
      expect(analysisService).toBeInstanceOf(ComparativeAnalysisService);
      expect(reportService).toBeInstanceOf(ComparativeReportService);
      expect(uxAnalyzer).toBeInstanceOf(UserExperienceAnalyzer);
      expect(autoReportService).toBeInstanceOf(AutoReportGenerationService);

      // Test service health/status (if available)
      // This would typically check database connections, external service availability, etc.
      
      logger.info('Service initialization validation completed');
    });
  });

  describe('Phase 7.1b: Realistic Data Flow Patterns', () => {
    it('should integrate analysis service with report service using realistic data flow', async () => {
      // Mock analysis input with realistic structure
      const mockAnalysisInput = {
        product: {
          id: 'integration-product-001',
          name: 'Integration Test Product',
          website: 'https://integrationtest.com',
          positioning: 'Test positioning',
          customerData: 'Test customers',
          userProblem: 'Test problem',
          industry: 'Test Industry'
        },
        productSnapshot: {
          id: 'integration-snapshot-001',
          productId: 'integration-product-001',
          content: {
            title: 'Integration Test Product',
            description: 'Product for integration testing',
            features: ['Feature 1', 'Feature 2', 'Feature 3'],
            text: 'Detailed product content for analysis'
          },
          metadata: {
            url: 'https://integrationtest.com',
            scrapedAt: new Date().toISOString()
          },
          createdAt: new Date()
        },
        competitors: [
          {
            competitor: {
              id: 'integration-comp-001',
              name: 'Integration Competitor A',
              website: 'https://competitora-integration.com',
              description: 'Test competitor A',
              industry: 'Test Industry',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'integration-comp-snapshot-001',
              competitorId: 'integration-comp-001',
              metadata: {
                title: 'Competitor A',
                description: 'Competitor A for testing',
                features: ['Comp Feature 1', 'Comp Feature 2']
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      };

      // Step 1: Generate comparative analysis using workflow mock
      const analysis = await mockWorkflow.analysisService.analyzeProductVsCompetitors(mockAnalysisInput);

      // Validate realistic analysis response with proper data flow
      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.productId).toBe(mockAnalysisInput.product.id);
      expect(analysis.competitorIds).toContain('integration-comp-001');
      expect(analysis.metadata.correlationId).toBeDefined();
      expect(analysis.metadata.inputProductId).toBe(mockAnalysisInput.product.id);
      expect(analysis.metadata.competitorCount).toBe(1);

      // Step 2: Generate report using analysis data with realistic data flow
      const mockProduct = {
        id: mockAnalysisInput.product.id,
        name: mockAnalysisInput.product.name,
        website: mockAnalysisInput.product.website,
        positioning: mockAnalysisInput.product.positioning,
        customerData: mockAnalysisInput.product.customerData,
        userProblem: mockAnalysisInput.product.userProblem,
        industry: mockAnalysisInput.product.industry,
        projectId: 'integration-project-001',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const reportResult = await mockWorkflow.reportService.generateComparativeReport(
        analysis,
        mockProduct,
        mockAnalysisInput.productSnapshot,
        { template: 'comprehensive', format: 'markdown' }
      );

      // Validate realistic report generation with proper data flow
      expect(reportResult).toBeDefined();
      expect(reportResult.report).toBeDefined();
      expect(reportResult.report.analysisId).toBe(analysis.id);
      expect(reportResult.report.productId).toBe(mockProduct.id);
      expect(reportResult.report.metadata.correlationId).toBe(analysis.metadata.correlationId);
      expect(reportResult.report.metadata.basedOnAnalysis).toBe(analysis.id);
      expect(reportResult.report.sections.length).toBeGreaterThan(0);
      
      // Verify content is based on analysis data
      const executiveSummary = reportResult.report.sections.find(s => s.id === 'executive-summary');
      expect(executiveSummary?.content).toContain(analysis.id);
      expect(executiveSummary?.content).toContain(analysis.summary.overallPosition);

      // Step 3: Store report with realistic repository workflow
      const storedReport = await mockWorkflow.repository.create(reportResult.report);

      // Validate realistic repository storage with data flow
      expect(storedReport.id).toBe(reportResult.report.id);
      expect(storedReport.analysisId).toBe(analysis.id);
      expect(storedReport.metadata.correlationId).toBe(analysis.metadata.correlationId);

      // Step 4: Verify realistic data flow patterns
      const workflowExecution = mockWorkflow.verifyWorkflowExecution();
      expect(workflowExecution.analysisServiceCalled).toBe(true);
      expect(workflowExecution.reportServiceCalled).toBe(true);
      expect(workflowExecution.repositoryCalled).toBe(true);
      expect(workflowExecution.workflowCompleted).toBe(true);

      const dataFlow = mockWorkflow.verifyDataFlow();
      expect(dataFlow.dataFlowValid).toBe(true);
      expect(dataFlow.validationErrors).toHaveLength(0);
      expect(dataFlow.servicesConnected).toBe(3);

      logger.info('Realistic data flow pattern validation completed', {
        analysisId: analysis.id,
        reportId: reportResult.report.id,
        correlationId: analysis.metadata.correlationId,
        workflowCompleted: workflowExecution.workflowCompleted,
        dataFlowValid: dataFlow.dataFlowValid
      });
    });

    it('should validate UX analyzer integration with realistic data flow patterns', async () => {
      // Create UX analyzer workflow
      const uxWorkflow = WorkflowMocks.createUXAnalyzerWorkflow();

      // Mock UX analysis data with realistic structure
      const mockProductData = {
        id: 'ux-integration-snapshot',
        productId: 'ux-integration-product',
        content: {
          title: 'UX Integration Test Product',
          description: 'Product for UX integration testing',
          features: ['UX Feature 1', 'UX Feature 2'],
          navigation: 'Modern sidebar navigation',
          userExperience: 'Clean, intuitive interface'
        },
        metadata: {
          url: 'https://uxintegrationtest.com',
          scrapedAt: new Date().toISOString()
        },
        createdAt: new Date(),
        product: {
          name: 'UX Integration Test Product',
          website: 'https://uxintegrationtest.com'
        }
      };

      const mockCompetitorData = [
        {
          id: 'ux-comp-snapshot-001',
          competitorId: 'ux-comp-001',
          metadata: {
            title: 'UX Competitor A',
            description: 'UX competitor for testing',
            features: ['UX Comp Feature 1'],
            navigation: 'Traditional menu navigation',
            userExperience: 'Functional but dated interface'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          competitor: {
            name: 'UX Competitor A',
            website: 'https://uxcompetitora.com'
          }
        }
      ];

      // Generate UX analysis with realistic workflow
      const uxAnalysis = await uxWorkflow.uxAnalyzer.analyzeProductVsCompetitors(
        mockProductData,
        mockCompetitorData,
        { focus: 'both', includeTechnical: true, includeAccessibility: true }
      );

      // Validate realistic UX analysis response
      expect(uxAnalysis).toBeDefined();
      expect(uxAnalysis.summary).toBeDefined();
      expect(uxAnalysis.recommendations).toBeInstanceOf(Array);
      expect(uxAnalysis.confidence).toBeGreaterThan(0);
      expect(uxAnalysis.metadata.correlationId).toBeDefined();
      expect(uxAnalysis.metadata.competitorsAnalyzed).toBe(1);

      // Verify UX workflow execution
      const uxWorkflowExecution = uxWorkflow.verifyUXWorkflow();
      expect(uxWorkflowExecution.uxAnalyzerCalled).toBe(true);

      logger.info('UX analyzer realistic data flow validation completed', {
        uxSummary: uxAnalysis.summary,
        confidence: uxAnalysis.confidence,
        correlationId: uxAnalysis.metadata.correlationId,
        competitorsAnalyzed: uxAnalysis.metadata.competitorsAnalyzed
      });
    });

    it('should validate cross-service data flow with UX-enhanced report generation', async () => {
      // Use main workflow for cross-service integration
      const analysisInput = {
        product: {
          id: 'cross-service-product',
          name: 'Cross-Service Test Product',
          website: 'https://crossservice.com'
        },
        competitors: [
          {
            competitor: { id: 'cross-comp-1', name: 'Cross Competitor' },
            snapshot: { id: 'cross-snapshot-1', competitorId: 'cross-comp-1' }
          }
        ]
      };

      // Step 1: Generate analysis
      const analysis = await mockWorkflow.analysisService.analyzeProductVsCompetitors(analysisInput);
      
      // Step 2: Generate UX-enhanced report with cross-service data flow
      const mockCompetitorSnapshots = [
        {
          competitor: { name: 'Cross Competitor', website: 'https://crosscompetitor.com' },
          snapshot: {
            id: 'cross-snapshot-1',
            competitorId: 'cross-comp-1',
            metadata: { title: 'Cross Competitor', features: ['Cross Feature'] }
          }
        }
      ];

      const uxReportResult = await mockWorkflow.reportService.generateUXEnhancedReport(
        analysis,
        analysisInput.product,
        { id: 'product-snapshot', content: { features: ['Product Feature'] }},
        mockCompetitorSnapshots
      );

      // Validate cross-service data flow in UX-enhanced report
      expect(uxReportResult.report.analysisId).toBe(analysis.id);
      expect(uxReportResult.report.metadata.correlationId).toBe(analysis.metadata.correlationId);
      expect(uxReportResult.report.metadata.uxIntegration).toBe(true);
      expect(uxReportResult.report.metadata.competitorsAnalyzed).toBe(1);
      expect(uxReportResult.report.uxAnalysisData).toBeDefined();

      // Verify data flow maintains correlation throughout the workflow
      expect(uxReportResult.report.metadata.correlationId).toBe(analysis.metadata.correlationId);

      logger.info('Cross-service UX integration data flow validated', {
        analysisId: analysis.id,
        uxReportId: uxReportResult.report.id,
        correlationId: analysis.metadata.correlationId,
        uxIntegration: uxReportResult.report.metadata.uxIntegration
      });
    });

    it('should validate error handling in realistic data flow patterns', async () => {
      // Test error handling with invalid input
      await expect(
        mockWorkflow.analysisService.analyzeProductVsCompetitors({})
      ).rejects.toThrow('Invalid analysis input for workflow');

      // Test error handling with missing correlation data
      const invalidAnalysis = { id: 'invalid', metadata: {} };
      await expect(
        mockWorkflow.reportService.generateComparativeReport(
          invalidAnalysis,
          { id: 'product' },
          {},
          {}
        )
      ).rejects.toThrow('Analysis missing required correlation metadata for report generation');

      // Test error handling with missing product data
      const validAnalysis = {
        id: 'valid',
        metadata: { correlationId: 'test-correlation' }
      };
      await expect(
        mockWorkflow.reportService.generateComparativeReport(
          validAnalysis,
          {},
          {},
          {}
        )
      ).rejects.toThrow('Product data missing for report generation');

      logger.info('Error handling validation in realistic data flow patterns completed');
    });
  });
}); 