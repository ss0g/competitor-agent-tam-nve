export interface BedrockTextContent {
  type: 'text';
  text: string;
}

export interface BedrockImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export interface MistralImageContent {
  type: 'image';
  source: {
    type: 'url';
    url: string;
  };
}

export type BedrockMessageContent = BedrockTextContent | BedrockImageContent;
export type MistralMessageContent = BedrockTextContent | MistralImageContent;

export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: BedrockMessageContent[];
}

export interface MistralMessage {
  role: 'user' | 'assistant';
  content: MistralMessageContent[];
}

export interface BedrockRequest {
  anthropic_version?: string;
  max_tokens?: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  stop_sequences?: string[];
  messages: BedrockMessage[] | MistralMessage[];
}

export interface BedrockResponse {
  completion: string;
  stop_reason: string;
  stop_sequence?: string;
}

export interface BedrockCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export type ModelProvider = 'anthropic' | 'mistral';

export interface BedrockConfig {
  modelId: string;
  provider: ModelProvider;
  region: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
  stopSequences: string[];
  anthropicVersion?: string;
  credentials?: BedrockCredentials;
} 