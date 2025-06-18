import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Your existing config...
  
  webpack: (config, { isServer }) => {
    // Fix for Handlebars webpack warning
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    
    // Handle .hbs files
    config.module.rules.push({
      test: /\.hbs$/,
      loader: 'handlebars-loader',
    });

    return config;
  },
};

export default nextConfig;
