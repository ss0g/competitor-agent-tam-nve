import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ComparativeReportService } from '@/services/reports/comparativeReportService';
import { ComparativeAnalysisService } from '@/services/analysis/comparativeAnalysisService';
import { FileBasedComparativeReportRepository } from '@/lib/repositories/comparativeReportRepository';
import { 
  ComparativeAnalysisInput,
  ComparativeAnalysis,
  AnalysisFocusArea 
} from '@/types/analysis';
import { Product, ProductSnapshot } from '@/types/product';
import { 
  ReportGenerationOptions, 
  REPORT_TEMPLATES,
  ComparativeReport 
} from '@/types/comparativeReport';
import { join } from 'path';
import { rmdir } from 'fs/promises';

describe('Comparative Report Integration', () => {
  let reportService: ComparativeReportService;
  let analysisService: ComparativeAnalysisService;
  let reportRepository: FileBasedComparativeReportRepository;
  
  const testReportsDir = join(process.cwd(), 'test-reports');

  // Test data
  const testProduct: Product = {
    id: 'integration-product-id',
    name: 'AI Research Platform',
    website: 'https://ai-research-platform.com',
    positioning: 'Next-generation AI-powered research and competitive intelligence platform',
    customerData: 'B2B companies, market research firms, competitive intelligence teams',
    userProblem: 'Traditional competitive research is manual, time-consuming, and lacks real-time insights',
    industry: 'Software/AI',
    projectId: 'integration-project-id',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  };

  const testProductSnapshot: ProductSnapshot = {
    id: 'integration-snapshot-id',
    productId: 'integration-product-id',
    content: {
      title: 'AI Research Platform - Intelligent Competitive Intelligence',
      text: 'Transform your competitive research with our AI-powered platform that automates competitor monitoring, provides real-time market insights, and delivers actionable intelligence. Our advanced machine learning algorithms analyze competitor websites, social media, and public data to give you comprehensive competitive intelligence. Perfect for B2B SaaS companies, market research firms, and strategic planning teams. ' + 'X'.repeat(2200),
      html: '<h1>AI Research Platform</h1><p>Transform your competitive research...</p>',
      description: 'AI-powered competitive intelligence and market research platform'
    },
    metadata: {
      url: 'https://ai-research-platform.com',
      statusCode: 200,
      contentLength: 2500,
      lastModified: '2024-01-15',
      headers: {
        'content-type': 'text/html'
      }
    },
    createdAt: new Date('2024-01-15')
  };

  const testAnalysisInput: ComparativeAnalysisInput = {
    product: testProduct,
    productSnapshot: testProductSnapshot,
    competitors: [
      {
        competitor: {
          id: 'competitor-1',
          name: 'MarketScope Analytics',
          website: 'https://marketscope.com',
          description: 'Market research and competitive analysis platform',
          industry: 'Software',
          employeeCount: 150,
          revenue: undefined,
          founded: undefined,
          headquarters: undefined,
          socialMedia: undefined,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        snapshot: {
          id: 'competitor-1-snapshot',
          competitorId: 'competitor-1',
          metadata: {
            title: 'MarketScope Analytics - Market Research Solutions',
            text: 'MarketScope provides comprehensive market research and competitive analysis tools for enterprise customers. Our platform helps businesses understand market trends, analyze competitor strategies, and make data-driven decisions. With powerful analytics and intuitive dashboards, we serve Fortune 500 companies worldwide. ' + 'Y'.repeat(1800),
            url: 'https://marketscope.com',
            statusCode: 200,
            contentLength: 2200
          },
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15')
        }
      },
      {
        competitor: {
          id: 'competitor-2',
          name: 'CompIntel Pro',
          website: 'https://compintelpro.com',
          description: 'Professional competitive intelligence software',
          industry: 'Software',
          employeeCount: 75,
          revenue: undefined,
          founded: undefined,
          headquarters: undefined,
          socialMedia: undefined,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        snapshot: {
          id: 'competitor-2-snapshot',
          competitorId: 'competitor-2',
          metadata: {
            title: 'CompIntel Pro - Professional Competitive Intelligence',
            text: 'CompIntel Pro delivers professional-grade competitive intelligence software for strategic planning teams. Our solution monitors competitor activities, tracks market changes, and provides actionable insights for business strategy. Trusted by consulting firms and corporate strategy teams for competitive advantage. ' + 'Z'.repeat(1900),
            url: 'https://compintelpro.com',
            statusCode: 200,
            contentLength: 2300
          },
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15')
        }
      }
    ],
    analysisConfig: {
      focusAreas: ['features', 'positioning', 'user_experience', 'customer_targeting'] as AnalysisFocusArea[],
      depth: 'comprehensive',
      includeRecommendations: true
    }
  };

  beforeEach(async () => {
    reportService = new ComparativeReportService();
    analysisService = new ComparativeAnalysisService();
    reportRepository = new FileBasedComparativeReportRepository(testReportsDir);
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await rmdir(testReportsDir, { recursive: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Full Report Generation Workflow', () => {
    it('should generate complete comparative analysis and report', async () => {
      console.log('🚀 Starting end-to-end comparative report generation test...');

      // Step 1: Generate comparative analysis
      console.log('📊 Step 1: Generating comparative analysis...');
      const analysis = await analysisService.analyzeProductVsCompetitors(testAnalysisInput);

      expect(analysis).toBeDefined();
      expect(analysis.id).toBeDefined();
      expect(analysis.summary.overallPosition).toBeDefined();
      expect(analysis.detailed.featureComparison).toBeDefined();
      expect(analysis.recommendations).toBeDefined();

      console.log(`✅ Analysis completed with ${analysis.metadata.confidenceScore}% confidence`);

      // Step 2: Generate comprehensive report
      console.log('📝 Step 2: Generating comprehensive report...');
      const reportResult = await reportService.generateComparativeReport(
        analysis,
        testProduct,
        testProductSnapshot,
        {
          template: REPORT_TEMPLATES.COMPREHENSIVE,
          format: 'markdown',
          includeCharts: true,
          includeTables: true
        }
      );

      expect(reportResult.report).toBeDefined();
      expect(reportResult.report.sections).toHaveLength(6);
      expect(reportResult.generationTime).toBeGreaterThan(0);
      expect(reportResult.tokensUsed).toBeGreaterThan(0);

      console.log(`✅ Comprehensive report generated in ${reportResult.generationTime}ms`);
      console.log(`📊 Report metrics: ${reportResult.tokensUsed} tokens, $${reportResult.cost.toFixed(4)} cost`);

      // Step 3: Store report in repository
      console.log('💾 Step 3: Storing report in repository...');
      const storedReport = await reportRepository.create(reportResult.report);

      expect(storedReport.id).toBe(reportResult.report.id);
      expect(storedReport.title).toBe(reportResult.report.title);

      console.log(`✅ Report stored with ID: ${storedReport.id}`);

      // Step 4: Retrieve and verify stored report
      console.log('🔍 Step 4: Retrieving stored report...');
      const retrievedReport = await reportRepository.findById(storedReport.id);

      expect(retrievedReport).toBeDefined();
      expect(retrievedReport!.id).toBe(storedReport.id);
      expect(retrievedReport!.title).toBe(storedReport.title);
      expect(retrievedReport!.sections).toHaveLength(6);

      console.log(`✅ Report retrieved successfully`);

      // Step 5: Generate and verify report content file
      console.log('📄 Step 5: Verifying report content file...');
      const reportContent = await reportRepository.getReportFile(storedReport.id);

      expect(reportContent).toBeDefined();
      expect(reportContent).toContain('AI Research Platform');
      expect(reportContent).toContain('Executive Summary');
      expect(reportContent).toContain('MarketScope Analytics');
      expect(reportContent).toContain('CompIntel Pro');

      console.log(`✅ Report content file verified (${reportContent.length} characters)`);

      // Verify report structure and content
      expect(retrievedReport!.metadata.productName).toBe('AI Research Platform');
      expect(retrievedReport!.metadata.competitorCount).toBe(2);
      expect(retrievedReport!.strategicRecommendations.immediate).toBeDefined();
      expect(retrievedReport!.competitiveIntelligence.marketPosition).toBeDefined();

      console.log('🎉 End-to-end comparative report generation test completed successfully!');
    }, 60000); // 60 second timeout for integration test

    it('should generate executive summary report', async () => {
      console.log('🚀 Testing executive summary report generation...');

      // Generate analysis
      const analysis = await analysisService.analyzeProductVsCompetitors(testAnalysisInput);

      // Generate executive report
      const reportResult = await reportService.generateComparativeReport(
        analysis,
        testProduct,
        testProductSnapshot,
        {
          template: REPORT_TEMPLATES.EXECUTIVE,
          format: 'html'
        }
      );

      expect(reportResult.report.sections).toHaveLength(2); // Executive + Recommendations
      expect(reportResult.report.format).toBe('html');
      expect(reportResult.report.sections[0].type).toBe('executive_summary');
      expect(reportResult.report.sections[1].type).toBe('recommendations');

      // Store and verify
      const storedReport = await reportRepository.create(reportResult.report);
      const reportContent = await reportRepository.getReportFile(storedReport.id);

      expect(reportContent).toContain('<!DOCTYPE html>');
      expect(reportContent).toContain('<title>');
      expect(reportContent).toContain('AI Research Platform');

      console.log('✅ Executive summary report test completed');
    }, 45000);

    it('should generate technical analysis report', async () => {
      console.log('🚀 Testing technical analysis report generation...');

      // Generate analysis
      const analysis = await analysisService.analyzeProductVsCompetitors(testAnalysisInput);

      // Generate technical report
      const reportResult = await reportService.generateComparativeReport(
        analysis,
        testProduct,
        testProductSnapshot,
        {
          template: REPORT_TEMPLATES.TECHNICAL,
          format: 'markdown'
        }
      );

      expect(reportResult.report.sections).toHaveLength(3); // Technical overview, feature comparison, UX
      expect(reportResult.report.sections[0].type).toBe('executive_summary');
      expect(reportResult.report.sections[1].type).toBe('feature_comparison');
      expect(reportResult.report.sections[2].type).toBe('ux_comparison');

      // Verify technical content
      const featureSection = reportResult.report.sections.find(s => s.type === 'feature_comparison');
      expect(featureSection?.content).toContain('Feature Comparison Analysis');
      expect(featureSection?.content).toContain('AI Research Platform');

      console.log('✅ Technical analysis report test completed');
    }, 45000);

    it('should handle repository operations correctly', async () => {
      console.log('🚀 Testing repository operations...');

      // Generate multiple reports
      const analysis = await analysisService.analyzeProductVsCompetitors(testAnalysisInput);
      
      const report1 = await reportService.generateComparativeReport(
        analysis,
        testProduct,
        testProductSnapshot,
        { template: REPORT_TEMPLATES.COMPREHENSIVE }
      );

      const report2 = await reportService.generateComparativeReport(
        analysis,
        testProduct,
        testProductSnapshot,
        { template: REPORT_TEMPLATES.EXECUTIVE }
      );

      // Store both reports
      await reportRepository.create(report1.report);
      await reportRepository.create(report2.report);

      // Test findByProjectId
      const projectReports = await reportRepository.findByProjectId(testProduct.projectId);
      expect(projectReports).toHaveLength(2);

      // Test findByProductId
      const productReports = await reportRepository.findByProductId(testProduct.id);
      expect(productReports).toHaveLength(2);

      // Test findByAnalysisId
      const analysisReport = await reportRepository.findByAnalysisId(analysis.id);
      expect(analysisReport).toBeDefined();

      // Test list with filters
      const completedReports = await reportRepository.list({ status: 'completed' });
      expect(completedReports.length).toBeGreaterThanOrEqual(2);

      const markdownReports = await reportRepository.list({ format: 'markdown' });
      expect(markdownReports.length).toBeGreaterThanOrEqual(1);

      // Test update
      const updatedReport = await reportRepository.update(report1.report.id, {
        status: 'archived',
        title: 'Updated Report Title'
      });
      expect(updatedReport.status).toBe('archived');
      expect(updatedReport.title).toBe('Updated Report Title');

      // Test delete
      await reportRepository.delete(report2.report.id);
      const deletedReport = await reportRepository.findById(report2.report.id);
      expect(deletedReport).toBeNull();

      console.log('✅ Repository operations test completed');
    }, 60000);
  });

  describe('Report Content Validation', () => {
    it('should include all required sections with proper content', async () => {
      const analysis = await analysisService.analyzeProductVsCompetitors(testAnalysisInput);
      const reportResult = await reportService.generateComparativeReport(
        analysis,
        testProduct,
        testProductSnapshot,
        { template: REPORT_TEMPLATES.COMPREHENSIVE }
      );

      const report = reportResult.report;

      // Validate executive summary
      const execSummary = report.sections.find(s => s.type === 'executive_summary');
      expect(execSummary?.content).toContain('Market Position:');
      expect(execSummary?.content).toContain('Opportunity Score:');
      expect(execSummary?.content).toContain('Threat Level:');
      expect(execSummary?.content).toContain('Confidence:');

      // Validate feature comparison
      const featureComp = report.sections.find(s => s.type === 'feature_comparison');
      expect(featureComp?.content).toContain('AI Research Platform');
      expect(featureComp?.content).toContain('MarketScope Analytics');
      expect(featureComp?.content).toContain('Feature Gaps');
      expect(featureComp?.content).toContain('Innovation Score:');

      // Validate positioning analysis
      const positioning = report.sections.find(s => s.type === 'positioning_analysis');
      expect(positioning?.content).toContain('Market Positioning Analysis');
      expect(positioning?.content).toContain('Value Proposition');
      expect(positioning?.content).toContain('Market Opportunities');

      // Validate UX comparison
      const uxComp = report.sections.find(s => s.type === 'ux_comparison');
      expect(uxComp?.content).toContain('User Experience Comparison');
      expect(uxComp?.content).toContain('Design Quality:');
      expect(uxComp?.content).toContain('Usability Score:');

      // Validate customer targeting
      const targeting = report.sections.find(s => s.type === 'customer_targeting');
      expect(targeting?.content).toContain('Customer Targeting Analysis');
      expect(targeting?.content).toContain('Primary Segments');
      expect(targeting?.content).toContain('Competitive Advantages');

      // Validate recommendations
      const recommendations = report.sections.find(s => s.type === 'recommendations');
      expect(recommendations?.content).toContain('Strategic Recommendations');
      expect(recommendations?.content).toContain('Immediate Actions');
      expect(recommendations?.content).toContain('Long-term Strategy');

      console.log('✅ All report sections validated successfully');
    }, 45000);
  });

  describe('Error Handling', () => {
    it('should handle invalid analysis data gracefully', async () => {
      const invalidAnalysis = {
        id: 'invalid-analysis',
        summary: undefined, // Missing required field
        detailed: {},
        recommendations: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;

      await expect(reportService.generateComparativeReport(
        invalidAnalysis,
        testProduct,
        testProductSnapshot
      )).rejects.toThrow();

      console.log('✅ Invalid analysis error handling verified');
    });

    it('should handle repository errors gracefully', async () => {
      const invalidReportId = 'non-existent-report-id';

      const report = await reportRepository.findById(invalidReportId);
      expect(report).toBeNull();

      await expect(reportRepository.update(invalidReportId, { title: 'Updated' }))
        .rejects.toThrow();

      console.log('✅ Repository error handling verified');
    });
  });
}); 