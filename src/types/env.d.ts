declare namespace NodeJS {
  interface ProcessEnv {
    ANTHROPIC_API_KEY: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
} 