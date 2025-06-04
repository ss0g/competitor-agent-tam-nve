import { BedrockConfig } from "./types";

export const claudeConfig: BedrockConfig = {
  modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
  provider: "anthropic",
  region: process.env.AWS_REGION || "eu-west-1",
  maxTokens: 200,
  temperature: 1,
  topP: 0.999,
  topK: 250,
  stopSequences: [],
  anthropicVersion: "bedrock-2023-05-31",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || ""
  }
};

export const mistralConfig: BedrockConfig = {
  modelId: "mistral.mistral-large-2402-v1:0",
  provider: "mistral",
  region: process.env.AWS_REGION || "eu-west-1",
  maxTokens: 200,
  temperature: 1,
  topP: 0.999,
  topK: 250,
  stopSequences: [],
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN || ""
  }
};
