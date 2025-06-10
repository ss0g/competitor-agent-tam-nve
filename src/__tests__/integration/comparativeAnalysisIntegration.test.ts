import { ComparativeAnalysisService } from '@/services/analysis/comparativeAnalysisService';
import { 
  ComparativeAnalysisInput, 
  ComparativeAnalysis,
  AnalysisFocusArea 
} from '@/types/analysis';

describe('Comparative Analysis Integration', () => {
  let service: ComparativeAnalysisService;

  beforeEach(() => {
    service = new ComparativeAnalysisService();
  });

  describe('Real Analysis Workflow', () => {
    it('should perform complete analysis flow with mock Bedrock response', async () => {
      // Mock Bedrock service to avoid external dependencies
      const mockBedrock = jest.spyOn(service as any, 'executeAnalysis');
      
      const mockAnalysisResponse = JSON.stringify({
        summary: {
          overallPosition: 'competitive',
          keyStrengths: [
            'Strong value proposition in AI-powered insights',
            'Clear positioning in competitive intelligence market',
            'Comprehensive data collection capabilities'
          ],
          keyWeaknesses: [
            'Limited market presence compared to established players',
            'Feature gaps in advanced analytics'
          ],
          opportunityScore: 78,
          threatLevel: 'medium'
        },
        detailed: {
          featureComparison: {
            productFeatures: [
              'AI-powered competitive analysis',
              'Automated web scraping',
              'Real-time data collection',
              'Comparative reporting'
            ],
            competitorFeatures: [
              {
                competitorId: 'comp-1',
                competitorName: 'SimilarWeb',
                features: [
                  'Website traffic analytics',
                  'Market intelligence',
                  'Competitive benchmarking',
                  'Industry insights'
                ]
              },
              {
                competitorId: 'comp-2',
                competitorName: 'Klenty',
                features: [
                  'Sales automation',
                  'Lead generation',
                  'Email sequences',
                  'CRM integration'
                ]
              }
            ],
            uniqueToProduct: [
              'AI-powered comparative analysis',
              'Bedrock integration for insights'
            ],
            uniqueToCompetitors: [
              'Website traffic analytics',
              'Sales automation workflows'
            ],
            commonFeatures: [
              'Data collection and analysis',
              'Reporting capabilities'
            ],
            featureGaps: [
              'Traffic analytics capabilities',
              'Advanced sales automation'
            ],
            innovationScore: 75
          },
          positioningAnalysis: {
            productPositioning: {
              primaryMessage: 'AI-powered competitive intelligence for informed business decisions',
              valueProposition: 'Automate competitor research with AI insights',
              targetAudience: 'B2B SaaS companies and business strategists',
              differentiators: [
                'AI-powered analysis',
                'Automated data collection',
                'Comparative insights'
              ]
            },
            competitorPositioning: [
              {
                competitorId: 'comp-1',
                competitorName: 'SimilarWeb',
                primaryMessage: 'Digital market intelligence for growth',
                valueProposition: 'Understand your digital market landscape',
                targetAudience: 'Digital marketers and business analysts',
                differentiators: [
                  'Comprehensive web analytics',
                  'Industry benchmarks'
                ]
              }
            ],
            positioningGaps: [
              'Lack of traffic analytics positioning',
              'Missing enterprise-scale messaging'
            ],
            marketOpportunities: [
              'AI-first competitive intelligence',
              'Real-time competitor monitoring'
            ],
            messagingEffectiveness: 72
          },
          userExperienceComparison: {
            productUX: {
              designQuality: 80,
              usabilityScore: 78,
              navigationStructure: 'Clean, project-based organization',
              keyUserFlows: [
                'Project creation and setup',
                'Competitor data collection',
                'Analysis generation',
                'Report delivery'
              ]
            },
            competitorUX: [
              {
                competitorId: 'comp-1',
                competitorName: 'SimilarWeb',
                designQuality: 85,
                usabilityScore: 82,
                navigationStructure: 'Dashboard-centric with detailed analytics',
                keyUserFlows: [
                  'Website analysis',
                  'Competitor comparison',
                  'Report generation'
                ]
              }
            ],
            uxStrengths: [
              'Simplified project management',
              'Clear analysis workflow'
            ],
            uxWeaknesses: [
              'Limited data visualization',
              'Basic reporting interface'
            ],
            uxRecommendations: [
              'Enhance data visualization capabilities',
              'Improve report formatting and interactivity',
              'Add dashboard-style overview'
            ]
          },
          customerTargeting: {
            productTargeting: {
              primarySegments: ['B2B SaaS', 'Business Intelligence', 'Strategic Planning'],
              customerTypes: ['Product managers', 'Business strategists', 'Market researchers'],
              useCases: [
                'Competitive positioning',
                'Market analysis',
                'Strategic planning'
              ]
            },
            competitorTargeting: [
              {
                competitorId: 'comp-1',
                competitorName: 'SimilarWeb',
                primarySegments: ['Digital Marketing', 'Enterprise Analytics'],
                customerTypes: ['Digital marketers', 'Business analysts', 'Enterprise teams'],
                useCases: [
                  'Website analytics',
                  'Market research',
                  'Competitive benchmarking'
                ]
              }
            ],
            targetingOverlap: [
              'Market research use cases',
              'Business analyst personas'
            ],
            untappedSegments: [
              'Small business market',
              'Freelance consultants',
              'Academic researchers'
            ],
            competitiveAdvantage: [
              'AI-powered insights',
              'Automated data collection',
              'Focused on competitive intelligence'
            ]
          }
        },
        recommendations: {
          immediate: [
            'Enhance data visualization capabilities to compete with established players',
            'Develop clearer differentiation messaging around AI capabilities',
            'Improve user interface for better competitive positioning'
          ],
          shortTerm: [
            'Add website traffic analytics to close feature gaps',
            'Develop enterprise-focused marketing materials',
            'Create comparison guides against major competitors'
          ],
          longTerm: [
            'Build comprehensive competitive intelligence platform',
            'Develop API ecosystem for third-party integrations',
            'Establish thought leadership in AI-powered business intelligence'
          ],
          priorityScore: 85
        },
        metadata: {
          analysisMethod: 'ai_powered',
          confidenceScore: 88,
          dataQuality: 'high'
        }
      });

      mockBedrock.mockResolvedValue(mockAnalysisResponse);

      // Create realistic test input
      const analysisInput: ComparativeAnalysisInput = {
        product: {
          id: 'test-product-1',
          name: 'Competitor Research Agent',
          website: 'https://competitor-research-agent.com',
          positioning: 'AI-powered competitive intelligence for informed business decisions',
          customerData: 'B2B SaaS companies, business strategists, and product managers',
          userProblem: 'Manual competitor research is time-consuming and lacks comprehensive insights',
          industry: 'Business Intelligence'
        },
        productSnapshot: {
          id: 'snapshot-1',
          productId: 'test-product-1',
          content: {
            title: 'Competitor Research Agent - AI-Powered Competitive Intelligence',
            text: 'Transform your competitive research with AI-powered insights. Our platform automates competitor data collection, provides intelligent analysis, and delivers actionable competitive intelligence. Perfect for B2B SaaS companies looking to stay ahead of the competition. ' + 'A'.repeat(2000),
            html: '<h1>Competitor Research Agent</h1><p>AI-powered competitive intelligence platform...</p>',
            description: 'AI-powered competitive intelligence platform for automated competitor research and analysis'
          },
          metadata: {
            url: 'https://competitor-research-agent.com',
            statusCode: 200,
            contentLength: 2500,
            scrapingTimestamp: new Date()
          },
          createdAt: new Date()
        },
        competitors: [
          {
            competitor: {
              id: 'similarweb-comp',
              name: 'SimilarWeb',
              website: 'https://similarweb.com',
              description: 'Digital market intelligence platform',
              industry: 'Business Intelligence',
              employeeCount: 1000,
              revenue: undefined,
              founded: undefined,
              headquarters: undefined,
              socialMedia: undefined,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'similarweb-snapshot',
              competitorId: 'similarweb-comp',
              metadata: {
                title: 'SimilarWeb - Digital Market Intelligence',
                text: 'SimilarWeb provides digital market intelligence to help you understand your competitive landscape. Get insights into website traffic, user behavior, and market trends. ' + 'B'.repeat(1600),
                html: '<h1>SimilarWeb</h1><p>Digital market intelligence...</p>',
                url: 'https://similarweb.com',
                statusCode: 200,
                contentLength: 3200
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          },
          {
            competitor: {
              id: 'klenty-comp',
              name: 'Klenty',
              website: 'https://klenty.com',
              description: 'Sales automation and lead generation platform',
              industry: 'Sales Technology',
              employeeCount: 200,
              revenue: undefined,
              founded: undefined,
              headquarters: undefined,
              socialMedia: undefined,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'klenty-snapshot',
              competitorId: 'klenty-comp',
              metadata: {
                title: 'Klenty - Sales Automation Platform',
                text: 'Klenty helps sales teams automate their outreach and generate more leads. Scale your sales efforts with intelligent automation and personalized campaigns. ' + 'C'.repeat(1600),
                html: '<h1>Klenty</h1><p>Sales automation platform...</p>',
                url: 'https://klenty.com',
                statusCode: 200,
                contentLength: 2800
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

      // Execute analysis
      const result: ComparativeAnalysis = await service.analyzeProductVsCompetitors(analysisInput);

      // Verify analysis structure and content
      expect(result).toMatchObject({
        id: expect.any(String),
        projectId: 'test-product-1',
        productId: 'test-product-1',
        competitorIds: ['similarweb-comp', 'klenty-comp'],
        analysisDate: expect.any(Date),
        summary: {
          overallPosition: 'competitive',
          keyStrengths: expect.arrayContaining([
            expect.stringContaining('AI-powered')
          ]),
          keyWeaknesses: expect.arrayContaining([expect.any(String)]),
          opportunityScore: 78,
          threatLevel: 'medium'
        },
        detailed: {
          featureComparison: {
            productFeatures: expect.arrayContaining([
              expect.stringContaining('AI-powered')
            ]),
            competitorFeatures: expect.arrayContaining([
              expect.objectContaining({
                competitorId: 'comp-1',
                competitorName: 'SimilarWeb',
                features: expect.any(Array)
              })
            ]),
            uniqueToProduct: expect.arrayContaining([
              expect.stringContaining('AI-powered')
            ]),
            innovationScore: 75
          },
          positioningAnalysis: {
            productPositioning: {
              primaryMessage: expect.stringContaining('AI-powered'),
              valueProposition: expect.any(String),
              targetAudience: expect.stringContaining('B2B'),
              differentiators: expect.arrayContaining([
                expect.stringContaining('AI')
              ])
            },
            messagingEffectiveness: 72
          },
          userExperienceComparison: {
            productUX: {
              designQuality: 80,
              usabilityScore: 78,
              navigationStructure: expect.any(String),
              keyUserFlows: expect.any(Array)
            },
            uxRecommendations: expect.arrayContaining([
              expect.stringContaining('visualization')
            ])
          },
          customerTargeting: {
            productTargeting: {
              primarySegments: expect.arrayContaining([
                expect.stringContaining('SaaS')
              ]),
              customerTypes: expect.arrayContaining([
                expect.stringContaining('managers')
              ]),
              useCases: expect.arrayContaining([
                expect.stringContaining('Competitive positioning')
              ])
            },
            competitiveAdvantage: expect.arrayContaining([
              expect.stringContaining('AI-powered')
            ])
          }
        },
        recommendations: {
          immediate: expect.arrayContaining([
            expect.stringContaining('visualization')
          ]),
          shortTerm: expect.arrayContaining([
            expect.stringContaining('analytics')
          ]),
          longTerm: expect.arrayContaining([
            expect.stringContaining('platform')
          ]),
          priorityScore: 85
        },
        metadata: {
          analysisMethod: 'ai_powered',
          modelUsed: 'anthropic.claude-3-sonnet-20240229-v1:0',
          confidenceScore: 88,
          processingTime: expect.any(Number),
          dataQuality: 'high'
        }
      });

      // Verify key insights are present
      expect(result.summary.keyStrengths).toContain('Strong value proposition in AI-powered insights');
      expect(result.detailed.featureComparison.uniqueToProduct).toContain('AI-powered comparative analysis');
      expect(result.recommendations.immediate).toContain('Enhance data visualization capabilities to compete with established players');

      // Verify competitive intelligence aspects
      expect(result.detailed.positioningAnalysis.marketOpportunities).toContain('AI-first competitive intelligence');
      expect(result.detailed.customerTargeting.untappedSegments).toContain('Small business market');

      console.log('✅ Comprehensive comparative analysis completed successfully');
      console.log(`📊 Overall Position: ${result.summary.overallPosition}`);
      console.log(`🎯 Opportunity Score: ${result.summary.opportunityScore}/100`);
      console.log(`⚠️ Threat Level: ${result.summary.threatLevel}`);
      console.log(`🔍 Analysis Confidence: ${result.metadata.confidenceScore}%`);
      console.log(`⏱️ Processing Time: ${result.metadata.processingTime}ms`);

      mockBedrock.mockRestore();
    }, 30000); // 30 second timeout for integration test
  });

  describe('Analysis Configuration', () => {
    it('should handle different analysis depths and focus areas', async () => {
      // Test basic analysis with specific focus areas
      service.updateAnalysisConfiguration({
        analysisDepth: 'basic',
        focusAreas: ['features', 'pricing']
      });

      const mockBedrock = jest.spyOn(service as any, 'executeAnalysis');
      mockBedrock.mockResolvedValue(JSON.stringify({
        summary: {
          overallPosition: 'competitive',
          keyStrengths: ['Feature innovation'],
          keyWeaknesses: ['Pricing complexity'],
          opportunityScore: 70,
          threatLevel: 'low'
        }
      }));

      const basicInput: ComparativeAnalysisInput = {
        product: {
          id: 'basic-test',
          name: 'Basic Test Product',
          website: 'https://basic-test.com',
          positioning: 'Simple solution',
          customerData: 'SMB customers',
          userProblem: 'Basic efficiency',
          industry: 'Software'
        },
        productSnapshot: {
          id: 'basic-snapshot',
          productId: 'basic-test',
          content: {
            title: 'Basic Test Product',
            text: 'Simple and effective software solution for small businesses. ' + 'D'.repeat(2000),
            html: '<h1>Basic Test Product</h1>'
          },
          metadata: {},
          createdAt: new Date()
        },
        competitors: [
          {
            competitor: {
              id: 'basic-comp',
              name: 'Basic Competitor',
              website: 'https://basic-competitor.com',
              description: 'Another simple solution',
              industry: 'Software',
              employeeCount: undefined,
              revenue: undefined,
              founded: undefined,
              headquarters: undefined,
              socialMedia: undefined,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            snapshot: {
              id: 'basic-comp-snapshot',
              competitorId: 'basic-comp',
              metadata: {
                title: 'Basic Competitor',
                text: 'We provide basic software solutions. ' + 'E'.repeat(1600),
                url: 'https://basic-competitor.com'
              },
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ],
        analysisConfig: {
          focusAreas: ['features', 'pricing'] as AnalysisFocusArea[],
          depth: 'basic',
          includeRecommendations: false
        }
      };

      const result = await service.analyzeProductVsCompetitors(basicInput);

      expect(result.summary.overallPosition).toBe('competitive');
      expect(result.metadata.analysisMethod).toBe('ai_powered');

      console.log('✅ Basic analysis configuration test passed');

      mockBedrock.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages for insufficient data', async () => {
      const invalidInput: ComparativeAnalysisInput = {
        product: {
          id: '',
          name: '',
          website: 'https://invalid.com',
          positioning: '',
          customerData: '',
          userProblem: '',
          industry: ''
        },
        productSnapshot: {
          id: 'invalid-snapshot',
          productId: '',
          content: {
            title: 'Short',
            text: 'Too short'
          },
          metadata: {},
          createdAt: new Date()
        },
        competitors: [],
        analysisConfig: {
          focusAreas: ['features'] as AnalysisFocusArea[],
          depth: 'basic',
          includeRecommendations: true
        }
      };

      await expect(service.analyzeProductVsCompetitors(invalidInput))
        .rejects
        .toThrow(/Product information is incomplete|No competitors|too short/);

      console.log('✅ Error handling test passed');
    });
  });
}); 