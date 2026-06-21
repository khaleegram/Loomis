import type { ConfigContext, ExpoConfig } from 'expo/config';
import fs from 'node:fs';
import path from 'node:path';

function readRootEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const envPath = path.resolve(__dirname, '../../.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key !== name) continue;
      const value = trimmed.slice(eq + 1).trim();
      return value.replace(/^["']|["']$/g, '');
    }
  } catch {
    // .env.local optional in CI
  }
  return undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Loomis',
  slug: 'loomis',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'loomis',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.loomis.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#3d3428',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    package: 'com.loomis.app',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#3d3428',
      },
    ],
    'expo-sqlite',
  ],
  experiments: {
    typedRoutes: true,
  },
  autolinking: {
    exclude: ['expo-notifications'],
  },
  extra: {
    apiUrl:
      readRootEnv('EXPO_PUBLIC_API_BASE_URL') ??
      (config.extra as { apiUrl?: string } | undefined)?.apiUrl ??
      'http://localhost:18080/api/v1',
    paystackPublicKey:
      readRootEnv('EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY') ?? readRootEnv('PAYSTACK_PUBLIC_KEY') ?? null,
  },
});
