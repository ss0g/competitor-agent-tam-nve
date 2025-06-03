import { ClaudeConfig } from './types';

export const defaultClaudeConfig: Omit<ClaudeConfig, 'apiKey'> = {
  model: 'claude-3-sonnet-20240229',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.9,
  topK: 40,
  stopSequences: [],
};

export function createClaudeConfig(apiKey: string, overrides?: Partial<ClaudeConfig>): ClaudeConfig {
  return {
    ...defaultClaudeConfig,
    apiKey,
    ...overrides,
  };
} 