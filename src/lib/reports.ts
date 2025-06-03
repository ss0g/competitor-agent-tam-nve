import { PrismaClient } from '@prisma/client';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { TrendAnalyzer } from './trends';
import {
  ReportData,
  ReportSection,
  ReportMetadata,
  ReportVersion,
  APIResponse,
  ValidationError
} from '@/types/reports';
import { z } from 'zod';

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

export class ReportGenerator {
  private prisma: PrismaClient;
  private bedrock: BedrockRuntimeClient;
  private trendAnalyzer: TrendAnalyzer;

  constructor() {
    this.prisma = new PrismaClient();
    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.trendAnalyzer = new TrendAnalyzer();
  }

  async generateReport(
    competitorId: string,
    timeframe: number = 30,
    options?: {
      userId?: string;
      changeLog?: string;
    }
  ): Promise<APIResponse<ReportData>> {
    try {
      // Validate inputs
      if (!competitorId) {
        return {
          error: 'Competitor ID is required',
          validationErrors: [{
            field: 'competitorId',
            message: 'Competitor ID is required'
          }]
        };
      }

      if (timeframe < 1 || timeframe > 90) {
        return {
          error: 'Invalid timeframe',
          validationErrors: [{
            field: 'timeframe',
            message: 'Timeframe must be between 1 and 90 days'
          }]
        };
      }

      // Get competitor info
      const competitor = await this.prisma.competitor.findUnique({
        where: { id: competitorId },
        include: {
          snapshots: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000),
              },
            },
            include: {
              analyses: {
                include: {
                  trends: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!competitor) {
        return {
          error: 'Competitor not found',
          validationErrors: [{
            field: 'competitorId',
            message: 'Competitor not found'
          }]
        };
      }

      // Get trend analysis
      const trends = await this.trendAnalyzer.analyzeTrends(competitorId, timeframe);

      // Prepare report data
      const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
      const endDate = new Date();
      const analysisCount = competitor.snapshots.reduce(
        (count, snapshot) => count + snapshot.analyses.length,
        0
      );
      const significantChanges = this.countSignificantChanges(competitor.snapshots);

      // Generate report sections
      const sections = await this.generateSections(competitor, trends, startDate, endDate);

      // Create report title and description
      const title = await this.generateTitle(competitor.name, startDate, endDate);
      const description = await this.generateDescription(
        competitor,
        analysisCount,
        significantChanges,
        trends
      );

      const reportData: ReportData = {
        title,
        description,
        sections,
        metadata: {
          competitor: {
            name: competitor.name,
            url: competitor.url,
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
      const validationResult = reportDataSchema.safeParse(reportData);
      if (!validationResult.success) {
        return {
          error: 'Invalid report data',
          validationErrors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        };
      }

      // Create or update report in database
      const report = await this.prisma.report.create({
        data: {
          competitorId,
          title,
          description,
          analyses: {
            connect: competitor.snapshots.flatMap(snapshot =>
              snapshot.analyses.map(analysis => ({ id: analysis.id }))
            ),
          },
        },
      });

      return { data: reportData };
    } catch (error) {
      console.error('Error generating report:', error);
      return {
        error: 'Failed to generate report',
        validationErrors: [{
          field: 'general',
          message: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  }

  async getReportVersions(reportId: string): Promise<ReportVersion[]> {
    const versions = await this.prisma.reportVersion.findMany({
      where: { reportId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        title: true,
        description: true,
        createdAt: true,
        changeLog: true,
      },
    });

    return versions;
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
      title: version.title,
      description: version.description || '',
      sections: content.sections,
      metadata: content.metadata,
      version: {
        number: version.versionNumber,
        createdAt: version.createdAt,
        changeLog: version.changeLog || undefined,
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
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      const response = await this.bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text.trim();
    } catch (error) {
      console.error('Description generation error:', error);
      return `Competitive analysis report for ${competitor.name} covering ${analysisCount} analyses with ${significantChanges} significant changes detected.`;
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
    // Implementation similar to generateDescription but with more detail
    return ''; // Placeholder
  }

  private async generateChangesSection(snapshots: Array<{
    analyses: Array<{
      keyChanges: string[];
      marketingChanges: string[];
      productChanges: string[];
    }>;
  }>): Promise<string> {
    // Analyze and summarize changes across snapshots
    return ''; // Placeholder
  }

  private async generateTrendsSection(
    trends: Array<{ trend: string; impact: number }>
  ): Promise<string> {
    // Format trends into a readable section
    return ''; // Placeholder
  }

  private async generateRecommendations(
    competitor: { name: string },
    trends: Array<{ trend: string; impact: number }>
  ): Promise<string> {
    // Generate strategic recommendations based on analysis
    return ''; // Placeholder
  }

  private countSignificantChanges(snapshots: Array<{
    analyses: Array<{
      keyChanges: string[];
      marketingChanges: string[];
      productChanges: string[];
    }>;
  }>): number {
    return snapshots.reduce((count: number, snapshot: {
      analyses: Array<{
        keyChanges: string[];
        marketingChanges: string[];
        productChanges: string[];
      }>;
    }) => {
      const hasSignificantChanges = snapshot.analyses.some(
        analysis => 
          analysis.keyChanges.length > 0 ||
          analysis.marketingChanges.some(
            change => change.toLowerCase().includes('major') || change.toLowerCase().includes('significant')
          ) ||
          analysis.productChanges.some(
            change => change.toLowerCase().includes('major') || change.toLowerCase().includes('significant')
          )
      );
      return count + (hasSignificantChanges ? 1 : 0);
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
} 