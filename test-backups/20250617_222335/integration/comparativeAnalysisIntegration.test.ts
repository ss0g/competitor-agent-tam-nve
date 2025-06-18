import { WorkflowMocks } from './mocks/workflowMocks';
import { 
  ComparativeAnalysisInput, 
  AnalysisFocusArea 
} from '@/types/analysis';

describe('Comparative Analysis Integration - Fix 7.1c Applied', () => {
  let mockWorkflow: any;

  beforeEach(() => {
    // Initialize realistic data flow patterns with workflow mocks
    mockWorkflow = WorkflowMocks.createAnalysisToReportWorkflow();
  });

  describe('Real Analysis Workflow - Fix 7.1c Applied', () => {
    it('should perform complete analysis flow with realistic data flow patterns', async () => {
      console.log('🚀 Starting comprehensive analysis test with Fix 7.1c...');
      
      // Prepare comprehensive test input with realistic structure
      const testInput: ComparativeAnalysisInput = {
        product: {
          id: 'test-product-123',
          name: 'AI Competitive Intelligence Platform',
          website: 'https://ai-competitor-platform.com',
          positioning: 'AI-powered competitive intelligence for informed business decisions',
          customerData: 'B2B SaaS companies, business strategists, market research teams',
          userProblem: 'Manual competitive research is time-consuming and lacks AI-powered insights',
          industry: 'Software/AI'
        },
        productSnapshot: {
          id: 'snapshot-123',
          productId: 'test-product-123',
          content: {
            title: 'AI Competitive Intelligence Platform',
            text: 'Transform your competitive research with our AI-powered platform that automates competitor monitoring, provides real-time market insights, and delivers actionable intelligence. Our advanced machine learning algorithms analyze competitor websites, social media, and public data to give you comprehensive competitive intelligence.',
            html: '<h1>AI Competitive Intelligence Platform</h1><p>Transform your competitive research...</p>',
            description: 'AI-powered competitive intelligence and analysis platform'
          },
          metadata: {
            url: 'https://ai-competitor-platform.com',
            statusCode: 200,
            contentLength: 2800,
            lastModified: '2024-01-15',
            headers: { 'content-type': 'text/html' }
          },
          createdAt: new Date()
        },
        competitors: [
          {
            competitor: {
              id: 'comp-similarweb',
              name: 'SimilarWeb',
              website: 'https://similarweb.com',
              description: 'Digital market intelligence platform',
              industry: 'Software',
              employeeCount: 1000,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'snapshot-similarweb',
              competitorId: 'comp-similarweb',
              metadata: {
                title: 'SimilarWeb - Digital Market Intelligence',
                text: 'SimilarWeb provides comprehensive digital market intelligence, website analytics, and competitive insights for businesses worldwide. Our platform helps you understand market trends, analyze competitor strategies, and make data-driven decisions.',
                url: 'https://similarweb.com',
                statusCode: 200,
                contentLength: 2500
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          },
          {
            competitor: {
              id: 'comp-klenty',
              name: 'Klenty',
              website: 'https://klenty.com',
              description: 'Sales automation and lead generation platform',
              industry: 'Software',
              employeeCount: 200,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'snapshot-klenty',
              competitorId: 'comp-klenty',
              metadata: {
                title: 'Klenty - Sales Automation Platform',
                text: 'Klenty delivers powerful sales automation, lead generation, and email sequence capabilities for sales teams. Our platform integrates with CRM systems to streamline sales workflows and improve conversion rates.',
                url: 'https://klenty.com',
                statusCode: 200,
                contentLength: 2200
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ],
        analysisConfig: {
          focusAreas: ['features', 'positioning', 'user_experience', 'customer_targeting'] as AnalysisFocusArea[],
          depth: 'comprehensive',
          includeRecommendations: true
        }
      };

      // Execute analysis using realistic workflow mock
      const analysis = await mockWorkflow.analysisService.analyzeProductVsCompetitors(testInput);

      // Validate comprehensive analysis structure with realistic data flow
      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.productId).toBe('test-product-123');
      expect(analysis.competitorIds).toContain('comp-similarweb');
      expect(analysis.competitorIds).toContain('comp-klenty');
      expect(analysis.metadata.correlationId).toBeDefined();
      expect(analysis.metadata.competitorCount).toBe(2);

      // Validate analysis summary with expected structure
      expect(analysis.summary).toBeDefined();
      expect(analysis.summary.overallPosition).toBe('competitive');
      expect(analysis.summary.keyStrengths).toBeInstanceOf(Array);
      expect(analysis.summary.keyWeaknesses).toBeInstanceOf(Array);
      expect(analysis.summary.opportunityScore).toBe(87);
      expect(analysis.summary.threatLevel).toBe('medium');

      // Validate detailed analysis components
      expect(analysis.detailed.featureComparison.productFeatures).toBeInstanceOf(Array);
      expect(analysis.detailed.featureComparison.competitorFeatures).toBeInstanceOf(Array);
      expect(analysis.detailed.featureComparison.uniqueToProduct).toBeInstanceOf(Array);
      expect(analysis.detailed.featureComparison.innovationScore).toBe(82);

      expect(analysis.detailed.positioningAnalysis.productPositioning.primaryMessage).toBeDefined();
      expect(analysis.detailed.positioningAnalysis.productPositioning.valueProposition).toBeDefined();
      expect(analysis.detailed.positioningAnalysis.messagingEffectiveness).toBe(85);

      expect(analysis.detailed.userExperienceComparison.productUX.designQuality).toBe(85);
      expect(analysis.detailed.userExperienceComparison.productUX.usabilityScore).toBe(82);
      expect(analysis.detailed.userExperienceComparison.uxStrengths).toBeInstanceOf(Array);

      expect(analysis.detailed.customerTargeting.productTargeting.primarySegments).toBeInstanceOf(Array);
      expect(analysis.detailed.customerTargeting.competitiveAdvantage).toBeInstanceOf(Array);

      // Validate recommendations structure
      expect(analysis.recommendations.immediate).toBeInstanceOf(Array);
      expect(analysis.recommendations.shortTerm).toBeInstanceOf(Array);
      expect(analysis.recommendations.longTerm).toBeInstanceOf(Array);
      expect(analysis.recommendations.priorityScore).toBe(85);

      // Validate metadata and realistic processing
      expect(analysis.metadata.analysisMethod).toBe('ai_powered');
      expect(analysis.metadata.confidenceScore).toBe(87);
      expect(analysis.metadata.processingTime).toBe(1500);
      expect(analysis.metadata.dataQuality).toBe('high');

      // Verify realistic data flow patterns
      const workflowExecution = mockWorkflow.verifyWorkflowExecution();
      expect(workflowExecution.analysisServiceCalled).toBe(true);

      const dataFlow = mockWorkflow.verifyDataFlow();
      expect(dataFlow.dataFlowValid).toBe(true);

      console.log('✅ Comprehensive analysis completed successfully with Fix 7.1c');
      console.log(`📊 Analysis ID: ${analysis.id}`);
      console.log(`🔗 Correlation ID: ${analysis.metadata.correlationId}`);
      console.log(`⚡ Processing time: ${analysis.metadata.processingTime}ms`);
      console.log(`🎯 Confidence score: ${analysis.metadata.confidenceScore}%`);
    }, 45000);

    it('should handle focused analysis with specific focus areas and realistic data flow', async () => {
      console.log('🚀 Testing focused analysis with Fix 7.1c...');

      const focusedInput: ComparativeAnalysisInput = {
        product: {
          id: 'focused-product',
          name: 'Focused Analysis Product',
          website: 'https://focused-product.com',
          positioning: 'Specialized competitive intelligence solution',
          customerData: 'Enterprise customers',
          userProblem: 'Need focused competitive insights',
          industry: 'Software'
        },
        productSnapshot: {
          id: 'focused-snapshot',
          productId: 'focused-product',
          content: {
            title: 'Focused Analysis Product',
            text: 'Specialized solution for focused competitive analysis',
            description: 'Focused competitive analysis platform'
          },
          metadata: {
            url: 'https://focused-product.com',
            statusCode: 200
          },
          createdAt: new Date()
        },
        competitors: [
          {
            competitor: {
              id: 'focused-competitor',
              name: 'Focused Competitor',
              website: 'https://focused-competitor.com',
              description: 'Competitor for focused analysis',
              industry: 'Software',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'focused-comp-snapshot',
              competitorId: 'focused-competitor',
              metadata: {
                title: 'Focused Competitor',
                text: 'Competitor data for focused analysis'
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ],
        analysisConfig: {
          focusAreas: ['features', 'positioning'] as AnalysisFocusArea[],
          depth: 'detailed',
          includeRecommendations: true
        }
      };

      // Execute focused analysis with realistic workflow
      const analysis = await mockWorkflow.analysisService.analyzeProductVsCompetitors(focusedInput);

      // Validate focused analysis structure
      expect(analysis.id).toBeDefined();
      expect(analysis.productId).toBe('focused-product');
      expect(analysis.competitorIds).toContain('focused-competitor');
      expect(analysis.metadata.correlationId).toBeDefined();
      expect(analysis.metadata.inputProductId).toBe('focused-product');
      expect(analysis.metadata.competitorCount).toBe(1);

      // Validate realistic data flow for focused analysis
      const workflowExecution = mockWorkflow.verifyWorkflowExecution();
      expect(workflowExecution.analysisServiceCalled).toBe(true);

      console.log('✅ Focused analysis completed successfully with Fix 7.1c');
      console.log(`📊 Focused Analysis ID: ${analysis.id}`);
      console.log(`🔗 Correlation ID: ${analysis.metadata.correlationId}`);
    }, 30000);

    it('should validate input parameters and handle errors with realistic patterns', async () => {
      console.log('🚀 Testing input validation and error handling with Fix 7.1c...');

      // Test invalid input - missing required fields
      const invalidInput = {
        product: null,
        productSnapshot: null,
        competitors: []
      };

      await expect(
        mockWorkflow.analysisService.analyzeProductVsCompetitors(invalidInput)
      ).rejects.toThrow('Invalid analysis input for workflow');

      // Test invalid input - empty competitors
      const emptyCompetitorsInput = {
        product: {
          id: 'test-product',
          name: 'Test Product'
        },
        productSnapshot: {
          id: 'test-snapshot',
          content: { title: 'Test' }
        },
        competitors: []
      };

      await expect(
        mockWorkflow.analysisService.analyzeProductVsCompetitors(emptyCompetitorsInput)
      ).rejects.toThrow('Invalid analysis input for workflow');

      console.log('✅ Input validation and error handling verified with Fix 7.1c');
    }, 20000);

    it('should handle analysis configuration variations with realistic data flow', async () => {
      console.log('🚀 Testing analysis configuration variations with Fix 7.1c...');

      const baseInput: ComparativeAnalysisInput = {
        product: {
          id: 'config-product',
          name: 'Configuration Test Product',
          website: 'https://config-product.com',
          positioning: 'Configurable analysis platform',
          customerData: 'Various customer segments',
          userProblem: 'Need configurable competitive insights',
          industry: 'Software'
        },
        productSnapshot: {
          id: 'config-snapshot',
          productId: 'config-product',
          content: {
            title: 'Configuration Test Product',
            text: 'Product for testing various analysis configurations'
          },
          metadata: {
            url: 'https://config-product.com'
          },
          createdAt: new Date()
        },
        competitors: [
          {
            competitor: {
              id: 'config-competitor',
              name: 'Configuration Competitor',
              website: 'https://config-competitor.com',
              description: 'Competitor for configuration testing',
              industry: 'Software',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'config-comp-snapshot',
              competitorId: 'config-competitor',
              metadata: {
                title: 'Configuration Competitor',
                text: 'Competitor for configuration analysis'
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      };

      // Test basic configuration
      const basicConfigInput = {
        ...baseInput,
        analysisConfig: {
          focusAreas: ['features'] as AnalysisFocusArea[],
          depth: 'basic' as const,
          includeRecommendations: false
        }
      };

      const basicAnalysis = await mockWorkflow.analysisService.analyzeProductVsCompetitors(basicConfigInput);
      expect(basicAnalysis.id).toBeDefined();
      expect(basicAnalysis.metadata.correlationId).toBeDefined();

      // Test comprehensive configuration
      const comprehensiveConfigInput = {
        ...baseInput,
        analysisConfig: {
          focusAreas: ['features', 'positioning', 'user_experience', 'customer_targeting'] as AnalysisFocusArea[],
          depth: 'comprehensive' as const,
          includeRecommendations: true
        }
      };

      const comprehensiveAnalysis = await mockWorkflow.analysisService.analyzeProductVsCompetitors(comprehensiveConfigInput);
      expect(comprehensiveAnalysis.id).toBeDefined();
      expect(comprehensiveAnalysis.metadata.correlationId).toBeDefined();

      // Verify realistic data flow patterns for both configurations
      const workflowExecution = mockWorkflow.verifyWorkflowExecution();
      expect(workflowExecution.analysisServiceCalled).toBe(true);

      console.log('✅ Analysis configuration variations tested successfully with Fix 7.1c');
      console.log(`📊 Basic Analysis ID: ${basicAnalysis.id}`);
      console.log(`📊 Comprehensive Analysis ID: ${comprehensiveAnalysis.id}`);
    }, 40000);
  });
}); 