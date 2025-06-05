import { Prisma } from '@prisma/client';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import prisma from '@/lib/prisma';
import { logger, trackError, trackPerformance } from './logger';

export interface TrendAnalysis {
  category: string;
  trend: string;
  impact: number;
  confidence: number;
}

export interface TrendAnalysisOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackToSimpleAnalysis?: boolean;
}

export class TrendAnalyzer {
  private prisma = prisma;
  private bedrock: BedrockRuntimeClient;
  private readonly defaultOptions: TrendAnalysisOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackToSimpleAnalysis: true,
  };

  constructor() {
    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.AWS_SESSION_TOKEN,
      },
    });
  }

  async analyzeTrends(
    competitorId: string, 
    timeframe: number = 30,
    options: TrendAnalysisOptions = {}
  ): Promise<TrendAnalysis[]> {
    const opts = { ...this.defaultOptions, ...options };
    const context = { competitorId, timeframe };

    logger.info('Starting trend analysis', context);

    try {
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
        logger.warn('Insufficient data for trend analysis', { 
          ...context, 
          analysesCount: analyses.length 
        });
        return []; // Not enough data for trend analysis
      }

      // Prepare historical data for AI analysis
      const historicalData = this.prepareHistoricalData(analyses);

      // Try AI-powered trend analysis with retry logic
      try {
        const trends = await this.identifyTrendsWithRetry(historicalData, opts);
        
        // Store the trends
        await this.storeTrends(trends, analyses[analyses.length - 1].id);
        
        logger.info('AI-powered trend analysis completed successfully', {
          ...context,
          trendsFound: trends.length
        });

        return trends;
      } catch (aiError) {
        logger.warn('AI-powered trend analysis failed, attempting fallback', {
          ...context,
          error: aiError instanceof Error ? aiError.message : 'Unknown error'
        });

        if (opts.fallbackToSimpleAnalysis) {
          return this.fallbackTrendAnalysis(analyses, context);
        } else {
          throw aiError;
        }
      }
    } catch (error) {
      trackError(error as Error, 'trend_analysis', context);
      throw error;
    }
  }

  private async identifyTrendsWithRetry(
    historicalData: string, 
    options: TrendAnalysisOptions
  ): Promise<TrendAnalysis[]> {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Trend analysis attempt ${attempt}/${maxRetries}`);
        return await this.identifyTrends(historicalData);
      } catch (error) {
        lastError = error as Error;
        
        const isRetryable = this.isRetryableError(error as Error);
        const isLastAttempt = attempt === maxRetries;

        logger.warn(`Trend analysis attempt ${attempt} failed`, {
          attempt,
          maxRetries,
          isRetryable,
          isLastAttempt,
          errorName: lastError.name,
          errorMessage: lastError.message
        });

        if (isLastAttempt || !isRetryable) {
          throw this.enhanceError(lastError);
        }

        // Wait before retrying
        await this.delay(retryDelay * attempt); // Exponential backoff
      }
    }

    throw this.enhanceError(lastError!);
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ThrottlingException',
      'ServiceUnavailableException',
      'InternalServerError',
      'TooManyRequestsException',
      'NetworkError',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];

    return retryableErrors.some(retryableError => 
      error.name.includes(retryableError) || 
      error.message.includes(retryableError)
    );
  }

  private enhanceError(error: Error): Error {
    if (error.name === 'ExpiredTokenException') {
      const enhancedError = new Error(
        'AWS credentials have expired. Please refresh your AWS session token or configure proper credentials.'
      );
      enhancedError.name = 'CredentialsExpiredError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.name === 'UnauthorizedOperation' || error.message.includes('credentials')) {
      const enhancedError = new Error(
        'AWS credentials are invalid or missing. Please check your AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN environment variables.'
      );
      enhancedError.name = 'CredentialsInvalidError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.message.includes('region')) {
      const enhancedError = new Error(
        `AWS region is invalid or Bedrock is not available in the specified region (${process.env.AWS_REGION}). Please check your AWS_REGION environment variable.`
      );
      enhancedError.name = 'InvalidRegionError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.name.includes('Throttling') || error.name.includes('TooManyRequests')) {
      const enhancedError = new Error(
        'AWS Bedrock rate limit exceeded. The service is temporarily unavailable due to high usage.'
      );
      enhancedError.name = 'RateLimitError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    return error;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fallbackTrendAnalysis(
    analyses: any[], 
    context: any
  ): Promise<TrendAnalysis[]> {
    logger.info('Using fallback trend analysis', context);

    try {
      const trends: TrendAnalysis[] = [];
      
      // Simple rule-based trend analysis
      const analysisData = analyses.map(a => {
        const data = a.data as any;
        return data?.primary || data;
      });

      // Analyze key changes over time
      const allKeyChanges = analysisData.flatMap(data => data?.keyChanges || []);
      const allProductChanges = analysisData.flatMap(data => data?.productChanges || []);
      const allMarketingChanges = analysisData.flatMap(data => data?.marketingChanges || []);

      if (allKeyChanges.length > 0) {
        trends.push({
          category: 'product',
          trend: `Detected ${allKeyChanges.length} key changes over the analysis period`,
          impact: Math.min(allKeyChanges.length * 0.2, 1.0),
          confidence: 0.7
        });
      }

      if (allProductChanges.length > 0) {
        trends.push({
          category: 'product',
          trend: `Product updates and feature additions observed`,
          impact: Math.min(allProductChanges.length * 0.3, 1.0),
          confidence: 0.6
        });
      }

      if (allMarketingChanges.length > 0) {
        trends.push({
          category: 'marketing',
          trend: `Marketing strategy adjustments identified`,
          impact: Math.min(allMarketingChanges.length * 0.25, 1.0),
          confidence: 0.6
        });
      }

      // If no specific changes, add a stability trend
      if (trends.length === 0) {
        trends.push({
          category: 'competitive',
          trend: 'Competitor maintains stable market position with minimal changes',
          impact: 0.0,
          confidence: 0.5
        });
      }

      // Store the fallback trends
      if (analyses.length > 0) {
        await this.storeTrends(trends, analyses[analyses.length - 1].id);
      }

      logger.info('Fallback trend analysis completed', {
        ...context,
        trendsGenerated: trends.length,
        method: 'rule-based'
      });

      return trends;
    } catch (error) {
      logger.error('Fallback trend analysis failed', error as Error, context);
      
      // Return a minimal trend if even fallback fails
      return [{
        category: 'competitive',
        trend: 'Unable to analyze trends due to system limitations',
        impact: 0.0,
        confidence: 0.1
      }];
    }
  }

  private prepareHistoricalData(analyses: any[]): string {
    return analyses.map(analysis => {
      // Extract data from the JSON field
      const analysisData = analysis.data as any;
      const primaryData = analysisData?.primary || analysisData; // Handle both structures
      
      return `
Date: ${analysis.createdAt.toISOString()}

Summary: ${primaryData?.summary || 'No summary available'}

Key Changes:
${Array.isArray(primaryData?.keyChanges) ? primaryData.keyChanges.join('\n') : 'No key changes available'}

Marketing Changes:
${Array.isArray(primaryData?.marketingChanges) ? primaryData.marketingChanges.join('\n') : 'No marketing changes available'}

Product Changes:
${Array.isArray(primaryData?.productChanges) ? primaryData.productChanges.join('\n') : 'No product changes available'}

Competitive Insights:
${Array.isArray(primaryData?.competitiveInsights) ? primaryData.competitiveInsights.join('\n') : 'No competitive insights available'}

---
`;
    }).join('\n');
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
        anthropic_version: 'bedrock-2023-05-31',
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

    const response = await this.bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return this.parseTrendResponse(responseBody.content[0].text);
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
  ): Promise<any[]> {
    const storedTrends = await Promise.all(
      trends.map(trend =>
        this.prisma.analysisTrend.create({
          data: {
            analysisId,
            type: trend.category,
            value: trend.impact,
            metadata: {
              trend: trend.trend,
              confidence: trend.confidence,
              category: trend.category,
            },
          },
        })
      )
    );

    return storedTrends;
  }
} 