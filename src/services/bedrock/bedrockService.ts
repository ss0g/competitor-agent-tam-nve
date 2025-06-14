// Re-export from the correct path to handle incorrect imports
// This file exists to support tests that import from the wrong path
export { BedrockService } from './bedrock.service';
export * from './types'; 