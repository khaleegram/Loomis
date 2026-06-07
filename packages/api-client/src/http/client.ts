import { errorEnvelope, type ApiResponse } from '@loomis/contracts';
import type { ApiClientConfig } from './types.js';
import { LoomisClientError } from './errors.js';
import { applyRequestInterceptors } from './interceptors.js';
import { createRefreshManager } from './refresh.js';

export interface HttpRequestOptions {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  idempotencyKey?: string;
  mfaToken?: string;
  /** Skip Authorization header (public routes). */
  skipAuth?: boolean;
}

export interface ApiClient {
  request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
  get<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<T>;
  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<T>;
  patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<T>;
  delete<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<T>;
}

interface InternalRequestOptions extends HttpRequestOptions {
  _retried?: boolean;
}

/**
 * Platform-agnostic typed HTTP client (Frontend Architecture §3).
 * Injects token store, tenant context, and fetch; handles refresh + retry.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  const fetchFn = config.fetchFn ?? fetch;
  const refreshManager = createRefreshManager(config);

  async function request<T>(path: string, options: InternalRequestOptions = {}): Promise<T> {
    const response = await executeFetch(path, options);

    if (response.status === 401 && !options._retried) {
      const error = await parseErrorResponse(response);

      if (error.isTokenExpired) {
        await refreshManager.refreshAccessToken();
        return request<T>(path, { ...options, _retried: true });
      }

      if (error.isSessionInvalidated) {
        config.onSessionInvalidated();
      }

      throw error;
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return parseSuccessResponse<T>(response);
  }

  async function executeFetch(path: string, options: HttpRequestOptions): Promise<Response> {
    const headers = new Headers(options.headers);

    applyRequestInterceptors(headers, {
      tokenStore: config.tokenStore,
      getActiveTenantId: config.getActiveTenantId,
      ...(options.idempotencyKey !== undefined ? { idempotencyKey: options.idempotencyKey } : {}),
      ...(options.mfaToken !== undefined ? { mfaToken: options.mfaToken } : {}),
      ...(options.skipAuth !== undefined ? { skipAuth: options.skipAuth } : {}),
    });

    if (options.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const platform = config.deviceInfo().platform;
    const url = `${config.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

    return fetchFn(url, {
      method: options.method ?? 'GET',
      headers,
      credentials: platform === 'web' ? 'include' : 'same-origin',
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  }

  return {
    request,
    get: <T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(
      path: string,
      body?: unknown,
      options?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ) => request<T>(path, { ...options, method: 'POST', body }),
    patch: <T>(
      path: string,
      body?: unknown,
      options?: Omit<HttpRequestOptions, 'method' | 'body'>,
    ) => request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
}

async function parseSuccessResponse<T>(response: Response): Promise<T> {
  const json: unknown = await response.json();
  const envelope = json as ApiResponse<T>;
  if (envelope.status === 'success' && envelope.data !== undefined) {
    return envelope.data;
  }

  throw new LoomisClientError(500, {
    code: 'INTERNAL_ERROR',
    message: 'Success response was malformed',
    requestId: response.headers.get('x-request-id') ?? 'unknown',
  });
}

async function parseErrorResponse(response: Response): Promise<LoomisClientError> {
  try {
    const json: unknown = await response.json();
    const parsed = errorEnvelope.safeParse(json);
    if (parsed.success) {
      return new LoomisClientError(response.status, parsed.data.error);
    }
  } catch {
    // fall through
  }

  return new LoomisClientError(response.status, {
    code: 'INTERNAL_ERROR',
    message: response.statusText || 'Request failed',
    requestId: response.headers.get('x-request-id') ?? 'unknown',
  });
}
