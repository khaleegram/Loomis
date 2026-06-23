import type { NextRequest } from 'next/server';

import {
  REFRESH_COOKIE,
  callBackend,
  decodeSessionFromAccessToken,
} from '@/lib/auth/bff';
import {
  bffError,
  clearAuthCookies,
  forwardError,
  parseStaffExtensionRoles,
  respondAuthenticated,
} from '@/lib/auth/bff-response';

export const runtime = 'nodejs';

/**
 * POST /api/auth/refresh — exchange the httpOnly refresh cookie for a fresh
 * access token (Frontend Architecture §7.3). Implements rotation: the backend
 * returns a new refresh token which replaces the cookie. The access token is
 * returned in the body only (held in memory by the client).
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    // Session descriptor cookie can outlive the refresh token — clear both so
    // middleware stops treating the user as signed in.
    const res = forwardError(401, {
      status: 'error',
      error: {
        code: 'IDENTITY_SESSION_INVALIDATED',
        message: 'No active session',
        requestId: 'bff',
      },
    });
    clearAuthCookies(res);
    return res;
  }

  let response: Response;
  try {
    response = await callBackend('/auth/refresh', { method: 'POST', body: { refreshToken } });
  } catch {
    return bffError('UPSTREAM_UNAVAILABLE', 'Authentication service is unavailable', 503);
  }

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok || !json || (json as { status?: string }).status !== 'success') {
    // Refresh failed → the session is dead; purge cookies and tell the client.
    const res = forwardError(response.status || 401, json);
    clearAuthCookies(res);
    return res;
  }

  const data = (json as {
    data: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;
      mustChangePassword?: boolean;
      displayName?: string;
      role?: unknown;
      tenantId?: unknown;
      staffExtensionRoles?: unknown;
    };
  }).data;
  if (
    typeof data.accessToken !== 'string' ||
    typeof data.refreshToken !== 'string' ||
    typeof data.expiresAt !== 'string'
  ) {
    const res = bffError('INTERNAL_ERROR', 'Malformed refresh response from backend');
    clearAuthCookies(res);
    return res;
  }

  const session = decodeSessionFromAccessToken(data.accessToken);
  if (!session) {
    const res = bffError('INTERNAL_ERROR', 'Could not read session claims');
    clearAuthCookies(res);
    return res;
  }

  const staffExtensionRoles = parseStaffExtensionRoles(data.staffExtensionRoles);

  return respondAuthenticated({
    ...session,
    ...(staffExtensionRoles ? { staffExtensionRoles } : {}),
    accessToken: data.accessToken,
    expiresAt: data.expiresAt,
    refreshToken: data.refreshToken,
    ...(data.mustChangePassword === true ? { mustChangePassword: true } : {}),
    ...(typeof data.displayName === 'string' ? { displayName: data.displayName } : {}),
  });
}
