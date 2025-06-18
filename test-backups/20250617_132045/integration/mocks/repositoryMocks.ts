import { jest } from '@jest/globals';

/**
 * Integration Repository Mocks - Mock database interactions
 * Provides realistic repository behavior without actual database connections
 */
export const IntegrationRepositoryMocks = {
  
  // Comparative Report Repository Mock
  comparativeReportRepository: {
    create: jest.fn().mockImplementation(async (reportData) => {
      // Simulate database insert with realistic response
      const mockId = reportData.id || `report-${Date.now()}`;
      
      return {
        id: mockId,
        title: reportData.title || 'Generated Report',
        description: reportData.description || 'Mock generated report',
        projectId: reportData.projectId || 'mock-project-id',
        productId: reportData.productId || 'mock-product-id',
        analysisId: reportData.analysisId || 'mock-analysis-id',
        status: 'completed' as const,
        format: reportData.format || 'markdown' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: reportData.sections || []
      };
    }),
    
    findById: jest.fn().mockImplementation(async (id) => {
      // Simulate database query by ID
      if (!id) {
        return null;
      }
      
      return {
        id: id,
        title: 'Mock Report',
        description: 'Mock report from repository',
        projectId: 'mock-project-id',
        productId: 'mock-product-id',
        analysisId: 'mock-analysis-id',
        sections: [
          {
            id: 'section-1',
            title: 'Executive Summary',
            content: 'Mock executive summary content',
            type: 'executive_summary' as const,
            order: 1
          },
          {
            id: 'section-2',
            title: 'Analysis Results',
            content: 'Mock analysis results content',
            type: 'feature_comparison' as const,
            order: 2
          }
        ],
        executiveSummary: 'Mock executive summary from repository',
        keyFindings: ['Finding 1', 'Finding 2'],
        strategicRecommendations: {
          immediate: ['Immediate action 1'],
          shortTerm: ['Short term action 1'],
          longTerm: ['Long term action 1'],
          priorityScore: 85
        },
        competitiveIntelligence: {
          marketPosition: 'Strong position',
          keyThreats: ['Threat 1'],
          opportunities: ['Opportunity 1'],
          competitiveAdvantages: ['Advantage 1']
        },
        status: 'completed' as const,
        format: 'markdown' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }),
    
    findByAnalysisId: jest.fn().mockImplementation(async (analysisId) => {
      // Simulate finding reports by analysis ID
      return [
        {
          id: `report-for-${analysisId}`,
          title: 'Report for Analysis',
          analysisId: analysisId,
          status: 'completed' as const,
          createdAt: new Date()
        }
      ];
    }),
    
    update: jest.fn().mockImplementation(async (id, updateData) => {
      // Simulate database update
      return {
        id: id,
        ...updateData,
        updatedAt: new Date()
      };
    }),
    
    delete: jest.fn().mockImplementation(async (id) => {
      // Simulate database delete
      return { success: true, deletedId: id };
    }),
    
    list: jest.fn().mockImplementation(async (options = {}) => {
      // Simulate listing reports with pagination
      const mockReports = [
        {
          id: 'report-1',
          title: 'Mock Report 1',
          status: 'completed' as const,
          createdAt: new Date()
        },
        {
          id: 'report-2',
          title: 'Mock Report 2',
          status: 'completed' as const,
          createdAt: new Date()
        }
      ];
      
      return {
        reports: mockReports,
        total: mockReports.length,
        page: options.page || 1,
        limit: options.limit || 10
      };
    })
  },
  
  // Comparative Analysis Repository Mock
  comparativeAnalysisRepository: {
    create: jest.fn().mockImplementation(async (analysisData) => {
      const mockId = analysisData.id || `analysis-${Date.now()}`;
      
      return {
        id: mockId,
        projectId: analysisData.projectId || 'mock-project-id',
        productId: analysisData.productId || 'mock-product-id',
        competitorIds: analysisData.competitorIds || ['competitor-1'],
        analysisDate: new Date(),
        status: 'completed' as const,
        summary: analysisData.summary || {
          overallPosition: 'competitive' as const,
          keyStrengths: ['Mock strength'],
          keyWeaknesses: ['Mock weakness'],
          opportunityScore: 85,
          threatLevel: 'medium' as const
        },
        metadata: {
          analysisMethod: 'ai_powered' as const,
          confidenceScore: 87,
          processingTime: 1500,
          dataQuality: 'high' as const
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }),
    
    findById: jest.fn().mockImplementation(async (id) => {
      if (!id) {
        return null;
      }
      
      return {
        id: id,
        projectId: 'mock-project-id',
        productId: 'mock-product-id',
        competitorIds: ['competitor-1', 'competitor-2'],
        analysisDate: new Date(),
        summary: {
          overallPosition: 'competitive' as const,
          keyStrengths: ['AI-powered analysis', 'Real-time monitoring'],
          keyWeaknesses: ['Mobile app missing'],
          opportunityScore: 87,
          threatLevel: 'medium' as const
        },
        detailed: {
          featureComparison: {
            productFeatures: ['Feature 1', 'Feature 2'],
            competitorFeatures: [],
            uniqueToProduct: ['Unique feature'],
            uniqueToCompetitors: [],
            commonFeatures: ['Common feature'],
            featureGaps: [],
            innovationScore: 85
          },
          positioningAnalysis: {
            productPositioning: {
              primaryMessage: 'AI-first platform',
              valueProposition: 'Advanced automation',
              targetAudience: 'B2B SaaS companies',
              differentiators: ['AI-powered analysis']
            },
            competitorPositioning: [],
            positioningGaps: [],
            marketOpportunities: [],
            messagingEffectiveness: 85
          },
          userExperienceComparison: {
            productUX: {
              designQuality: 85,
              usabilityScore: 82,
              navigationStructure: 'Modern sidebar',
              keyUserFlows: ['Analysis creation'],
              loadTime: 1200
            },
            competitorUX: [],
            uxStrengths: ['Clean interface'],
            uxWeaknesses: ['Mobile optimization'],
            uxRecommendations: ['Improve mobile UX']
          },
          customerTargeting: {
            productTargeting: {
              primarySegments: ['B2B SaaS'],
              customerTypes: ['Product Managers'],
              useCases: ['Competitive Analysis']
            },
            competitorTargeting: [],
            targetingOverlap: [],
            untappedSegments: [],
            competitiveAdvantage: []
          }
        },
        recommendations: {
          immediate: ['Enhance AI capabilities'],
          shortTerm: ['Develop integrations'],
          longTerm: ['Expand platform'],
          priorityScore: 85
        },
        metadata: {
          analysisMethod: 'ai_powered' as const,
          modelUsed: 'anthropic.claude-3-sonnet',
          confidenceScore: 87,
          processingTime: 1500,
          dataQuality: 'high' as const
        }
      };
    }),
    
    findByProjectId: jest.fn().mockImplementation(async (projectId) => {
      return [
        {
          id: `analysis-for-${projectId}`,
          projectId: projectId,
          productId: 'mock-product-id',
          analysisDate: new Date(),
          status: 'completed' as const
        }
      ];
    }),
    
    update: jest.fn().mockImplementation(async (id, updateData) => {
      return {
        id: id,
        ...updateData,
        updatedAt: new Date()
      };
    }),
    
    delete: jest.fn().mockImplementation(async (id) => {
      return { success: true, deletedId: id };
    })
  },
  
  // Product Repository Mock
  productRepository: {
    create: jest.fn().mockImplementation(async (productData) => {
      return {
        id: productData.id || `product-${Date.now()}`,
        name: productData.name || 'Mock Product',
        website: productData.website || 'https://mock-product.com',
        positioning: productData.positioning || 'Mock positioning',
        customerData: productData.customerData || 'Mock customer data',
        userProblem: productData.userProblem || 'Mock user problem',
        industry: productData.industry || 'Software',
        projectId: productData.projectId || 'mock-project-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }),
    
    findById: jest.fn().mockImplementation(async (id) => {
      if (!id) {
        return null;
      }
      
      return {
        id: id,
        name: 'Mock Product',
        website: 'https://mock-product.com',
        positioning: 'AI-powered competitive intelligence platform',
        customerData: 'B2B SaaS companies, strategy teams',
        userProblem: 'Manual competitive research is time-consuming',
        industry: 'Software/AI',
        projectId: 'mock-project-id',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }),
    
    findByProjectId: jest.fn().mockImplementation(async (projectId) => {
      return [
        {
          id: `product-for-${projectId}`,
          name: 'Project Product',
          projectId: projectId,
          createdAt: new Date()
        }
      ];
    })
  },
  
  // Competitor Repository Mock
  competitorRepository: {
    create: jest.fn().mockImplementation(async (competitorData) => {
      return {
        id: competitorData.id || `competitor-${Date.now()}`,
        name: competitorData.name || 'Mock Competitor',
        website: competitorData.website || 'https://mock-competitor.com',
        description: competitorData.description || 'Mock competitor description',
        industry: competitorData.industry || 'Software',
        employeeCount: competitorData.employeeCount || 100,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }),
    
    findById: jest.fn().mockImplementation(async (id) => {
      if (!id) {
        return null;
      }
      
      return {
        id: id,
        name: 'Mock Competitor',
        website: 'https://mock-competitor.com',
        description: 'Mock competitor for testing',
        industry: 'Software',
        employeeCount: 150,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }),
    
    findByIds: jest.fn().mockImplementation(async (ids) => {
      return ids.map((id: string) => ({
        id: id,
        name: `Competitor ${id}`,
        website: `https://competitor-${id}.com`,
        description: `Mock competitor ${id}`,
        industry: 'Software',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    })
  },
  
  // File System Mock (for file-based repositories)
  fileSystem: {
    writeFile: jest.fn().mockImplementation(async (filePath, content) => {
      return { success: true, filePath, size: content.length };
    }),
    
    readFile: jest.fn().mockImplementation(async (filePath) => {
      return JSON.stringify({
        id: 'mock-file-data',
        content: 'Mock file content',
        createdAt: new Date().toISOString()
      });
    }),
    
    exists: jest.fn().mockImplementation(async (filePath) => {
      return true; // Assume files exist for integration tests
    }),
    
    mkdir: jest.fn().mockImplementation(async (dirPath) => {
      return { success: true, dirPath };
    }),
    
    readdir: jest.fn().mockImplementation(async (dirPath) => {
      return ['file1.json', 'file2.json'];
    })
  }
}; 