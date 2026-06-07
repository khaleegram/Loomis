import {
  errorEnvelope,
  refreshTokenResponse,
  type RefreshTokenResponse,
} from '@loomis/contracts';
import type { ApiClientConfig } from './types.js';
import { LoomisClientError } from './errors.js';
import { generateRequestId } from './interceptors.js';

const REFRESH_PATH = '/auth/refresh';

export interface RefreshManager {
  /** Single-flight refresh; returns the new access token. */
  refreshAccessToken(): Promise<string>;
}

/**
 * Token refresh with single-flight lock (Frontend Architecture §3.4).
 * Concurrent 401s share one in-flight refresh; token family rotation
 * updates both access and refresh tokens in the injected store.
 */
export function createRefreshManager(config: ApiClientConfig): RefreshManager {
  const fetchFn = config.fetchFn ?? fetch;
  let inFlightRefresh: Promise<string> | null = null;

  async function performRefresh(): Promise<string> {
    const refreshToken = await config.tokenStore.getRefreshToken();
    const platform = config.deviceInfo().platform;

    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Request-Id': generateRequestId(),
    });

    const init: RequestInit = {
      method: 'POST',
      headers,
      credentials: platform === 'web' ? 'include' : 'same-origin',
    };

    if (refreshToken) {
      init.body = JSON.stringify({ refreshToken });
    }

    const url = `${config.baseUrl.replace(/\/$/, '')}${REFRESH_PATH}`;
    const response = await fetchFn(url, init);

    if (!response.ok) {
      const error = await parseRefreshError(response);
      config.onSessionInvalidated();
      throw error;
    }

    const json: unknown = await response.json();
    const envelope = refreshTokenResponse.safeParse(
      (json as { status?: string; data?: unknown }).status === 'success'
        ? (json as { data: unknown }).data
        : json,
    );

    if (!envelope.success) {
      config.onSessionInvalidated();
      throw new LoomisClientError(500, {
        code: 'INTERNAL_ERROR',
        message: 'Refresh response was malformed',
        requestId: response.headers.get('x-request-id') ?? generateRequestId(),
      });
    }

    await applyRotatedTokens(config, envelope.data);
    return envelope.data.accessToken;
  }

  return {
    refreshAccessToken(): Promise<string> {
      if (!inFlightRefresh) {
        inFlightRefresh = performRefresh().finally(() => {
          inFlightRefresh = null;
        });
      }
      return inFlightRefresh;
    },
  };
}

async function applyRotatedTokens(
  config: ApiClientConfig,
  tokens: RefreshTokenResponse,
): Promise<void> {
  config.tokenStore.setAccessToken(tokens.accessToken);
  await config.tokenStore.setRefreshToken(tokens.refreshToken);
}

async function parseRefreshError(response: Response): Promise<LoomisClientError> {
  try {
    const json: unknown = await response.json();
    const parsed = errorEnvelope.safeParse(json);
    if (parsed.success) {
      return new LoomisClientError(response.status, parsed.data.error);
    }
  } catch {
    // fall through to generic error
  }

  return new LoomisClientError(response.status, {
    code: 'IDENTITY_SESSION_INVALIDATED',
    message: 'Session refresh failed',
    requestId: response.headers.get('x-request-id') ?? generateRequestId(),
  });
}
