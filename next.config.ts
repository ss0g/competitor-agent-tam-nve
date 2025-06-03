import { NextConfig } from 'next';

const config: NextConfig = {
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable pages directory scanning to avoid conflicts
  pageExtensions: ['tsx', 'ts'],
};

export default config;
