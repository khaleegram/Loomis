import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClientConfig, TokenStore } from './types.js';
import { createApiClient } from './client.js';
import { LoomisClientError } from './errors.js';

function envelopeSuccess<T>(data: T, requestId = 'req-success') {
  return {
    status: 'success' as const,
    data,
    meta: {
      requestId,
      apiVersion: 'v1' as const,
      timestamp: new Date().toISOString(),
    },
  };
}

function envelopeError(
  code: 'IDENTITY_TOKEN_EXPIRED' | 'IDENTITY_SESSION_INVALIDATED',
  requestId = 'req-error',
) {
  return {
    status: 'error' as const,
    error: {
      code,
      message: code,
      requestId,
    },
    meta: {
      requestId,
      apiVersion: 'v1' as const,
      timestamp: new Date().toISOString(),
    },
  };
}

function createTokenStore(initialAccess: string | null = 'access-old'): TokenStore & {
  access: string | null;
  refresh: string | null;
} {
  const store: {
    access: string | null;
    refresh: string | null;
    getAccessToken: () => string | null;
    setAccessToken: (token: string | null) => void;
    getRefreshToken: () => Promise<string | null>;
    setRefreshToken: (token: string | null) => Promise<void>;
  } = {
    access: initialAccess,
    refresh: 'refresh-old',
    getAccessToken() {
      return store.access;
    },
    setAccessToken(token: string | null) {
      store.access = token;
    },
    async getRefreshToken() {
      return store.refresh;
    },
    async setRefreshToken(token: string | null) {
      store.refresh = token;
    },
  };
  return store;
}

function createConfig(
  fetchFn: typeof fetch,
  overrides: Partial<ApiClientConfig> = {},
): ApiClientConfig {
  const tokenStore = createTokenStore();
  return {
    baseUrl: 'https://api.test/api/v1',
    tokenStore,
    deviceInfo: () => ({
      deviceId: 'device-1',
      platform: 'android',
      fingerprint: 'fp-1',
    }),
    onSessionInvalidated: vi.fn(),
    getActiveTenantId: () => 'tenant-1',
    fetchFn,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createApiClient — single-flight refresh', () => {
  it('fires one refresh for concurrent 401 IDENTITY_TOKEN_EXPIRED and retries all callers', async () => {
    let refreshCalls = 0;
    let resourceCalls = 0;

    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return new Response(
          JSON.stringify(
            envelopeSuccess({
              accessToken: 'access-new',
              refreshToken: 'refresh-new',
              expiresAt: new Date().toISOString(),
            }),
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      resourceCalls += 1;
      if (resourceCalls <= 5) {
        return new Response(JSON.stringify(envelopeError('IDENTITY_TOKEN_EXPIRED')), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(envelopeSuccess({ ok: true })), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const config = createConfig(fetchFn);
    const client = createApiClient(config);

    const results = await Promise.all([
      client.get<{ ok: boolean }>('/students'),
      client.get<{ ok: boolean }>('/students'),
      client.get<{ ok: boolean }>('/students'),
      client.get<{ ok: boolean }>('/students'),
      client.get<{ ok: boolean }>('/students'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(results).toEqual([
      { ok: true },
      { ok: true },
      { ok: true },
      { ok: true },
      { ok: true },
    ]);
    expect(config.tokenStore.getAccessToken()).toBe('access-new');
    expect(await config.tokenStore.getRefreshToken()).toBe('refresh-new');
    expect(config.onSessionInvalidated).not.toHaveBeenCalled();
  });
});

describe('createApiClient — two 401 split', () => {
  it('IDENTITY_TOKEN_EXPIRED refreshes and retries without hard logout', async () => {
    let refreshCalled = false;

    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/auth/refresh')) {
        refreshCalled = true;
        return new Response(
          JSON.stringify(
            envelopeSuccess({
              accessToken: 'access-new',
              refreshToken: 'refresh-new',
              expiresAt: new Date().toISOString(),
            }),
          ),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (!refreshCalled) {
        return new Response(JSON.stringify(envelopeError('IDENTITY_TOKEN_EXPIRED')), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(envelopeSuccess({ value: 42 })), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const config = createConfig(fetchFn);
    const client = createApiClient(config);

    const data = await client.get<{ value: number }>('/me');
    expect(data).toEqual({ value: 42 });
    expect(refreshCalled).toBe(true);
    expect(config.onSessionInvalidated).not.toHaveBeenCalled();
  });

  it('IDENTITY_SESSION_INVALIDATED hard-logouts and never calls refresh', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify(envelopeError('IDENTITY_SESSION_INVALIDATED')), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch;

    const config = createConfig(fetchFn);
    const client = createApiClient(config);

    await expect(client.get('/me')).rejects.toMatchObject({
      code: 'IDENTITY_SESSION_INVALIDATED',
    });

    const mockedFetch = vi.mocked(fetchFn);
    const urls = mockedFetch.mock.calls.map(([input]) => String(input));
    expect(urls.some((url: string) => url.endsWith('/auth/refresh'))).toBe(false);
    expect(config.onSessionInvalidated).toHaveBeenCalledTimes(1);
  });
});
