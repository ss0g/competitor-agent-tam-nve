export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  id: string;
  type: 'message' | 'error';
  role: 'assistant';
  content: string;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
}

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  stopSequences?: string[];
}

export interface ClaudeOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

export interface ClaudeServiceInterface {
  sendMessage(message: string, options?: ClaudeOptions): Promise<ClaudeResponse>;
  sendMessages(messages: ClaudeMessage[], options?: ClaudeOptions): Promise<ClaudeResponse>;
} 