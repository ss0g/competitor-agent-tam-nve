import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockConfig, BedrockMessage, BedrockRequest, BedrockResponse, ModelProvider, MistralMessage } from './types';
import { claudeConfig, mistralConfig } from './bedrock.config';

export class BedrockService {
  private client: BedrockRuntimeClient;
  private config: BedrockConfig;

  constructor(config: Partial<BedrockConfig> = {}, provider: ModelProvider = 'anthropic') {
    this.config = {
      ...(provider === 'anthropic' ? claudeConfig : mistralConfig),
      ...config
    };

    this.client = new BedrockRuntimeClient({
      region: this.config.region,
      credentials: this.config.credentials
    });
  }

  private async invokeModel(request: BedrockRequest): Promise<BedrockResponse> {
    const command = new InvokeModelCommand({
      modelId: this.config.modelId,
      body: JSON.stringify(this.formatRequest(request)),
      contentType: 'application/json',
      accept: 'application/json',
    });

    try {
      const response = await this.client.send(command);
      const responseBody = new TextDecoder().decode(response.body);
      return JSON.parse(responseBody);
    } catch (error) {
      console.error('Error invoking Bedrock model:', error);
      throw error;
    }
  }

  private formatRequest(request: BedrockRequest): BedrockRequest {
    if (this.config.provider === 'anthropic') {
      return {
        anthropic_version: this.config.anthropicVersion,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_k: this.config.topK,
        top_p: this.config.topP,
        stop_sequences: this.config.stopSequences,
        messages: request.messages as BedrockMessage[]
      };
    } else {
      return {
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_k: this.config.topK,
        top_p: this.config.topP,
        stop_sequences: this.config.stopSequences,
        messages: (request.messages as BedrockMessage[]).map(msg => ({
          role: msg.role,
          content: msg.content.map(c => {
            if (c.type === 'image_url') {
              return {
                type: 'image',
                source: {
                  type: 'url',
                  url: c.image_url.url
                }
              };
            }
            return c;
          })
        })) as MistralMessage[]
      };
    }
  }

  private formatMessages(messages: BedrockMessage[]): string {
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'Human' : 'Assistant';
      const content = msg.content.map(c => {
        if (c.type === 'text') return c.text;
        if (c.type === 'image_url') return `[Image: ${c.image_url.url}]`;
        return '';
      }).join('\n');
      return `${role}: ${content}`;
    }).join('\n\n');
  }

  async generateCompletion(messages: BedrockMessage[]): Promise<string> {
    const request: BedrockRequest = {
      messages
    };

    try {
      const response = await this.invokeModel(request);
      return response.completion;
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }
} 