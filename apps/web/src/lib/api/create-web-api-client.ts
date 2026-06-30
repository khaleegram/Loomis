import { createApiClient, type ApiClient } from '@loomis/api-client';

import { resolveApiBaseUrl } from '@/lib/api/resolve-api-base-url';
import { memoryTokenStore } from '@/lib/auth/memory-token-store';
import { getActiveTenantId } from '@/lib/tenant/active-tenant-store';
import { handleSessionInvalidated } from '@/lib/auth/auth-session-guard';

const BFF_REFRESH_PATH = '/api/auth/refresh';

function apiBaseUrl(): string {
  return resolveApiBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL,
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
      handleSessionInvalidated(() => {
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path !== '/change-password' && path !== '/login') {
            window.location.assign('/login');
          }
        }
      });
    },
    getActiveTenantId,
  });
}
