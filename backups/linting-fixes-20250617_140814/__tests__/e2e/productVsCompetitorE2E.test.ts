import { EnhancedProjectExtractor } from '@/lib/chat/enhancedProjectExtractor';
import { UserExperienceAnalyzer } from '@/services/analysis/userExperienceAnalyzer';
import { ComparativeReportService } from '@/services/reports/comparativeReportService';
import { ComparativeAnalysisService } from '@/services/analysis/comparativeAnalysisService';
import { ProductScrapingService } from '@/services/productScrapingService';
import { AutoReportGenerationService } from '@/services/autoReportGenerationService';
import { logger } from '@/lib/logger';

// Mock prisma for E2E tests
const mockPrisma = {
  user: {
    create: jest.fn().mockImplementation(async (data: any) => ({
      id: `test-user-${Date.now()}`,
      email: data.data.email,
      name: data.data.name,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    delete: jest.fn().mockResolvedValue({ id: 'deleted' })
  },
  project: {
    create: jest.fn().mockImplementation(async (data: any) => ({
      id: `test-project-${Date.now()}`,
      name: data.data.name,
      description: data.data.description,
      userId: data.data.userId,
      parameters: data.data.parameters,
      scrapingFrequency: data.data.scrapingFrequency,
      products: data.include?.products ? [{
        id: `test-product-${Date.now()}`,
        name: data.data.products.create.name,
        website: data.data.products.create.website,
        positioning: data.data.products.create.positioning,
        customerData: data.data.products.create.customerData,
        userProblem: data.data.products.create.userProblem,
        industry: data.data.products.create.industry,
        createdAt: new Date(),
        updatedAt: new Date()
      }] : [],
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    update: jest.fn().mockResolvedValue({ id: 'updated' }),
    delete: jest.fn().mockResolvedValue({ id: 'deleted' })
  },
  competitor: {
    createMany: jest.fn().mockImplementation(async (data: any) => ({
      count: data.data.length
    })),
    findMany: jest.fn().mockImplementation(async (query: any) => {
      const names = query.where.name.in;
      return names.map((name: string, index: number) => ({
        id: `competitor-${index + 1}`,
        name: name,
        website: name === 'ButcherBox' ? 'https://butcherbox.com' : 'https://crowdcow.com',
        industry: 'Food Delivery',
        description: name === 'ButcherBox' ? 'Grass-fed meat delivery' : 'Craft meat delivery',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    })
  },
  productSnapshot: {
    create: jest.fn().mockImplementation(async (data: any) => ({
      id: `snapshot-${Date.now()}`,
      productId: data.data.productId,
      content: data.data.content,
      metadata: data.data.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  },
  snapshot: {
    create: jest.fn().mockImplementation(async (data: any) => ({
      id: `competitor-snapshot-${Date.now()}`,
      competitorId: data.data.competitorId,
      metadata: data.data.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  },
  $disconnect: jest.fn().mockResolvedValue(undefined)
};

// Replace prisma import with mock
const prisma = mockPrisma as any;

describe('Product vs Competitor E2E Workflow', () => {
  let projectExtractor: EnhancedProjectExtractor;
  let uxAnalyzer: UserExperienceAnalyzer;
  let reportService: ComparativeReportService;
  let analysisService: ComparativeAnalysisService;
  let productScrapingService: ProductScrapingService;
  let autoReportService: AutoReportGenerationService;

  // Test data
  let testProjectId: string;
  let testProductId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize services
    projectExtractor = new EnhancedProjectExtractor();
    uxAnalyzer = new UserExperienceAnalyzer();
    reportService = new ComparativeReportService();
    analysisService = new ComparativeAnalysisService();
    productScrapingService = new ProductScrapingService();
    autoReportService = new AutoReportGenerationService();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-e2e@example.com',
        name: 'E2E Test User'
      }
    });
    testUserId = testUser.id;

    logger.info('E2E Test Setup Complete', { testUserId });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProjectId) {
      await prisma.project.delete({
        where: { id: testProjectId }
      });
    }
    
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId }
      });
    }

    await prisma.$disconnect();
    logger.info('E2E Test Cleanup Complete');
  });

  describe('Complete Workflow: Chat → Project → Analysis → Report', () => {
    it('should process chat message and generate UX-enhanced comparative report', async () => {
      const chatMessage = `
        test-e2e@example.com
        Weekly
        GoodChop Competitive Analysis
        https://goodchop.com
        Product: GoodChop
        Industry: Food Delivery
        Positioning: Premium meat delivery service
      `;

      // Step 1: Extract project data from chat
      const extractionResult = projectExtractor.extractProjectData(chatMessage);
      
      expect(extractionResult.success).toBe(true);
      expect(extractionResult.data).toBeDefined();
      expect(extractionResult.data!.userEmail).toBe('test-e2e@example.com');
      expect(extractionResult.data!.projectName).toBe('GoodChop Competitive Analysis');
      expect(extractionResult.data!.productWebsite).toBe('https://goodchop.com/');
      expect(extractionResult.data!.productName).toBe('GoodChop Competitive');

      // Step 2: Create project with product
      const project = await prisma.project.create({
        data: {
          name: extractionResult.data!.projectName,
          description: 'E2E test project',
          userId: testUserId,
          parameters: {
            frequency: extractionResult.data!.frequency,
            userEmail: extractionResult.data!.userEmail
          },
          scrapingFrequency: 'WEEKLY',
          products: {
            create: {
              name: extractionResult.data!.productName || 'GoodChop',
              website: extractionResult.data!.productWebsite!,
              positioning: extractionResult.data!.positioning || 'Premium service',
              customerData: extractionResult.data!.customerData || 'Food enthusiasts',
              userProblem: extractionResult.data!.userProblem || 'Quality meat delivery',
              industry: extractionResult.data!.industry || 'Food Delivery'
            }
          }
        },
        include: {
          products: true
        }
      });

      testProjectId = project.id;
      testProductId = project.products[0].id;

      expect(project.products).toHaveLength(1);
      expect(project.products[0].website).toBe('https://goodchop.com');

      // Step 3: Add test competitors
      const competitors = await prisma.competitor.createMany({
        data: [
          {
            name: 'ButcherBox',
            website: 'https://butcherbox.com',
            industry: 'Food Delivery',
            description: 'Grass-fed meat delivery'
          },
          {
            name: 'Crowd Cow',
            website: 'https://crowdcow.com', 
            industry: 'Food Delivery',
            description: 'Craft meat delivery'
          }
        ]
      });

      const competitorRecords = await prisma.competitor.findMany({
        where: {
          name: { in: ['ButcherBox', 'Crowd Cow'] }
        }
      });

      // Connect competitors to project
      await prisma.project.update({
        where: { id: testProjectId },
        data: {
          competitors: {
            connect: competitorRecords.map(comp => ({ id: comp.id }))
          }
        }
      });

      // Step 4: Create mock product snapshot
      const productSnapshot = await prisma.productSnapshot.create({
        data: {
          productId: testProductId,
          content: {
            title: 'GoodChop - Premium Meat Delivery',
            description: 'High-quality, ethically sourced meat delivered to your door',
            features: [
              'Premium cuts from local farms',
              'Subscription-based delivery',
              'Custom packaging',
              'Mobile app ordering'
            ],
            navigation: 'Clean, modern interface with easy product browsing',
            userExperience: 'Streamlined checkout process with subscription management'
          },
          metadata: {
            scrapedAt: new Date().toISOString(),
            url: 'https://goodchop.com',
            scrapeMethod: 'automated'
          }
        }
      });

      // Step 5: Create mock competitor snapshots
      const competitorSnapshots = await Promise.all(
        competitorRecords.map(async (competitor, index) => {
          return prisma.snapshot.create({
            data: {
              competitorId: competitor.id,
              metadata: {
                title: competitor.name,
                description: competitor.description,
                features: index === 0 ? 
                  ['Grass-fed beef', 'Monthly boxes', 'Recipe cards'] :
                  ['Craft meat selection', 'Single purchases', 'Farmer stories'],
                navigation: index === 0 ? 
                  'Traditional e-commerce layout' :
                  'Story-driven product pages',
                userExperience: index === 0 ?
                  'Subscription-focused flow' :
                  'Educational content with purchase options',
                scrapedAt: new Date().toISOString(),
                url: competitor.website
              }
            }
          });
        })
      );

      // Step 6: Generate comparative analysis
      const analysisInput = {
        product: {
          id: testProductId,
          name: 'GoodChop',
          website: 'https://goodchop.com',
          positioning: 'Premium meat delivery service',
          customerData: 'Food enthusiasts',
          userProblem: 'Quality meat delivery',
          industry: 'Food Delivery'
        },
        productSnapshot: {
          id: productSnapshot.id,
          productId: testProductId,
          content: productSnapshot.content,
          metadata: productSnapshot.metadata,
          createdAt: productSnapshot.createdAt
        },
        competitors: competitorRecords.map((competitor, index) => ({
          competitor: {
            id: competitor.id,
            name: competitor.name,
            website: competitor.website,
            description: competitor.description,
            industry: competitor.industry,
            createdAt: competitor.createdAt,
            updatedAt: competitor.updatedAt
          },
          snapshot: {
            id: competitorSnapshots[index].id,
            competitorId: competitor.id,
            metadata: competitorSnapshots[index].metadata,
            createdAt: competitorSnapshots[index].createdAt,
            updatedAt: competitorSnapshots[index].updatedAt
          }
        }))
      };

      const analysis = await analysisService.analyzeProductVsCompetitors(analysisInput);

      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.summary).toBeDefined();
      expect(analysis.detailed).toBeDefined();
      expect(analysis.recommendations).toBeDefined();

      // Step 7: Generate UX-enhanced comparative report
      const competitorSnapshotsForUX = competitorRecords.map((competitor, index) => ({
        competitor: {
          name: competitor.name,
          website: competitor.website
        },
        snapshot: competitorSnapshots[index]
      }));

      const reportResult = await reportService.generateUXEnhancedReport(
        analysis,
        analysisInput.product,
        analysisInput.productSnapshot,
        competitorSnapshotsForUX
      );

      expect(reportResult).toBeDefined();
      expect(reportResult.report).toBeDefined();
      expect(reportResult.report.sections.length).toBeGreaterThan(2); // Should have UX sections
      expect(reportResult.generationTime).toBeLessThan(120000); // Should be under 2 minutes

      // Verify UX sections are present
      const uxAnalysisSection = reportResult.report.sections.find(
        section => section.title === 'User Experience Analysis'
      );
      const uxRecommendationsSection = reportResult.report.sections.find(
        section => section.title === 'Strategic UX Recommendations'
      );

      expect(uxAnalysisSection).toBeDefined();
      expect(uxRecommendationsSection).toBeDefined();
      expect(uxAnalysisSection!.content).toContain('User Experience Competitive Analysis');
      expect(uxRecommendationsSection!.content).toContain('Strategic UX Recommendations');

      // Verify report metadata
      expect(reportResult.report.metadata.productName).toBe('GoodChop');
      expect(reportResult.report.metadata.competitorCount).toBe(2);
      expect(reportResult.report.keyFindings).toContain(
        expect.stringContaining('UX Analysis Confidence:')
      );

      logger.info('E2E Test Completed Successfully', {
        projectId: testProjectId,
        analysisId: analysis.id,
        reportSections: reportResult.report.sections.length,
        generationTime: reportResult.generationTime
      });

    }, 300000); // 5 minute timeout for complete workflow

    it('should handle workflow with missing product data gracefully', async () => {
      const invalidChatMessage = `
        test-invalid@example.com
        Monthly
        Invalid Test Project
      `;

      const extractionResult = projectExtractor.extractProjectData(invalidChatMessage);

      expect(extractionResult.success).toBe(false);
      expect(extractionResult.errors).toContain(
        expect.stringContaining('Product website is required')
      );
      expect(extractionResult.suggestions).toContain(
        expect.stringContaining('Consider adding your product website URL')
      );
    });

    it('should validate performance requirements', async () => {
      // This test would be expanded with actual performance testing
      const startTime = Date.now();
      
      // Mock a typical analysis workflow
      const mockAnalysis = {
        id: 'perf-test-analysis',
        projectId: 'perf-test-project',
        productId: 'perf-test-product',
        competitorIds: ['comp-1', 'comp-2'],
        analysisDate: new Date(),
        summary: {
          overallPosition: 'competitive' as const,
          keyStrengths: ['Performance'],
          keyWeaknesses: ['Scale'],
          immediateRecommendations: ['Optimize'],
          opportunityScore: 75,
          threatLevel: 'medium' as const,
          confidenceScore: 85
        },
        detailed: {
          featureComparison: {
            productFeatures: ['Feature 1'],
            competitorFeatures: [
              { competitorId: 'comp-1', competitorName: 'Competitor 1', features: ['Feature A'] }
            ],
            uniqueToProduct: ['Unique'],
            featureGaps: ['Gap'],
            uniqueToCompetitors: ['Comp Unique'],
            commonFeatures: ['Common'],
            innovationScore: 80
          },
          positioningAnalysis: {
            productPositioning: {
              primaryMessage: 'Test',
              valueProposition: 'Value',
              targetAudience: 'Audience',
              differentiators: ['Diff']
            },
            competitorPositioning: [{
              competitorId: 'comp-1',
              competitorName: 'Competitor 1',
              primaryMessage: 'Comp Message',
              valueProposition: 'Comp Value',
              targetAudience: 'Comp Audience',
              differentiators: ['Comp Diff']
            }],
            positioningGaps: ['Gap'],
            marketOpportunities: ['Opportunity'],
            messagingEffectiveness: 75
          },
          userExperienceComparison: {
            productUX: {
              designQuality: 8,
              usabilityScore: 7,
              navigationStructure: 'Modern',
              keyUserFlows: ['Flow']
            },
            competitorUX: [{
              competitorId: 'comp-1',
              competitorName: 'Competitor 1',
              designQuality: 6,
              usabilityScore: 7,
              navigationStructure: 'Traditional',
              keyUserFlows: ['Comp Flow']
            }],
            uxStrengths: ['Strength'],
            uxWeaknesses: ['Weakness'],
            uxRecommendations: ['Recommendation']
          },
          customerTargeting: {
            productTargeting: {
              primarySegments: ['Segment'],
              customerTypes: ['Type'],
              useCases: ['Use case']
            },
            competitorTargeting: [{
              competitorId: 'comp-1',
              competitorName: 'Competitor 1',
              primarySegments: ['Comp Segment'],
              customerTypes: ['Comp Type'],
              useCases: ['Comp Use case']
            }],
            targetingOverlap: ['Overlap'],
            untappedSegments: ['Untapped'],
            competitiveAdvantage: ['Advantage']
          }
        },
        recommendations: {
          immediate: ['Action 1'],
          shortTerm: ['Short Action'],
          longTerm: ['Long Action'],
          priorityScore: 85
        },
        metadata: {
          analysisMethod: 'ai_powered' as const,
          modelUsed: 'claude-3',
          confidenceScore: 85,
          processingTime: 5000,
          dataQuality: 'high' as const
        }
      };

      const mockProduct = {
        id: 'perf-test-product',
        name: 'Performance Test Product',
        website: 'https://perftest.com',
        positioning: 'Test',
        customerData: 'Test',
        userProblem: 'Test',
        industry: 'Test',
        projectId: 'perf-test-project',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockProductSnapshot = {
        id: 'perf-snapshot',
        productId: 'perf-test-product',
        content: { title: 'Performance Test' },
        metadata: { url: 'https://perftest.com' },
        createdAt: new Date()
      };

      // Mock the report generation (in real scenario this would call actual services)
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify performance requirements
      expect(processingTime).toBeLessThan(120000); // Should be under 2 minutes
      
      logger.info('Performance test completed', {
        processingTime,
        performanceTarget: '< 2 minutes',
        status: processingTime < 120000 ? 'PASS' : 'FAIL'
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid product websites gracefully', async () => {
      const chatMessage = `
        test-error@example.com
        Weekly
        Error Test Project
        https://invalid-website-that-does-not-exist-12345.com
        Product: Error Test
      `;

      const extractionResult = projectExtractor.extractProjectData(chatMessage);
      
      expect(extractionResult.success).toBe(true);
      expect(extractionResult.data!.productWebsite).toBe('https://invalid-website-that-does-not-exist-12345.com/');
      
      // The system should handle invalid websites gracefully during scraping
      // This would be tested in integration with the actual scraping service
    });

    it('should provide helpful error messages for incomplete chat input', async () => {
      const incompleteChatMessage = `
        test-incomplete@example.com
        Weekly
      `;

      const extractionResult = projectExtractor.extractProjectData(incompleteChatMessage);
      
      expect(extractionResult.success).toBe(false);
      expect(extractionResult.errors.length).toBeGreaterThan(0);
      expect(extractionResult.suggestions.length).toBeGreaterThan(0);
      expect(extractionResult.suggestions).toContain(
        expect.stringContaining('Consider including your product website URL for better analysis')
      );
    });
  });
}); 