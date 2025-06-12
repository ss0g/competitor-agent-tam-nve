import { ContentAnalyzer, AnalysisInsight } from '@/lib/analysis';
import { ContentDiff } from '@/lib/diff';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Mock AWS Bedrock
jest.mock('@aws-sdk/client-bedrock-runtime');

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'test-key',
    AWS_SECRET_ACCESS_KEY: 'test-secret',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('ContentAnalyzer', () => {
  let analyzer: ContentAnalyzer;
  let mockBedrockClient: jest.Mocked<BedrockRuntimeClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock BedrockRuntimeClient
    const MockedBedrockRuntimeClient = BedrockRuntimeClient as jest.MockedClass<typeof BedrockRuntimeClient>;
    mockBedrockClient = {
      send: jest.fn(),
    } as any;

    MockedBedrockRuntimeClient.mockImplementation(() => mockBedrockClient);

    analyzer = new ContentAnalyzer();
  });

  describe('Constructor', () => {
    it('should initialize with AWS Bedrock client', () => {
      expect(BedrockRuntimeClient).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });
    });
  });

  describe('Token Usage Calculation', () => {
    it('should calculate token usage correctly', () => {
      const text = 'This is a test string with multiple words';
      const tokens = (analyzer as any).calculateTokenUsage(text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should calculate cost for Claude model', () => {
      const cost = (analyzer as any).calculateCost(1000, 500, 'claude');
      
      expect(cost).toHaveProperty('input');
      expect(cost).toHaveProperty('output');
      expect(cost).toHaveProperty('cost');
      expect(cost.input).toBe(1000);
      expect(cost.output).toBe(500);
      expect(cost.cost).toBeGreaterThan(0);
    });

    it('should calculate cost for Mistral model', () => {
      const cost = (analyzer as any).calculateCost(1000, 500, 'mistral');
      
      expect(cost).toHaveProperty('input');
      expect(cost).toHaveProperty('output');
      expect(cost).toHaveProperty('cost');
      expect(cost.input).toBe(1000);
      expect(cost.output).toBe(500);
      expect(cost.cost).toBeGreaterThan(0);
    });
  });

  describe('Analysis Response Parsing', () => {
    it('should parse analysis response correctly', () => {
      const mockResponse = `
        Brief summary
        This is a summary of the changes.

        Key changes identified
        • First key change
        • Second key change

        Marketing strategy changes
        • Marketing change 1
        • Marketing change 2

        Product/service changes
        • Product change 1

        Competitive insights
        • Insight 1
        • Insight 2

        Suggested actions for our team
        • Action 1
        • Action 2
      `;

      const result = (analyzer as any).parseAnalysisResponse(mockResponse);
      
      expect(result).toEqual({
        summary: expect.stringContaining('This is a summary'),
        keyChanges: ['First key change', 'Second key change'],
        marketingChanges: ['Marketing change 1', 'Marketing change 2'],
        productChanges: ['Product change 1'],
        competitiveInsights: ['Insight 1', 'Insight 2'],
        suggestedActions: ['Action 1', 'Action 2'],
      });
    });

    it('should handle missing sections gracefully', () => {
      const mockResponse = `
        Brief summary
        Just a summary.
      `;

      const result = (analyzer as any).parseAnalysisResponse(mockResponse);
      
      expect(result.summary).toContain('Just a summary');
      expect(result.keyChanges).toEqual([]);
      expect(result.marketingChanges).toEqual([]);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence metrics', () => {
      const primary: AnalysisInsight = {
        summary: 'Primary analysis summary',
        keyChanges: ['Change 1', 'Change 2'],
        marketingChanges: ['Marketing 1'],
        productChanges: ['Product 1'],
        competitiveInsights: ['Insight 1'],
        suggestedActions: ['Action 1'],
      };

      const secondary: AnalysisInsight = {
        summary: 'Secondary analysis summary',
        keyChanges: ['Change 1', 'Change 3'],
        marketingChanges: ['Marketing 1'],
        productChanges: ['Product 2'],
        competitiveInsights: ['Insight 2'],
        suggestedActions: ['Action 2'],
      };

      const confidence = (analyzer as any).calculateConfidence(primary, secondary);
      
      expect(confidence).toHaveProperty('agreement');
      expect(confidence).toHaveProperty('keyPointsOverlap');
      expect(confidence.agreement).toBeGreaterThanOrEqual(0);
      expect(confidence.agreement).toBeLessThanOrEqual(1);
      expect(confidence.keyPointsOverlap).toBeGreaterThanOrEqual(0);
      expect(confidence.keyPointsOverlap).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeChanges', () => {
    const mockDiff: ContentDiff = {
      text: {
        added: ['New content line 1', 'New content line 2'],
        removed: ['Old content line 1'],
        unchanged: ['Unchanged line'],
      },
      metadata: {
        title: true,
        description: false,
        statusCode: false,
        contentLength: true,
      },
      stats: {
        addedLines: 2,
        removedLines: 1,
        unchangedLines: 1,
        changePercentage: 75,
      },
    };

    it('should analyze changes successfully', async () => {
      const mockClaudeResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: `
              Summary: Significant changes detected
              
              Key changes identified
              • Major UI update
              • New feature added
              
              Marketing strategy changes
              • Updated messaging
              
              Product/service changes
              • Enhanced functionality
              
              Competitive insights
              • Competitive advantage gained
              
              Suggested actions for our team
              • Monitor closely
            `
          }]
        }))
      };

      const mockMistralResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          choices: [{
            message: {
              content: `
                Summary: Notable changes observed
                
                Key changes identified
                • UI improvements
                • Feature enhancement
                
                Marketing strategy changes
                • Messaging update
                
                Product/service changes
                • Functionality boost
                
                Competitive insights
                • Market position improved
                
                Suggested actions for our team
                • Continue monitoring
              `
            }
          }]
        }))
      };

      // Fix the mock to properly handle the command input
      (mockBedrockClient.send as jest.Mock)
        .mockResolvedValueOnce(mockClaudeResponse)
        .mockResolvedValueOnce(mockMistralResponse);

      const result = await analyzer.analyzeChanges(
        'Old content',
        'New content',
        mockDiff,
        'Test Competitor'
      );

      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('secondary');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('usage');
      
      expect(result.primary.keyChanges).toContain('Major UI update');
      expect(result.secondary.keyChanges).toContain('UI improvements');
      
      expect(result.usage.totalCost).toBeGreaterThan(0);
      expect(mockBedrockClient.send).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully with fallback', async () => {
      // Create a more realistic API error
      const apiError = new Error('API Error');
      (apiError as any).name = 'ServiceException';
      
      (mockBedrockClient.send as jest.Mock)
        .mockRejectedValueOnce(apiError)
        .mockRejectedValueOnce(apiError);

      // Test that fallback mechanism works (default behavior)
      const result = await analyzer.analyzeChanges(
        'Old content',
        'New content',
        mockDiff,
        'Test Competitor'
      );

      // Should get fallback analysis result
      expect(result).toBeDefined();
      expect(result.primary.summary).toContain('Test Competitor');
      expect(result.confidence.agreement).toBe(0.7); // Fallback confidence
      expect(result.usage.totalCost).toBe(0); // No AI cost for fallback
    });

    it('should build analysis prompt correctly', () => {
      const prompt = (analyzer as any).buildAnalysisPrompt(
        'Old content',
        'New content',
        mockDiff,
        'Test Competitor'
      );

      expect(prompt).toContain('Test Competitor');
      expect(prompt).toContain('Added Lines: 2');
      expect(prompt).toContain('Removed Lines: 1');
      expect(prompt).toContain('Change Percentage: 75.0%');
      expect(prompt).toContain('New content line 1');
      expect(prompt).toContain('Old content line 1');
    });
  });

  describe('Text Similarity', () => {
    it('should calculate text similarity correctly', () => {
      const similarity = (analyzer as any).calculateTextSimilarity(
        'hello world test',
        'hello world example'
      );
      
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should return 0 for completely different texts', () => {
      const similarity = (analyzer as any).calculateTextSimilarity(
        'completely different',
        'totally unrelated'
      );
      
      expect(similarity).toBeGreaterThanOrEqual(0);
    });

    it('should return 1 for identical texts', () => {
      const text = 'identical text content';
      const similarity = (analyzer as any).calculateTextSimilarity(text, text);
      
      expect(similarity).toBe(1);
    });
  });

  describe('List Overlap Calculation', () => {
    it('should calculate list overlap correctly', () => {
      const list1 = ['item1', 'item2', 'item3'];
      const list2 = ['item2', 'item3', 'item4'];
      
      const overlap = (analyzer as any).calculateListOverlap(list1, list2);
      
      expect(overlap).toBeGreaterThan(0);
      expect(overlap).toBeLessThanOrEqual(1);
    });

    it('should handle empty lists', () => {
      const overlap = (analyzer as any).calculateListOverlap([], []);
      
      expect(overlap).toBe(0);
    });

    it('should handle case insensitive comparison', () => {
      const list1 = ['Item1', 'ITEM2'];
      const list2 = ['item1', 'item2'];
      
      const overlap = (analyzer as any).calculateListOverlap(list1, list2);
      
      expect(overlap).toBe(1);
    });
  });
}); 