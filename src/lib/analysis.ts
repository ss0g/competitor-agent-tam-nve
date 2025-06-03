import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ContentDiff } from './diff';

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

export class ContentAnalyzer {
  private bedrockClient: BedrockRuntimeClient;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
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
    competitorName: string
  ): Promise<ContentAnalysis> {
    const prompt = this.buildAnalysisPrompt(oldContent, newContent, diff, competitorName);
    const promptTokens = this.calculateTokenUsage(prompt);

    // Run both analyses in parallel
    const [primaryResult, secondaryResult] = await Promise.all([
      this.runClaudeAnalysis(prompt, promptTokens),
      this.runMistralAnalysis(prompt, promptTokens),
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

    return {
      primary: primaryResult.analysis,
      secondary: secondaryResult.analysis,
      confidence,
      usage,
    };
  }

  private async runClaudeAnalysis(
    prompt: string,
    promptTokens: number
  ): Promise<{ analysis: AnalysisInsight; outputTokens: number }> {
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
      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const analysis = this.parseAnalysisResponse(responseBody.content[0].text);
      const outputTokens = this.calculateTokenUsage(responseBody.content[0].text);
      return { analysis, outputTokens };
    } catch (error) {
      console.error('Claude analysis error:', error);
      throw new Error('Failed to get analysis from Claude via Bedrock');
    }
  }

  private async runMistralAnalysis(
    prompt: string,
    promptTokens: number
  ): Promise<{ analysis: AnalysisInsight; outputTokens: number }> {
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
      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const analysis = this.parseAnalysisResponse(responseBody.choices[0].message.content);
      const outputTokens = this.calculateTokenUsage(responseBody.choices[0].message.content);
      return { analysis, outputTokens };
    } catch (error) {
      console.error('Mistral analysis error:', error);
      throw new Error('Failed to get analysis from Mistral via Bedrock');
    }
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
    const set1 = new Set(list1.map(item => item.toLowerCase()));
    const set2 = new Set(list2.map(item => item.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
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
      .map(line => line.replace(/^[•\-\d.]+\s*/, '').trim());
  }
} 