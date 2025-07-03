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

    const clientConfig: any = {
      region: this.config.region
    };

    // Only add credentials if they're properly configured
    if (this.config.credentials?.accessKeyId && this.config.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: this.config.credentials.accessKeyId,
        secretAccessKey: this.config.credentials.secretAccessKey,
        ...(this.config.credentials.sessionToken && { sessionToken: this.config.credentials.sessionToken })
      };
    }

    this.client = new BedrockRuntimeClient(clientConfig);
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
      const formattedRequest: BedrockRequest = {
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        top_k: this.config.topK,
        top_p: this.config.topP,
        stop_sequences: this.config.stopSequences,
        messages: request.messages as BedrockMessage[]
      };
      
      if (this.config.anthropicVersion) {
        formattedRequest.anthropic_version = this.config.anthropicVersion;
      }
      
      return formattedRequest;
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
      
      // Handle different response formats based on provider
      if (this.config.provider === 'anthropic') {
        // Claude response format: { content: [{ text: "...", type: "text" }], ... }
        if (response.content && Array.isArray(response.content) && response.content.length > 0) {
          return response.content[0]?.text || '';
        }
        // Fallback for old format
        if (response.completion) {
          return response.completion;
        }
        throw new Error('Invalid response format from Claude model');
      } else {
        // Mistral format
        return response.completion || '';
      }
    } catch (error) {
      console.error('Error generating completion:', error);
      throw error;
    }
  }
} 