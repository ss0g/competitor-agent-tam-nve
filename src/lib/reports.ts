import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { TrendAnalyzer, TrendAnalysisOptions } from './trends';
import prisma from '@/lib/prisma';
import {
  ReportData,
  ReportSection,
  ReportMetadata,
  ReportVersion,
  APIResponse,
  ValidationError
} from '@/types/reports';
import { z } from 'zod';
import { logger, trackError, trackPerformance, trackBusinessEvent } from './logger';

// Validation schemas
const reportSectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['summary', 'changes', 'trends', 'recommendations']),
  order: z.number().int().min(0),
});

const reportMetadataSchema = z.object({
  competitor: z.object({
    name: z.string().min(1, 'Competitor name is required'),
    url: z.string().url('Invalid URL'),
  }),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }),
  analysisCount: z.number().int().min(0),
  significantChanges: z.number().int().min(0),
});

const reportDataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  sections: z.array(reportSectionSchema),
  metadata: reportMetadataSchema,
  version: z.object({
    number: z.number().int().min(1),
    createdAt: z.date(),
    changeLog: z.string().optional(),
  }).optional(),
});

export interface ReportGenerationOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackToSimpleReport?: boolean;
  aiTimeout?: number;
}

export class ReportGenerator {
  private prisma = prisma;
  private bedrock: BedrockRuntimeClient;
  private trendAnalyzer: TrendAnalyzer;
  private readonly defaultOptions: ReportGenerationOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackToSimpleReport: true,
    aiTimeout: 30000, // 30 seconds
  };

  constructor() {
    logger.info('Initializing ReportGenerator');
    
    try {
      // Use default AWS credential chain if explicit credentials are not provided
      const awsConfig: any = {
        region: process.env.AWS_REGION || 'us-east-1',
      };

      // Only set explicit credentials if they are provided in environment
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        awsConfig.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_SESSION_TOKEN,
        };
      }
      // Otherwise, let AWS SDK use default credential chain (AWS CLI, IAM roles, etc.)

      this.bedrock = new BedrockRuntimeClient(awsConfig);
      this.trendAnalyzer = new TrendAnalyzer();
      
      logger.info('ReportGenerator initialized successfully', {
        region: process.env.AWS_REGION || 'us-east-1',
        usingExplicitCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      });
    } catch (error) {
      logger.error('Failed to initialize ReportGenerator', error as Error);
      throw error;
    }
  }

  async generateReport(
    competitorId: string,
    timeframe: number = 30,
    options?: {
      userId?: string;
      changeLog?: string;
      reportOptions?: ReportGenerationOptions;
    }
  ): Promise<APIResponse<ReportData>> {
    return logger.timeOperation('report_generation', async () => {
      const reportOptions = { ...this.defaultOptions, ...options?.reportOptions };
      const context = {
        competitorId,
        timeframe,
        userId: options?.userId,
        changeLog: options?.changeLog
      };

      try {
        logger.info('Starting report generation', context);

        // Input validation
        const inputValidation = this.validateInputs(competitorId, timeframe);
        if (inputValidation) {
          return inputValidation;
        }

        // Get competitor data with snapshots and analyses
        logger.debug('Fetching competitor data', context);
        const competitor = await this.prisma.competitor.findUnique({
          where: { id: competitorId },
          include: {
            snapshots: {
              include: {
                analyses: {
                  include: {
                    trends: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: Math.min(timeframe, 100), // Limit for performance
            },
          },
        });

        if (!competitor) {
          logger.warn('Competitor not found', context);
          return { error: 'Competitor not found' };
        }

        // Ensure snapshots is an array
        if (!Array.isArray(competitor.snapshots)) {
          logger.warn('Competitor snapshots is not an array', {
            ...context,
            snapshotsType: typeof competitor.snapshots
          });
          competitor.snapshots = [];
        }

        // Filter snapshots by timeframe
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - timeframe);

        const filteredSnapshots = competitor.snapshots.filter(
          (snapshot: any) => snapshot.createdAt >= startDate
        );

        if (filteredSnapshots.length === 0) {
          logger.info('No snapshots found in timeframe', {
            ...context,
            startDate,
            endDate
          });
          return { error: 'No data available for the specified timeframe' };
        }

        // Analyze trends with enhanced error handling
        logger.debug('Analyzing trends', {
          ...context,
          snapshotsCount: filteredSnapshots.length
        });

        let trends: Array<{ trend: string; impact: number }> = [];
        try {
          trends = await this.trendAnalyzer.analyzeTrends(
            competitorId, 
            timeframe,
            { 
              fallbackToSimpleAnalysis: reportOptions.fallbackToSimpleReport,
              maxRetries: reportOptions.maxRetries,
              retryDelay: reportOptions.retryDelay
            }
          );
        } catch (trendError) {
          logger.warn('Trend analysis failed, continuing with empty trends', {
            ...context,
            error: trendError instanceof Error ? trendError.message : 'Unknown error'
          });

          if (reportOptions.fallbackToSimpleReport) {
            // Continue with empty trends rather than failing the entire report
            trends = [];
          } else {
            throw this.enhanceReportError(trendError as Error, 'trend_analysis');
          }
        }

        // Calculate report metadata
        logger.debug('Calculating report metadata', context);
        const analysisCount = filteredSnapshots.reduce(
          (count: number, snapshot: any) => {
            const analyses = Array.isArray(snapshot.analyses) ? snapshot.analyses : [];
            return count + analyses.length;
          },
          0
        );
        const significantChanges = this.countSignificantChanges(filteredSnapshots);

        logger.debug('Report metadata calculated', {
          ...context,
          analysisCount,
          significantChanges,
          trendsCount: trends.length
        });

        // Generate report sections with fallbacks
        logger.debug('Generating report sections', context);
        const sections = await this.generateSectionsWithRetry(
          {
            name: competitor.name,
            snapshots: filteredSnapshots.map((snapshot: any) => ({
              analyses: Array.isArray(snapshot.analyses) 
                ? snapshot.analyses.map((analysis: any) => {
                    const data = analysis.data as any;
                    return {
                      keyChanges: data?.primary?.keyChanges || [],
                      marketingChanges: data?.primary?.marketingChanges || [],
                      productChanges: data?.primary?.productChanges || []
                    };
                  })
                : []
            }))
          },
          trends,
          startDate,
          endDate,
          reportOptions
        );

        // Create report title and description with fallbacks
        const title = await this.generateTitleWithFallback(competitor.name, startDate, endDate, reportOptions);
        const description = await this.generateDescriptionWithFallback(
          {
            name: competitor.name,
            url: competitor.website
          },
          analysisCount,
          significantChanges,
          trends,
          reportOptions
        );

        const reportData: ReportData = {
          title,
          description,
          sections,
          metadata: {
            competitor: {
              name: competitor.name,
              url: competitor.website,
            },
            dateRange: {
              start: startDate,
              end: endDate,
            },
            analysisCount,
            significantChanges,
          },
        };

        // Validate report data
        logger.debug('Validating generated report data', context);
        const reportValidation = reportDataSchema.safeParse(reportData);
        if (!reportValidation.success) {
          logger.error('Report validation failed', new Error('Validation failed'), {
            ...context,
            validationErrors: reportValidation.error.errors
          });
          return {
            error: 'Invalid report data',
            validationErrors: reportValidation.error.errors.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message
            }))
          };
        }

        // Create or update report in database
        logger.debug('Saving report to database', context);
        const report = await this.prisma.report.create({
          data: {
            name: title,
            description,
            competitorId,
          },
        });

        // Create report version
        await this.prisma.reportVersion.create({
          data: {
            reportId: report.id,
            version: 1,
            content: reportData as any,
          },
        });

        logger.info('Report generated successfully', {
          ...context,
          reportId: report.id,
          title,
          sectionsCount: sections.length,
          analysisCount,
          significantChanges,
          aiServiceUsed: reportOptions.fallbackToSimpleReport ? 'mixed' : 'ai'
        });

        // Track business event for successful report generation
        trackBusinessEvent('report_generated', {
          competitorId,
          competitorName: competitor.name,
          timeframe,
          analysisCount,
          significantChanges,
          sectionsGenerated: sections.length,
          aiServiceUsed: reportOptions.fallbackToSimpleReport
        }, { ...context, reportId: report.id });

        return { data: reportData };
      } catch (error) {
        const enhancedError = this.enhanceReportError(error as Error, 'report_generation');
        trackError(enhancedError, 'report_generation', context);
        logger.error('Error generating report:', enhancedError);
        
        return {
          error: enhancedError.message,
          validationErrors: [{
            field: 'general',
            message: enhancedError.message
          }]
        };
      }
    });
  }

  private validateInputs(competitorId: string, timeframe: number): APIResponse<ReportData> | null {
    if (!competitorId || competitorId.trim() === '') {
      logger.warn('Competitor ID is required');
      return { 
        error: 'Competitor ID is required',
        validationErrors: [{
          field: 'competitorId',
          message: 'Competitor ID is required'
        }]
      };
    }

    if (timeframe <= 0 || timeframe > 365) {
      logger.warn('Invalid timeframe');
      return { 
        error: 'Invalid timeframe. Must be between 1 and 365 days',
        validationErrors: [{
          field: 'timeframe',
          message: 'Timeframe must be between 1 and 365 days'
        }]
      };
    }

    return null;
  }

  private enhanceReportError(error: Error, operation: string): Error {
    if (error.name === 'CredentialsExpiredError' || error.name === 'ExpiredTokenException') {
      const enhancedError = new Error(
        'Report generation failed: AWS credentials have expired. Please refresh your AWS session token.'
      );
      enhancedError.name = 'ReportCredentialsError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.name === 'CredentialsInvalidError') {
      const enhancedError = new Error(
        'Report generation failed: AWS credentials are invalid. Please check your configuration.'
      );
      enhancedError.name = 'ReportCredentialsError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.name === 'InvalidRegionError') {
      const enhancedError = new Error(
        `Report generation failed: AWS Bedrock is not available in region ${process.env.AWS_REGION}. Please use a supported region.`
      );
      enhancedError.name = 'ReportRegionError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.name === 'RateLimitError') {
      const enhancedError = new Error(
        'Report generation failed: AWS Bedrock rate limit exceeded. Please try again later.'
      );
      enhancedError.name = 'ReportRateLimitError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    // For database connection errors
    if (error.message.includes('database') || error.message.includes('connection')) {
      const enhancedError = new Error(
        'Report generation failed: Database connection error. Please try again later.'
      );
      enhancedError.name = 'ReportDatabaseError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    return error;
  }

  async getReportVersions(reportId: string): Promise<ReportVersion[]> {
    const versions = await this.prisma.reportVersion.findMany({
      where: { reportId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        content: true,
        createdAt: true,
      },
    });

    return versions.map((version: any) => {
      const content = version.content as any;
      return {
        number: version.version,
        createdAt: version.createdAt,
        changeLog: content?.changeLog || undefined,
      };
    });
  }

  async getReportVersion(versionId: string): Promise<ReportData | null> {
    const version = await this.prisma.reportVersion.findUnique({
      where: { id: versionId },
      include: {
        report: {
          include: {
            competitor: true,
          },
        },
      },
    });

    if (!version) {
      return null;
    }

    const content = version.content as any;
    return {
      title: content.title || '',
      description: content.description || '',
      sections: content.sections || [],
      metadata: content.metadata || {},
      version: {
        number: version.version,
        createdAt: version.createdAt,
        changeLog: content.changeLog || undefined,
      },
    };
  }

  private async generateTitle(
    competitorName: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const dateRange = this.formatDateRange(startDate, endDate);
    return `Competitive Analysis Report: ${competitorName} - ${dateRange}`;
  }

  private async generateDescription(
    competitor: {
      name: string;
      url: string;
    },
    analysisCount: number,
    significantChanges: number,
    trends: Array<{ trend: string; impact: number }>
  ): Promise<string> {
    const prompt = `
Generate a concise executive summary for a competitive analysis report with the following details:

Competitor: ${competitor.name}
Website: ${competitor.url}
Analysis Period: ${analysisCount} analyses performed
Significant Changes: ${significantChanges} major changes detected

Key Trends:
${trends
  .filter(t => t.impact > 0.5 || t.impact < -0.5)
  .map(t => `- ${t.trend} (Impact: ${(t.impact * 100).toFixed(1)}%)`)
  .join('\n')}

Format the summary in 2-3 sentences, highlighting the most important findings and their business implications.
`;

    try {
      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: '2023-06-01',
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      const response = await this.bedrock.send(command);
      const rawResponse = new TextDecoder().decode(response.body);
      const data = JSON.parse(rawResponse);
      
      return data.content?.[0]?.text || `Analysis of ${competitor.name} showing ${significantChanges} significant changes over ${analysisCount} analyses.`;
    } catch (error) {
      logger.error('Failed to generate description', error as Error);
      return `Analysis of ${competitor.name} showing ${significantChanges} significant changes over ${analysisCount} analyses.`;
    }
  }

  private async generateSections(
    competitor: {
      name: string;
      snapshots: Array<{
        analyses: Array<{
          keyChanges: string[];
          marketingChanges: string[];
          productChanges: string[];
        }>;
      }>;
    },
    trends: Array<{ trend: string; impact: number }>,
    startDate: Date,
    endDate: Date
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    // Executive Summary
    sections.push({
      title: 'Executive Summary',
      content: await this.generateExecutiveSummary(competitor, trends),
      type: 'summary',
      order: 1,
    });

    // Key Changes
    sections.push({
      title: 'Significant Changes',
      content: await this.generateChangesSection(competitor.snapshots),
      type: 'changes',
      order: 2,
    });

    // Trend Analysis
    sections.push({
      title: 'Trend Analysis',
      content: await this.generateTrendsSection(trends),
      type: 'trends',
      order: 3,
    });

    // Strategic Recommendations
    sections.push({
      title: 'Strategic Recommendations',
      content: await this.generateRecommendations(competitor, trends),
      type: 'recommendations',
      order: 4,
    });

    return sections;
  }

  private async generateExecutiveSummary(
    competitor: { name: string },
    trends: Array<{ trend: string; impact: number }>
  ): Promise<string> {
    const topTrends = trends
      .filter(t => Math.abs(t.impact) > 0.3)
      .slice(0, 3)
      .map(t => `${t.trend} (impact: ${(t.impact * 100).toFixed(1)}%)`)
      .join(', ');
    
    return `Executive summary for ${competitor.name}: Analysis reveals ${trends.length} trends with key developments including ${topTrends || 'steady market position'}. Strategic monitoring continues to track competitive positioning and market opportunities.`;
  }

  private async generateChangesSection(snapshots: Array<{
    analyses: Array<{
      keyChanges: string[];
      marketingChanges: string[];
      productChanges: string[];
    }>;
  }>): Promise<string> {
    const allChanges = snapshots.flatMap(snapshot => 
      snapshot.analyses.flatMap(analysis => [
        ...analysis.keyChanges,
        ...analysis.marketingChanges,
        ...analysis.productChanges
      ])
    );
    
    if (allChanges.length === 0) {
      return 'No significant changes detected during the analysis period.';
    }
    
    const significantChanges = allChanges.filter(change => change && change.length > 10);
    const summary = significantChanges.slice(0, 5).join('\n• ');
    
    return `Key changes detected:\n• ${summary}${significantChanges.length > 5 ? `\n• ...and ${significantChanges.length - 5} additional changes` : ''}`;
  }

  private async generateTrendsSection(
    trends: Array<{ trend: string; impact: number }>
  ): Promise<string> {
    if (trends.length === 0) {
      return 'No significant trends identified during the analysis period.';
    }
    
    const positiveTrends = trends.filter(t => t.impact > 0.2).slice(0, 3);
    const negativeTrends = trends.filter(t => t.impact < -0.2).slice(0, 3);
    
    let content = 'Trend Analysis:\n\n';
    
    if (positiveTrends.length > 0) {
      content += 'Positive Trends:\n';
      content += positiveTrends.map(t => `• ${t.trend} (${(t.impact * 100).toFixed(1)}% impact)`).join('\n');
      content += '\n\n';
    }
    
    if (negativeTrends.length > 0) {
      content += 'Areas of Concern:\n';
      content += negativeTrends.map(t => `• ${t.trend} (${(Math.abs(t.impact) * 100).toFixed(1)}% negative impact)`).join('\n');
    }
    
    return content.trim() || 'Market trends are stable with no significant changes detected.';
  }

  private async generateRecommendations(
    competitor: { name: string },
    trends: Array<{ trend: string; impact: number }>
  ): Promise<string> {
    const highImpactTrends = trends.filter(t => Math.abs(t.impact) > 0.5);
    
    if (highImpactTrends.length === 0) {
      return `Strategic Recommendations for ${competitor.name}:\n\n• Continue monitoring competitive position\n• Maintain current market strategy\n• Review analysis quarterly for emerging trends`;
    }
    
    let recommendations = `Strategic Recommendations for ${competitor.name}:\n\n`;
    
    highImpactTrends.slice(0, 3).forEach((trend, index) => {
      if (trend.impact > 0) {
        recommendations += `• Leverage ${trend.trend.toLowerCase()} opportunity for competitive advantage\n`;
      } else {
        recommendations += `• Address ${trend.trend.toLowerCase()} to mitigate competitive risk\n`;
      }
    });
    
    recommendations += `• Implement regular monitoring of identified trends\n`;
    recommendations += `• Review strategy alignment with market developments`;
    
    return recommendations;
  }

  private countSignificantChanges(snapshots: Array<{
    analyses: Array<{
      data?: any;
    }>;
  }>): number {
    return snapshots.reduce((total, snapshot) => {
      return total + snapshot.analyses.reduce((count, analysis) => {
        const data = analysis.data as any;
        const changes = [
          ...(data?.primary?.keyChanges || []),
          ...(data?.primary?.marketingChanges || []),
          ...(data?.primary?.productChanges || [])
        ];
        return count + changes.filter(change => 
          change && typeof change === 'string' && change.length > 10
        ).length;
      }, 0);
    }, 0);
  }

  private formatDateRange(startDate: Date, endDate: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    return `${startDate.toLocaleDateString(undefined, options)} - ${endDate.toLocaleDateString(
      undefined,
      options
    )}`;
  }

  private async generateTitleWithFallback(
    competitorName: string,
    startDate: Date,
    endDate: Date,
    options: ReportGenerationOptions
  ): Promise<string> {
    try {
      return await this.generateTitle(competitorName, startDate, endDate);
    } catch (error) {
      logger.warn('AI title generation failed, using fallback', { 
        competitorName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return `${competitorName} Competitive Analysis - ${this.formatDateRange(startDate, endDate)}`;
    }
  }

  private async generateDescriptionWithFallback(
    competitor: { name: string; url: string },
    analysisCount: number,
    significantChanges: number,
    trends: Array<{ trend: string; impact: number }>,
    options: ReportGenerationOptions
  ): Promise<string> {
    try {
      return await this.generateDescription(competitor, analysisCount, significantChanges, trends);
    } catch (error) {
      logger.warn('AI description generation failed, using fallback', { 
        competitorName: competitor.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return `Comprehensive analysis of ${competitor.name} covering ${analysisCount} data points with ${significantChanges} significant changes detected. This report provides insights into competitive positioning, market trends, and strategic recommendations based on ${trends.length} identified trends.`;
    }
  }

  private async generateSectionsWithRetry(
    competitor: any,
    trends: Array<{ trend: string; impact: number }>,
    startDate: Date,
    endDate: Date,
    options: ReportGenerationOptions
  ): Promise<ReportSection[]> {
    try {
      return await this.generateSections(competitor, trends, startDate, endDate);
    } catch (error) {
      logger.warn('AI section generation failed, using fallback', { 
        competitorName: competitor.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (options.fallbackToSimpleReport) {
        return this.generateFallbackSections(competitor, trends);
      } else {
        throw error;
      }
    }
  }

  private generateFallbackSections(
    competitor: any,
    trends: Array<{ trend: string; impact: number }>
  ): ReportSection[] {
    const sections: ReportSection[] = [];

    // Executive Summary
    sections.push({
      title: 'Executive Summary',
      content: `This report analyzes ${competitor.name}'s competitive position based on available data. ${trends.length} key trends have been identified, indicating ${trends.length > 0 ? 'active market development' : 'stable market conditions'}.`,
      type: 'summary',
      order: 1,
    });

    // Key Changes
    const allChanges = competitor.snapshots.flatMap((snapshot: any) => 
      snapshot.analyses.flatMap((analysis: any) => [
        ...analysis.keyChanges,
        ...analysis.marketingChanges,
        ...analysis.productChanges
      ])
    );

    sections.push({
      title: 'Significant Changes',
      content: allChanges.length > 0 
        ? `Key changes detected:\n• ${allChanges.slice(0, 5).join('\n• ')}`
        : 'No significant changes detected during the analysis period.',
      type: 'changes',
      order: 2,
    });

    // Trend Analysis
    sections.push({
      title: 'Trend Analysis',
      content: trends.length > 0
        ? `Trends identified:\n• ${trends.map(t => `${t.trend} (${(t.impact * 100).toFixed(1)}% impact)`).join('\n• ')}`
        : 'No significant trends identified during the analysis period.',
      type: 'trends',
      order: 3,
    });

    // Strategic Recommendations
    sections.push({
      title: 'Strategic Recommendations',
      content: `Strategic recommendations for ${competitor.name}:\n• Continue monitoring competitive position\n• Review market developments regularly\n• Analyze competitor responses to market changes`,
      type: 'recommendations',
      order: 4,
    });

    return sections;
  }
} 