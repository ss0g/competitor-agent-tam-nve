import { PrismaClient, Prisma } from '@prisma/client';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

export interface TrendAnalysis {
  category: string;
  trend: string;
  impact: number;
  confidence: number;
}

export class TrendAnalyzer {
  private prisma: PrismaClient;
  private bedrock: BedrockRuntimeClient;

  constructor() {
    this.prisma = new PrismaClient();
    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async analyzeTrends(competitorId: string, timeframe: number = 30): Promise<TrendAnalysis[]> {
    // Get historical analyses for the competitor
    const analyses = await this.prisma.analysis.findMany({
      where: {
        snapshot: {
          competitorId,
        },
        createdAt: {
          gte: new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000), // last n days
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        trends: true,
      },
    });

    if (analyses.length < 2) {
      return []; // Not enough data for trend analysis
    }

    // Prepare historical data for AI analysis
    const historicalData = this.prepareHistoricalData(analyses);

    // Use AI to identify trends
    const trends = await this.identifyTrends(historicalData);

    // Store the trends
    await this.storeTrends(trends, analyses[analyses.length - 1].id);

    return trends;
  }

  private prepareHistoricalData(analyses: Prisma.AnalysisGetPayload<{ include: { trends: true } }>[]): string {
    return analyses.map(analysis => `
Date: ${analysis.createdAt.toISOString()}

Summary: ${analysis.summary}

Key Changes:
${analysis.keyChanges.join('\n')}

Marketing Changes:
${analysis.marketingChanges.join('\n')}

Product Changes:
${analysis.productChanges.join('\n')}

Competitive Insights:
${analysis.competitiveInsights.join('\n')}

---
`).join('\n');
  }

  private async identifyTrends(historicalData: string): Promise<TrendAnalysis[]> {
    const prompt = `
Analyze the following historical competitor analysis data and identify key trends.
For each trend, provide:
1. Category (product, marketing, or competitive)
2. Trend description
3. Impact score (-1 to 1, where -1 is highly negative, 1 is highly positive)
4. Confidence score (0 to 1)

Format each trend as:
Category: [category]
Trend: [description]
Impact: [score]
Confidence: [score]

Historical Data:
${historicalData}
`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: '2023-06-01',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    try {
      const response = await this.bedrock.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return this.parseTrendResponse(responseBody.content[0].text);
    } catch (error) {
      console.error('Trend analysis error:', error);
      throw new Error('Failed to analyze trends');
    }
  }

  private parseTrendResponse(response: string): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const trendBlocks = response.split('\n\n');

    for (const block of trendBlocks) {
      const lines = block.split('\n');
      const trend: Partial<TrendAnalysis> = {};

      for (const line of lines) {
        const [key, value] = line.split(': ');
        switch (key.toLowerCase()) {
          case 'category':
            trend.category = value.trim();
            break;
          case 'trend':
            trend.trend = value.trim();
            break;
          case 'impact':
            trend.impact = parseFloat(value);
            break;
          case 'confidence':
            trend.confidence = parseFloat(value);
            break;
        }
      }

      if (
        trend.category &&
        trend.trend &&
        typeof trend.impact === 'number' &&
        typeof trend.confidence === 'number'
      ) {
        trends.push(trend as TrendAnalysis);
      }
    }

    return trends;
  }

  private async storeTrends(
    trends: TrendAnalysis[],
    analysisId: string
  ): Promise<Prisma.AnalysisTrendGetPayload<{}>[]> {
    const storedTrends = await Promise.all(
      trends.map(trend =>
        this.prisma.analysisTrend.create({
          data: {
            analysisId,
            category: trend.category,
            trend: trend.trend,
            impact: trend.impact,
            confidence: trend.confidence,
          },
        })
      )
    );

    return storedTrends;
  }
} 