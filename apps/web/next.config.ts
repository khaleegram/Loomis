import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@loomis/api-client',
    '@loomis/contracts',
    '@loomis/core',
    '@loomis/design-tokens',
    '@loomis/ui-web',
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
