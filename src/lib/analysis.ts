import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ContentDiff } from './diff';
import { logger, trackError, trackPerformance, trackBusinessEvent } from './logger';

export interface AnalysisInsight {
  summary: string;
  keyChanges: string[];
  marketingChanges: string[];
  productChanges: string[];
  competitiveInsights: string[];
  suggestedActions: string[];
}

export interface TokenUsage {
  input: number;
  output: number;
  cost: number;
}

export interface ModelUsage {
  claude: TokenUsage;
  mistral: TokenUsage;
  totalCost: number;
}

export interface ContentAnalysis {
  primary: AnalysisInsight;
  secondary: AnalysisInsight;
  confidence: {
    agreement: number;
    keyPointsOverlap: number;
  };
  usage: ModelUsage;
}

export interface AnalysisOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackToSimpleAnalysis?: boolean;
  timeout?: number;
}

export class ContentAnalyzer {
  private bedrockClient: BedrockRuntimeClient;
  private readonly defaultOptions: AnalysisOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackToSimpleAnalysis: true,
    timeout: 30000, // 30 seconds
  };

  constructor() {
    logger.info('Initializing ContentAnalyzer');
    
    try {
      this.bedrockClient = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          sessionToken: process.env.AWS_SESSION_TOKEN,
        },
      });
      
      logger.info('ContentAnalyzer initialized successfully', {
        region: process.env.AWS_REGION || 'us-east-1'
      });
    } catch (error) {
      logger.error('Failed to initialize ContentAnalyzer', error as Error);
      throw error;
    }
  }

  private calculateTokenUsage(text: string): number {
    // Simple approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private calculateCost(input: number, output: number, model: 'claude' | 'mistral'): TokenUsage {
    const inputCost = model === 'claude' ? 0.003 : 0.0006;
    const outputCost = model === 'claude' ? 0.015 : 0.0018;
    const cost = (input * inputCost) + (output * outputCost);
    
    return {
      input,
      output,
      cost,
    };
  }

  async analyzeChanges(
    oldContent: string,
    newContent: string,
    diff: ContentDiff,
    competitorName: string,
    options: AnalysisOptions = {}
  ): Promise<ContentAnalysis> {
    const opts = { ...this.defaultOptions, ...options };
    const context = {
      competitorName,
      oldContentLength: oldContent.length,
      newContentLength: newContent.length,
      diffChangeCount: diff.text.added.length + diff.text.removed.length
    };
    
    logger.info('Starting content analysis', context);
    
    return logger.timeOperation('content_analysis', async () => {
      try {
        const prompt = this.buildAnalysisPrompt(oldContent, newContent, diff, competitorName);
        const promptTokens = this.calculateTokenUsage(prompt);

        logger.debug('Analysis prompt generated', {
          ...context,
          promptLength: prompt.length,
          promptTokens
        });

        // Try AI-powered analysis with retry logic
        try {
          // Run both analyses in parallel with retries
          const [primaryResult, secondaryResult] = await Promise.all([
            this.runClaudeAnalysisWithRetry(prompt, promptTokens, opts),
            this.runMistralAnalysisWithRetry(prompt, promptTokens, opts),
          ]);

          // Calculate confidence metrics
          const confidence = this.calculateConfidence(primaryResult.analysis, secondaryResult.analysis);

          const claudeUsage = this.calculateCost(promptTokens, primaryResult.outputTokens, 'claude');
          const mistralUsage = this.calculateCost(promptTokens, secondaryResult.outputTokens, 'mistral');

          const usage: ModelUsage = {
            claude: claudeUsage,
            mistral: mistralUsage,
            totalCost: claudeUsage.cost + mistralUsage.cost,
          };

          const analysisResult = {
            primary: primaryResult.analysis,
            secondary: secondaryResult.analysis,
            confidence,
            usage,
          };

          logger.info('AI-powered content analysis completed successfully', {
            ...context,
            confidenceAgreement: confidence.agreement,
            totalCost: usage.totalCost,
            keyChangesCount: primaryResult.analysis.keyChanges.length
          });

          // Track business event for successful analysis
          trackBusinessEvent('analysis_completed', {
            competitorName,
            confidenceScore: confidence.agreement,
            totalCost: usage.totalCost,
            changesDetected: primaryResult.analysis.keyChanges.length,
            analysisMethod: 'ai'
          }, context);

          return analysisResult;
        } catch (aiError) {
          logger.warn('AI-powered analysis failed, attempting fallback', {
            ...context,
            error: aiError instanceof Error ? aiError.message : 'Unknown error'
          });

          if (opts.fallbackToSimpleAnalysis) {
            return this.fallbackAnalysis(oldContent, newContent, diff, competitorName, context);
          } else {
            throw this.enhanceAnalysisError(aiError as Error);
          }
        }
      } catch (error) {
        trackError(error as Error, 'content_analysis', context);
        throw error;
      }
    }, context);
  }

  private async runClaudeAnalysisWithRetry(
    prompt: string,
    promptTokens: number,
    options: AnalysisOptions
  ): Promise<{ analysis: AnalysisInsight; outputTokens: number }> {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Claude analysis attempt ${attempt}/${maxRetries}`);
        return await this.runClaudeAnalysis(prompt, promptTokens);
      } catch (error) {
        lastError = error as Error;
        
        const isRetryable = this.isRetryableError(error as Error);
        const isLastAttempt = attempt === maxRetries;

        logger.warn(`Claude analysis attempt ${attempt} failed`, {
          attempt,
          maxRetries,
          isRetryable,
          isLastAttempt,
          errorName: lastError.name,
          errorMessage: lastError.message
        });

        if (isLastAttempt || !isRetryable) {
          throw this.enhanceAnalysisError(lastError);
        }

        // Wait before retrying with exponential backoff
        await this.delay(retryDelay * attempt);
      }
    }

    throw this.enhanceAnalysisError(lastError!);
  }

  private async runMistralAnalysisWithRetry(
    prompt: string,
    promptTokens: number,
    options: AnalysisOptions
  ): Promise<{ analysis: AnalysisInsight; outputTokens: number }> {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Mistral analysis attempt ${attempt}/${maxRetries}`);
        return await this.runMistralAnalysis(prompt, promptTokens);
      } catch (error) {
        lastError = error as Error;
        
        const isRetryable = this.isRetryableError(error as Error);
        const isLastAttempt = attempt === maxRetries;

        logger.warn(`Mistral analysis attempt ${attempt} failed`, {
          attempt,
          maxRetries,
          isRetryable,
          isLastAttempt,
          errorName: lastError.name,
          errorMessage: lastError.message
        });

        if (isLastAttempt || !isRetryable) {
          throw this.enhanceAnalysisError(lastError);
        }

        // Wait before retrying with exponential backoff
        await this.delay(retryDelay * attempt);
      }
    }

    throw this.enhanceAnalysisError(lastError!);
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

  private enhanceAnalysisError(error: Error): Error {
    if (error.name === 'ExpiredTokenException') {
      const enhancedError = new Error(
        'Content analysis failed: AWS credentials have expired. Please refresh your AWS session token.'
      );
      enhancedError.name = 'AnalysisCredentialsExpiredError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.name === 'UnauthorizedOperation' || error.message.includes('credentials')) {
      const enhancedError = new Error(
        'Content analysis failed: AWS credentials are invalid. Please check your AWS configuration.'
      );
      enhancedError.name = 'AnalysisCredentialsInvalidError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.message.includes('region')) {
      const enhancedError = new Error(
        `Content analysis failed: AWS Bedrock is not available in region ${process.env.AWS_REGION}.`
      );
      enhancedError.name = 'AnalysisInvalidRegionError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    if (error.name.includes('Throttling') || error.name.includes('TooManyRequests')) {
      const enhancedError = new Error(
        'Content analysis failed: AWS Bedrock rate limit exceeded. Please try again later.'
      );
      enhancedError.name = 'AnalysisRateLimitError';
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    return error;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fallbackAnalysis(
    oldContent: string,
    newContent: string,
    diff: ContentDiff,
    competitorName: string,
    context: any
  ): Promise<ContentAnalysis> {
    logger.info('Using fallback content analysis', context);

    try {
      // Simple rule-based analysis
      const analysis: AnalysisInsight = {
        summary: `Analysis of ${competitorName}: ${diff.text.added.length} additions and ${diff.text.removed.length} removals detected.`,
        keyChanges: this.extractSimpleChanges(diff),
        marketingChanges: this.extractMarketingChanges(diff),
        productChanges: this.extractProductChanges(diff),
        competitiveInsights: [
          'Competitor is actively updating their content',
          'Changes suggest ongoing development efforts'
        ],
        suggestedActions: [
          'Monitor competitor changes regularly',
          'Analyze impact of their updates on market position'
        ]
      };

      // Use the same analysis for both primary and secondary
      const fallbackResult: ContentAnalysis = {
        primary: analysis,
        secondary: analysis,
        confidence: {
          agreement: 0.7, // Lower confidence for rule-based analysis
          keyPointsOverlap: 1.0 // Same analysis used for both
        },
        usage: {
          claude: { input: 0, output: 0, cost: 0 },
          mistral: { input: 0, output: 0, cost: 0 },
          totalCost: 0
        }
      };

      logger.info('Fallback content analysis completed', {
        ...context,
        method: 'rule-based',
        changesDetected: analysis.keyChanges.length
      });

      // Track business event for fallback analysis
      trackBusinessEvent('analysis_completed', {
        competitorName,
        confidenceScore: 0.7,
        totalCost: 0,
        changesDetected: analysis.keyChanges.length,
        analysisMethod: 'fallback'
      }, context);

      return fallbackResult;
    } catch (error) {
      logger.error('Fallback content analysis failed', error as Error, context);
      
      // Return minimal analysis if even fallback fails
      const minimalAnalysis: AnalysisInsight = {
        summary: `Unable to analyze ${competitorName} due to system limitations.`,
        keyChanges: ['Analysis unavailable'],
        marketingChanges: [],
        productChanges: [],
        competitiveInsights: ['Analysis system temporarily unavailable'],
        suggestedActions: ['Retry analysis later']
      };

      return {
        primary: minimalAnalysis,
        secondary: minimalAnalysis,
        confidence: { agreement: 0.1, keyPointsOverlap: 1.0 },
        usage: { claude: { input: 0, output: 0, cost: 0 }, mistral: { input: 0, output: 0, cost: 0 }, totalCost: 0 }
      };
    }
  }

  private extractSimpleChanges(diff: ContentDiff): string[] {
    const changes: string[] = [];
    
    if (diff.text.added.length > 0) {
      changes.push(`Added ${diff.text.added.length} new content sections`);
    }
    
    if (diff.text.removed.length > 0) {
      changes.push(`Removed ${diff.text.removed.length} content sections`);
    }
    
    return changes.length > 0 ? changes : ['No significant changes detected'];
  }

  private extractMarketingChanges(diff: ContentDiff): string[] {
    const marketingKeywords = ['price', 'offer', 'sale', 'discount', 'promotion', 'marketing', 'campaign'];
    const changes: string[] = [];
    
    const addedText = diff.text.added.join(' ').toLowerCase();
    const removedText = diff.text.removed.join(' ').toLowerCase();
    
    marketingKeywords.forEach(keyword => {
      if (addedText.includes(keyword)) {
        changes.push(`Marketing content added related to ${keyword}`);
      }
      if (removedText.includes(keyword)) {
        changes.push(`Marketing content removed related to ${keyword}`);
      }
    });
    
    return changes;
  }

  private extractProductChanges(diff: ContentDiff): string[] {
    const productKeywords = ['feature', 'product', 'service', 'functionality', 'update', 'version'];
    const changes: string[] = [];
    
    const addedText = diff.text.added.join(' ').toLowerCase();
    const removedText = diff.text.removed.join(' ').toLowerCase();
    
    productKeywords.forEach(keyword => {
      if (addedText.includes(keyword)) {
        changes.push(`Product content added related to ${keyword}`);
      }
      if (removedText.includes(keyword)) {
        changes.push(`Product content removed related to ${keyword}`);
      }
    });
    
    return changes;
  }

  private calculateConfidence(primary: AnalysisInsight, secondary: AnalysisInsight): {
    agreement: number;
    keyPointsOverlap: number;
  } {
    // Calculate agreement score based on key points overlap
    const allPrimaryPoints = [
      ...primary.keyChanges,
      ...primary.marketingChanges,
      ...primary.productChanges,
      ...primary.competitiveInsights,
    ];

    const allSecondaryPoints = [
      ...secondary.keyChanges,
      ...secondary.marketingChanges,
      ...secondary.productChanges,
      ...secondary.competitiveInsights,
    ];

    // Use cosine similarity or other text similarity metrics
    const agreement = this.calculateTextSimilarity(
      primary.summary,
      secondary.summary
    );

    // Calculate overlap in key points
    const keyPointsOverlap = this.calculateListOverlap(
      allPrimaryPoints,
      allSecondaryPoints
    );

    return {
      agreement,
      keyPointsOverlap,
    };
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple word overlap similarity for now
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private calculateListOverlap(list1: string[], list2: string[]): number {
    // Handle empty lists to avoid division by zero
    if (list1.length === 0 && list2.length === 0) {
      return 0;
    }
    
    const set1 = new Set(list1.map(item => item.toLowerCase()));
    const set2 = new Set(list2.map(item => item.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    // Avoid division by zero
    if (union.size === 0) {
      return 0;
    }
    
    return intersection.size / union.size;
  }

  private buildAnalysisPrompt(
    oldContent: string,
    newContent: string,
    diff: ContentDiff,
    competitorName: string
  ): string {
    return `
    Analyze the following changes to ${competitorName}'s website:

    Change Statistics:
    - Added Lines: ${diff.stats.addedLines}
    - Removed Lines: ${diff.stats.removedLines}
    - Change Percentage: ${diff.stats.changePercentage.toFixed(1)}%

    Metadata Changes:
    ${Object.entries(diff.metadata)
      .filter(([_, changed]) => changed)
      .map(([field]) => `- ${field} changed`)
      .join('\n')}

    Content Removed:
    ${diff.text.removed.join('\n')}

    Content Added:
    ${diff.text.added.join('\n')}

    Please analyze these changes and provide insights following the specified format.
    Focus on business implications rather than technical details.`;
  }

  private async runClaudeAnalysis(
    prompt: string,
    promptTokens: number
  ): Promise<{ analysis: AnalysisInsight; outputTokens: number }> {
    const context = { model: 'claude', promptTokens };
    
    return logger.timeOperation('claude_analysis', async () => {
      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: '2023-06-01',
          max_tokens: 1500,
          temperature: 0.7,
          system: `You are an expert competitive analyst. Analyze website changes and provide strategic insights.
          Focus on changes that matter for business strategy, product development, and marketing.
          Be specific and actionable in your analysis.
          
          Format your response in clear sections:
          1. Brief summary of changes
          2. Key changes identified (as a list)
          3. Marketing strategy changes (as a list)
          4. Product/service changes (as a list)
          5. Competitive insights (as a list)
          6. Suggested actions for our team (as a list)
          
          Each list item should start with a bullet point (•).`,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      try {
        logger.debug('Sending request to Claude via Bedrock', context);
        
        const response = await this.bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const analysis = this.parseAnalysisResponse(responseBody.content[0].text);
        const outputTokens = this.calculateTokenUsage(responseBody.content[0].text);
        
        logger.debug('Claude analysis completed', {
          ...context,
          outputTokens,
          responseLength: responseBody.content[0].text.length
        });
        
        return { analysis, outputTokens };
      } catch (error) {
        logger.error('Claude analysis failed', error as Error, context);
        throw new Error('Failed to get analysis from Claude via Bedrock');
      }
    }, context);
  }

  private async runMistralAnalysis(
    prompt: string,
    promptTokens: number
  ): Promise<{ analysis: AnalysisInsight; outputTokens: number }> {
    const context = { model: 'mistral', promptTokens };
    
    return logger.timeOperation('mistral_analysis', async () => {
      const command = new InvokeModelCommand({
        modelId: 'mistral.mixtral-8x7b-instruct-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          max_tokens: 1500,
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `You are an expert competitive analyst. Analyze website changes and provide strategic insights.
              Focus on changes that matter for business strategy, product development, and marketing.
              Be specific and actionable in your analysis.
              
              Format your response in clear sections:
              1. Brief summary of changes
              2. Key changes identified (as a list)
              3. Marketing strategy changes (as a list)
              4. Product/service changes (as a list)
              5. Competitive insights (as a list)
              6. Suggested actions for our team (as a list)
              
              Each list item should start with a bullet point (•).`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      try {
        logger.debug('Sending request to Mistral via Bedrock', context);
        
        const response = await this.bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const analysis = this.parseAnalysisResponse(responseBody.choices[0].message.content);
        const outputTokens = this.calculateTokenUsage(responseBody.choices[0].message.content);
        
        logger.debug('Mistral analysis completed', {
          ...context,
          outputTokens,
          responseLength: responseBody.choices[0].message.content.length
        });
        
        return { analysis, outputTokens };
      } catch (error) {
        logger.error('Mistral analysis failed', error as Error, context);
        throw new Error('Failed to get analysis from Mistral via Bedrock');
      }
    }, context);
  }

  private parseAnalysisResponse(content: string): AnalysisInsight {
    const sections = content.split('\n\n');
    
    return {
      summary: this.extractSection(sections, 'summary', 1),
      keyChanges: this.extractListItems(sections, 'key changes'),
      marketingChanges: this.extractListItems(sections, 'marketing'),
      productChanges: this.extractListItems(sections, 'product'),
      competitiveInsights: this.extractListItems(sections, 'competitive'),
      suggestedActions: this.extractListItems(sections, 'suggested actions'),
    };
  }

  private extractSection(sections: string[], keyword: string, defaultIndex: number): string {
    const section = sections.find(s => 
      s.toLowerCase().includes(keyword.toLowerCase())
    ) || sections[defaultIndex];
    
    return section.split('\n').slice(1).join('\n').trim();
  }

  private extractListItems(sections: string[], keyword: string): string[] {
    const section = sections.find(s => 
      s.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!section) return [];

    return section
      .split('\n')
      .slice(1) // Remove the header
      .filter(line => line.trim())
      .map(line => line.replace(/^[•\-\*\d+\.)\s]+/, '').trim()) // Remove bullet points, dashes, asterisks, numbers
      .filter(line => line.length > 0); // Remove empty lines after cleaning
  }
} 