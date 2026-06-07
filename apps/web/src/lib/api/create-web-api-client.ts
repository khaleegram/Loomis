import { createApiClient, type ApiClient } from '@loomis/api-client';

import { memoryTokenStore } from '@/lib/auth/memory-token-store';

const BFF_REFRESH_PATH = '/api/auth/refresh';

function apiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:18080/api/v1'
  );
}

/**
 * Web fetch wrapper: token refresh goes through the BFF (httpOnly cookie) and
 * the BFF response is normalised to the shape the shared api-client expects.
 */
function webFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isBackendRefresh =
    init?.method === 'POST' && url.includes('/auth/refresh') && !url.includes('/api/auth/refresh');

  if (isBackendRefresh && typeof window !== 'undefined') {
    return fetch(BFF_REFRESH_PATH, {
      ...init,
      credentials: 'same-origin',
    }).then(async (res) => {
      if (!res.ok) return res;
      const json: unknown = await res.clone().json().catch(() => null);
      const body = json as { outcome?: string; accessToken?: string; expiresAt?: string } | null;
      if (body?.outcome === 'authenticated' && body.accessToken && body.expiresAt) {
        memoryTokenStore.setAccessToken(body.accessToken);
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              accessToken: body.accessToken,
              refreshToken: 'httpOnly',
              expiresAt: body.expiresAt,
            },
            meta: {
              requestId: 'bff',
              apiVersion: 'v1',
              timestamp: new Date().toISOString(),
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return res;
    });
  }

  return fetch(input, init);
}

export function createWebApiClient(): ApiClient {
  return createApiClient({
    baseUrl: apiBaseUrl(),
    tokenStore: memoryTokenStore,
    fetchFn: typeof window !== 'undefined' ? webFetch : undefined,
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
