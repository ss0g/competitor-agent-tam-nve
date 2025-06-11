import { ComparativeReportService } from '@/services/reports/comparativeReportService';
import { UserExperienceAnalyzer } from '@/services/analysis/userExperienceAnalyzer';
import { ComparativeAnalysis } from '@/types/analysis';
import { Product, ProductSnapshot } from '@/types/product';

// Mock the dependencies
jest.mock('@/services/analysis/userExperienceAnalyzer');
jest.mock('@/services/bedrock/bedrock.service', () => ({
  BedrockService: jest.fn().mockImplementation(() => ({
    generateCompletion: jest.fn().mockResolvedValue('Mock AI response')
  }))
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ComparativeReportService - UX Enhancement', () => {
  let service: ComparativeReportService;
  let mockUXAnalyzer: jest.Mocked<UserExperienceAnalyzer>;
  let mockAnalysis: ComparativeAnalysis;
  let mockProduct: Product;
  let mockProductSnapshot: ProductSnapshot;
  let mockCompetitorSnapshots: Array<{ competitor: { name: string; website: string }; snapshot: any }>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    service = new ComparativeReportService();
    
    // Get the mocked UX analyzer
    mockUXAnalyzer = (service as any).uxAnalyzer as jest.Mocked<UserExperienceAnalyzer>;
    
    // Setup mock data
    mockAnalysis = {
      id: 'analysis-1',
      projectId: 'project-1',
      productId: 'product-1',
      competitorIds: ['competitor-1', 'competitor-2'],
      analysisDate: new Date(),
      summary: {
        overallPosition: 'Strong competitive position',
        keyStrengths: ['Feature A', 'Feature B'],
        keyWeaknesses: ['Area C', 'Area D'],
        immediateRecommendations: ['Improve X', 'Enhance Y'],
        opportunityScore: 75,
        threatLevel: 'Medium',
        confidenceScore: 85
      },
      detailed: {
        featureComparison: {
          productFeatures: ['Feature 1', 'Feature 2'],
          competitorFeatures: [
            { competitorId: 'comp-1', competitorName: 'Competitor 1', features: ['Feature A'] }
          ],
          uniqueToProduct: ['Unique Feature'],
          featureGaps: ['Missing Feature'],
          innovationScore: 80
        },
        positioningAnalysis: {
          productPositioning: {
            primaryMessage: 'Test message',
            valueProposition: 'Test value',
            targetAudience: 'Test audience',
            differentiators: ['Diff 1']
          },
          competitorPositioning: [
            {
              competitorId: 'comp-1',
              competitorName: 'Competitor 1',
              primaryMessage: 'Comp message',
              valueProposition: 'Comp value',
              targetAudience: 'Comp audience',
              differentiators: ['Comp diff']
            }
          ],
          positioningGaps: ['Gap 1'],
          marketOpportunities: ['Opportunity 1'],
          messagingEffectiveness: 75
        },
        userExperienceComparison: {
          productUX: {
            designQuality: 8,
            usabilityScore: 7,
            navigationStructure: 'Modern navigation',
            keyUserFlows: ['Flow 1']
          },
          competitorUX: [
            {
              competitorId: 'comp-1',
              competitorName: 'Competitor 1',
              designQuality: 6,
              usabilityScore: 7,
              navigationStructure: 'Traditional navigation',
              keyUserFlows: ['Flow A']
            }
          ],
          uxStrengths: ['Strength 1'],
          uxWeaknesses: ['Weakness 1'],
          uxRecommendations: ['UX Rec 1']
        },
        customerTargeting: {
          productTargeting: {
            primarySegments: ['Segment 1'],
            customerTypes: ['Type 1'],
            useCases: ['Use case 1']
          },
          competitorTargeting: [
            {
              competitorId: 'comp-1',
              competitorName: 'Competitor 1',
              primarySegments: ['Segment A'],
              customerTypes: ['Type A'],
              useCases: ['Use case A']
            }
          ],
          targetingOverlap: ['Overlap 1'],
          untappedSegments: ['Untapped 1']
        }
      },
      recommendations: {
        competitiveAdvantage: ['Advantage 1'],
        priorityScore: 85,
        immediateActions: ['Action 1'],
        shortTermActions: ['Short action 1'],
        longTermActions: ['Long action 1']
      },
      metadata: {
        analysisMethod: 'ai_powered',
        modelUsed: 'claude-3',
        confidenceScore: 85,
        processingTime: 5000,
        dataQuality: 'high'
      }
    };

    mockProduct = {
      id: 'product-1',
      name: 'Test Product',
      website: 'https://testproduct.com',
      positioning: 'Premium solution',
      customerData: 'Enterprise customers',
      userProblem: 'Efficiency problem',
      industry: 'Technology'
    };

    mockProductSnapshot = {
      id: 'snapshot-1',
      productId: 'product-1',
      content: {
        title: 'Test Product',
        description: 'A test product',
        features: ['Feature 1', 'Feature 2']
      },
      metadata: {
        scrapedAt: '2024-01-01T00:00:00Z',
        url: 'https://testproduct.com'
      },
      createdAt: new Date()
    };

    mockCompetitorSnapshots = [
      {
        competitor: { name: 'Competitor 1', website: 'https://competitor1.com' },
        snapshot: {
          id: 'comp-snapshot-1',
          competitorId: 'competitor-1',
          metadata: {
            title: 'Competitor 1',
            description: 'A competitor product'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    ];

    // Mock UX analyzer response
    mockUXAnalyzer.analyzeProductVsCompetitors.mockResolvedValue({
      summary: 'Strong UX foundation with room for mobile improvements',
      strengths: ['Clean design', 'Fast loading', 'Intuitive navigation'],
      weaknesses: ['Limited mobile optimization', 'Accessibility gaps'],
      opportunities: ['Mobile-first redesign', 'Voice interface'],
      recommendations: [
        'Implement responsive design',
        'Add accessibility features',
        'Optimize mobile performance',
        'Enhance user onboarding',
        'Improve search functionality',
        'Add dark mode support'
      ],
      competitorComparisons: [
        {
          competitorName: 'Competitor 1',
          competitorWebsite: 'https://competitor1.com',
          strengths: ['Better mobile experience'],
          weaknesses: ['Slower loading times'],
          keyDifferences: ['Different navigation approach'],
          learnings: ['Mobile-first design principles']
        }
      ],
      confidence: 0.85,
      metadata: {
        correlationId: 'test-correlation-id',
        analyzedAt: '2024-01-01T00:00:00Z',
        competitorCount: 1,
        analysisType: 'ux_focused'
      }
    });
  });

  describe('generateUXEnhancedReport', () => {
    it('should generate UX-enhanced report successfully', async () => {
      // Mock the standard report generation
      const mockStandardReport = {
        report: {
          id: 'report-1',
          title: 'Standard Report',
          description: 'A standard comparative report',
          sections: [
            {
              id: 'section-1',
              title: 'Executive Summary',
              content: 'Executive summary content',
              type: 'executive_summary' as const,
              order: 1,
              charts: [],
              tables: []
            }
          ],
          keyFindings: ['Finding 1', 'Finding 2'],
          keyThreats: ['Threat 1'],
          metadata: {
            productName: 'Test Product',
            competitorCount: 1,
            analysisDate: new Date(),
            generatedAt: new Date(),
            reportVersion: '1.0'
          }
        },
        generationTime: 5000,
        tokensUsed: 1000,
        cost: 0.01,
        warnings: [],
        errors: []
      };

      // Mock the generateComparativeReport method
      jest.spyOn(service, 'generateComparativeReport').mockResolvedValue(mockStandardReport);

      const result = await service.generateUXEnhancedReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorSnapshots
      );

      expect(result).toBeDefined();
      expect(result.report.sections).toHaveLength(3); // Original + 2 UX sections
      expect(result.report.sections[1].title).toBe('User Experience Analysis');
      expect(result.report.sections[2].title).toBe('Strategic UX Recommendations');
      expect(result.report.keyFindings).toContain('UX Analysis Confidence: 85%');
      
      // Verify UX analyzer was called with correct parameters
      expect(mockUXAnalyzer.analyzeProductVsCompetitors).toHaveBeenCalledWith(
        expect.objectContaining({
          product: { name: 'Test Product', website: 'https://testproduct.com' }
        }),
        expect.arrayContaining([
          expect.objectContaining({
            competitor: { name: 'Competitor 1', website: 'https://competitor1.com' }
          })
        ]),
        {
          focus: 'both',
          includeTechnical: true,
          includeAccessibility: true,
          maxCompetitors: 5
        }
      );
    });

    it('should handle UX analysis with low confidence', async () => {
      // Mock low confidence UX analysis
      mockUXAnalyzer.analyzeProductVsCompetitors.mockResolvedValue({
        summary: 'Limited analysis due to data constraints',
        strengths: ['Basic functionality'],
        weaknesses: ['Multiple areas need improvement'],
        opportunities: ['Comprehensive redesign needed'],
        recommendations: ['Conduct user research'],
        competitorComparisons: [],
        confidence: 0.6, // Low confidence
        metadata: {
          correlationId: 'test-correlation-id',
          analyzedAt: '2024-01-01T00:00:00Z',
          competitorCount: 1,
          analysisType: 'ux_focused'
        }
      });

      // Mock standard report
      jest.spyOn(service, 'generateComparativeReport').mockResolvedValue({
        report: {
          id: 'report-1',
          title: 'Standard Report',
          description: 'A standard comparative report',
          sections: [],
          keyFindings: [],
          keyThreats: [],
          metadata: {
            productName: 'Test Product',
            competitorCount: 1,
            analysisDate: new Date(),
            generatedAt: new Date(),
            reportVersion: '1.0'
          }
        },
        generationTime: 5000,
        tokensUsed: 1000,
        cost: 0.01,
        warnings: [],
        errors: []
      });

      const result = await service.generateUXEnhancedReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        mockCompetitorSnapshots
      );

      expect(result.warnings).toContain('UX analysis confidence is below 70%');
      expect(result.report.keyFindings).toContain('UX Analysis Confidence: 60%');
    });

    it('should handle UX analysis errors gracefully', async () => {
      mockUXAnalyzer.analyzeProductVsCompetitors.mockRejectedValue(
        new Error('UX analysis failed')
      );

      await expect(
        service.generateUXEnhancedReport(
          mockAnalysis,
          mockProduct,
          mockProductSnapshot,
          mockCompetitorSnapshots
        )
      ).rejects.toThrow('Failed to generate UX-enhanced report: UX analysis failed');
    });

    it('should limit competitors to maximum of 5', async () => {
      // Create more than 5 competitors
      const manyCompetitors = Array.from({ length: 7 }, (_, i) => ({
        competitor: { name: `Competitor ${i + 1}`, website: `https://competitor${i + 1}.com` },
        snapshot: {
          id: `comp-snapshot-${i + 1}`,
          competitorId: `competitor-${i + 1}`,
          metadata: { title: `Competitor ${i + 1}` },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }));

      // Mock standard report
      jest.spyOn(service, 'generateComparativeReport').mockResolvedValue({
        report: {
          id: 'report-1',
          title: 'Standard Report',
          description: 'A standard comparative report',
          sections: [],
          keyFindings: [],
          keyThreats: [],
          metadata: {
            productName: 'Test Product',
            competitorCount: 7,
            analysisDate: new Date(),
            generatedAt: new Date(),
            reportVersion: '1.0'
          }
        },
        generationTime: 5000,
        tokensUsed: 1000,
        cost: 0.01,
        warnings: [],
        errors: []
      });

      await service.generateUXEnhancedReport(
        mockAnalysis,
        mockProduct,
        mockProductSnapshot,
        manyCompetitors
      );

      // Verify that maxCompetitors option was set to 5
      expect(mockUXAnalyzer.analyzeProductVsCompetitors).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          maxCompetitors: 5
        })
      );
    });
  });
}); 