import { createApiClient, type ApiClient } from '@loomis/api-client';

import { memoryTokenStore } from '@/lib/auth/memory-token-store';

export function createWebApiClient(): ApiClient {
  return createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    tokenStore: memoryTokenStore,
    deviceInfo: () => ({
      deviceId: null,
      platform: 'web',
      fingerprint: typeof navigator !== 'undefined' ? navigator.userAgent : 'ssr',
    }),
    onSessionInvalidated: () => {
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    },
    getActiveTenantId: () => null,
  });
}
