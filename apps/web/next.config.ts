import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const uiWebNodeModules = path.join(appDir, '../../packages/ui-web/node_modules');

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
    // pnpm isolates ui-web deps; allow Next to resolve @radix-ui/* from ui-web's node_modules.
    config.resolve.modules = [...(config.resolve.modules ?? []), uiWebNodeModules];
    return config;
  },
};

export default nextConfig;
