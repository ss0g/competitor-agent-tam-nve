import { jest } from '@jest/globals';

/**
 * Workflow Mocks - Implements realistic data flow patterns for integration tests
 * Focuses on service-to-service interactions and data flow validation
 */
export class WorkflowMocks {
  
  /**
   * Creates realistic analysis-to-report workflow with proper data flow
   */
  static createAnalysisToReportWorkflow() {
    // Mock analysis result with correlation tracking
    const mockAnalysis = {
      id: 'workflow-analysis-id',
      projectId: 'workflow-project-id',
      productId: 'workflow-product-id',
      competitorIds: ['competitor-1', 'competitor-2'],
      analysisDate: new Date(),
      summary: {
        overallPosition: 'competitive' as const,
        keyStrengths: ['AI-powered analysis', 'Real-time monitoring'],
        keyWeaknesses: ['Mobile app missing', 'API limitations'],
        opportunityScore: 87,
        threatLevel: 'medium' as const
      },
      metadata: {
        correlationId: `correlation-${Date.now()}`,
        analysisMethod: 'ai_powered' as const,
        confidenceScore: 87,
        processingTime: 1500,
        dataQuality: 'high' as const
      }
    };

    // Mock analysis service with realistic workflow
    const mockAnalysisService = {
      analyzeProductVsCompetitors: jest.fn().mockImplementation(async (input: any) => {
        // Validate input and simulate processing
        if (!input?.product || !input?.competitors) {
          throw new Error('Invalid analysis input for workflow');
        }
        
        // Simulate realistic processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Return analysis with workflow correlation
        return {
          ...mockAnalysis,
          productId: input.product.id,
          competitorIds: input.competitors.map((c: any) => c.competitor?.id || 'unknown'),
          metadata: {
            ...mockAnalysis.metadata,
            correlationId: `analysis-${Date.now()}`,
            inputProductId: input.product.id,
            competitorCount: input.competitors.length
          }
        };
      })
    };

    // Mock report service that uses analysis data
    const mockReportService = {
      generateComparativeReport: jest.fn().mockImplementation(async (analysis: any, product: any, snapshot: any, options: any) => {
        // Validate service-to-service data flow
        if (!analysis?.id || !analysis?.metadata?.correlationId) {
          throw new Error('Analysis missing required correlation metadata for report generation');
        }
        
        if (!product?.id) {
          throw new Error('Product data missing for report generation');
        }
        
        // Simulate report generation using analysis data
        await new Promise(resolve => setTimeout(resolve, 150));
        
        return {
          report: {
            id: `report-${Date.now()}`,
            title: `Competitive Analysis: ${product.name || 'Product'}`,
            analysisId: analysis.id,
            productId: product.id,
            sections: [
              {
                id: 'executive-summary',
                title: 'Executive Summary',
                content: `Based on analysis ${analysis.id}, competitive position is ${analysis.summary?.overallPosition || 'unknown'}`,
                type: 'executive_summary' as const,
                order: 1
              },
              {
                id: 'recommendations', 
                title: 'Strategic Recommendations',
                content: `Key strengths: ${analysis.summary?.keyStrengths?.join(', ') || 'None identified'}`,
                type: 'recommendations' as const,
                order: 2
              }
            ],
            metadata: {
              correlationId: analysis.metadata.correlationId,
              basedOnAnalysis: analysis.id,
              generatedAt: new Date().toISOString()
            },
            status: 'completed' as const,
            format: 'markdown' as const,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          generationTime: 1200,
          tokensUsed: 2800,
          cost: 0.032,
          warnings: [],
          errors: []
        };
      }),

      generateUXEnhancedReport: jest.fn().mockImplementation(async (analysis: any, product: any, snapshot: any, competitors: any) => {
        // Validate cross-service integration
        if (!analysis?.metadata?.correlationId) {
          throw new Error('Analysis missing correlation metadata for UX integration');
        }

        // Simulate UX analysis integration
        const uxData = {
          summary: 'UX analysis integrated from base analysis',
          strengths: ['Modern interface', 'Responsive design'],
          weaknesses: ['Mobile optimization needed'],
          confidence: 85
        };

        return {
          report: {
            id: `ux-report-${Date.now()}`,
            title: `UX-Enhanced Analysis: ${product.name || 'Product'}`,
            analysisId: analysis.id,
            uxAnalysisData: uxData,
            metadata: {
              correlationId: analysis.metadata.correlationId,
              uxIntegration: true,
              competitorsAnalyzed: competitors?.length || 0
            },
            status: 'completed' as const,
            format: 'markdown' as const,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          generationTime: 1800,
          tokensUsed: 3200,
          cost: 0.038,
          warnings: [],
          errors: []
        };
      })
    };

    // Mock repository with realistic storage workflow
    const mockRepository = {
      create: jest.fn().mockImplementation(async (reportData: any) => {
        // Simulate database storage with validation
        if (!reportData?.id || !reportData?.analysisId) {
          throw new Error('Report data missing required fields for storage');
        }

        return {
          id: reportData.id,
          title: reportData.title,
          analysisId: reportData.analysisId,
          status: 'completed' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            storedAt: new Date().toISOString(),
            correlationId: reportData.metadata?.correlationId
          }
        };
      }),

      findById: jest.fn().mockImplementation(async (id: any) => {
        if (!id) return null;
        
        return {
          id: id,
          title: 'Mock Stored Report',
          analysisId: 'workflow-analysis-id',
          status: 'completed' as const,
          sections: [
            {
              id: 'section-1',
              title: 'Executive Summary',
              content: 'Mock stored content',
              type: 'executive_summary' as const,
              order: 1
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      })
    };

    return {
      analysisService: mockAnalysisService,
      reportService: mockReportService,
      repository: mockRepository,
      
      // Utility to verify workflow execution
      verifyWorkflowExecution: () => {
        const analysisServiceCalled = mockAnalysisService.analyzeProductVsCompetitors.mock.calls.length > 0;
        const reportServiceCalled = mockReportService.generateComparativeReport.mock.calls.length > 0 ||
                                   mockReportService.generateUXEnhancedReport.mock.calls.length > 0;
        const repositoryCalled = mockRepository.create.mock.calls.length > 0;

        return {
          analysisServiceCalled,
          reportServiceCalled,
          repositoryCalled,
          workflowCompleted: analysisServiceCalled && reportServiceCalled && repositoryCalled
        };
      },

      // Verify data flow between services
      verifyDataFlow: () => {
        const analysisCalls = mockAnalysisService.analyzeProductVsCompetitors.mock.calls;
        const reportCalls = mockReportService.generateComparativeReport.mock.calls;
        const repositoryCalls = mockRepository.create.mock.calls;

        let dataFlowValid = true;
        let validationErrors: string[] = [];

        // Check if analysis data flows to report service
        if (analysisCalls.length > 0 && reportCalls.length > 0) {
          const reportCallAnalysis = reportCalls[0]?.[0]; // First argument is analysis
          if (!reportCallAnalysis?.id || !reportCallAnalysis?.metadata?.correlationId) {
            dataFlowValid = false;
            validationErrors.push('Analysis data missing correlation ID in report service call');
          }
        }

        // Check if report data flows to repository
        if (reportCalls.length > 0 && repositoryCalls.length > 0) {
          const repositoryCallData = repositoryCalls[0]?.[0];
          if (!repositoryCallData?.analysisId) {
            dataFlowValid = false;
            validationErrors.push('Report data missing analysis ID in repository call');
          }
        }

        return {
          dataFlowValid,
          validationErrors,
          totalServices: 3,
          servicesConnected: analysisCalls.length > 0 && reportCalls.length > 0 && repositoryCalls.length > 0 ? 3 : 0
        };
      }
    };
  }

  /**
   * Creates realistic UX analyzer integration workflow
   */
  static createUXAnalyzerWorkflow() {
    const mockUXAnalyzer = {
      analyzeProductVsCompetitors: jest.fn().mockImplementation(async (product: any, competitors: any, options: any) => {
        // Validate UX analysis input
        if (!product?.content || !competitors?.length) {
          throw new Error('Insufficient data for UX analysis workflow');
        }

        // Simulate UX processing
        await new Promise(resolve => setTimeout(resolve, 120));

        return {
          summary: 'UX analysis completed with competitive insights',
          strengths: ['Clean interface design', 'Intuitive navigation'],
          weaknesses: ['Mobile responsiveness', 'Loading performance'],
          recommendations: [
            {
              category: 'navigation',
              priority: 'high' as const,
              title: 'Optimize Mobile Navigation',
              description: 'Improve touch-friendly navigation elements'
            }
          ],
          confidence: 83,
          metadata: {
            correlationId: `ux-${Date.now()}`,
            analyzedAt: new Date().toISOString(),
            competitorsAnalyzed: competitors.length,
            options: options
          }
        };
      }),

      analyzeCompetitiveUX: jest.fn().mockImplementation(async (product: any, competitors: any, options: any) => {
        // Validate competitive UX analysis input
        if (!product) {
          throw new Error('Invalid input - Product required for competitive UX analysis');
        }

        if (!competitors || competitors.length === 0) {
          throw new Error('Invalid input - Competitors required for competitive UX analysis');
        }

        // Simulate competitive UX processing
        await new Promise(resolve => setTimeout(resolve, 150));

        return {
          competitiveInsights: {
            marketPosition: 'competitive',
            usabilityScore: 85,
            accessibilityRating: 'good',
            mobileOptimization: 'needs-improvement'
          },
          competitorComparisons: competitors.map((comp: any, index: number) => ({
            competitorName: comp.name || `Competitor ${index + 1}`,
            relativeStrengths: ['Better mobile UX', 'Faster loading'],
            relativeWeaknesses: ['Complex navigation', 'Poor accessibility'],
            overallRating: 7.5 - (index * 0.5)
          })),
          recommendations: [
            {
              category: 'mobile',
              priority: 'high' as const,
              title: 'Improve Mobile Experience',
              description: 'Optimize touch interfaces and responsive design',
              impact: 'high'
            },
            {
              category: 'accessibility',
              priority: 'medium' as const,
              title: 'Enhance Accessibility',
              description: 'Add ARIA labels and keyboard navigation',
              impact: 'medium'
            }
          ],
          overallScore: 78,
          confidence: 87,
          metadata: {
            correlationId: `competitive-ux-${Date.now()}`,
            analyzedAt: new Date().toISOString(),
            competitorsAnalyzed: competitors.length,
            analysisType: 'competitive_ux',
            options: options
          }
        };
      })
    };

    return {
      uxAnalyzer: mockUXAnalyzer,
      
      verifyUXWorkflow: () => {
        const uxAnalyzerCalled = mockUXAnalyzer.analyzeProductVsCompetitors.mock.calls.length > 0;
        return { uxAnalyzerCalled };
      }
    };
  }

  /**
   * Creates realistic scraping service workflow
   */
  static createScrapingWorkflow() {
    const mockScrapingService = {
      scrapeProduct: jest.fn().mockImplementation(async (url: any, options: any) => {
        // Validate scraping input
        if (!url || !url.startsWith('http')) {
          throw new Error('Invalid URL format for scraping workflow');
        }

        // Check for specific error test URLs
        if (url.includes('nonexistent-domain-for-testing')) {
          throw new Error('URL not reachable for scraping workflow');
        }
        
        if (url.includes('timeout-simulation')) {
          throw new Error('Scraping timeout after retry attempts');
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200));

        return {
          success: true,
          data: {
            title: 'Mock Scraped Product',
            description: 'Product data scraped for competitive analysis',
            features: ['Feature 1', 'Feature 2', 'Feature 3'],
            content: 'Detailed product content for analysis'
          },
          metadata: {
            url: url,
            scrapedAt: new Date().toISOString(),
            scrapingId: `scrape-${Date.now()}`,
            options: options
          }
        };
      }),

      scrapeProductById: jest.fn().mockImplementation(async (productId: any) => {
        // Validate input
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
            title: 'Mock Scraped Content',
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

      triggerManualProductScraping: jest.fn().mockImplementation(async (projectId: any) => {
        // Validate input
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
      }),

      getProductScrapingStatus: jest.fn().mockImplementation(async (projectId: any) => {
        // Validate input
        if (!projectId) {
          throw new Error('Project ID is required for scraping status');
        }

        // Simulate status lookup
        await new Promise(resolve => setTimeout(resolve, 50));

        return {
          productCount: 2,
          lastScraped: new Date(),
          totalSnapshots: 2,
          correlationId: `status-${Date.now()}`
        };
      })
    };

    return {
      scrapingService: mockScrapingService,
      
      verifyScrapingWorkflow: () => {
        const scrapingServiceCalled = mockScrapingService.scrapeProduct.mock.calls.length > 0;
        return { scrapingServiceCalled };
      }
    };
  }
} 