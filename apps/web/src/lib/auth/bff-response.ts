import { NextResponse } from 'next/server';

import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  refreshCookieOptions,
  sessionCookieOptions,
  serializeSession,
  type AuthenticatedBundle,
  type SessionInfo,
} from './bff';

/** Lifetime of the refresh + session cookies (defaults to the 30-day refresh TTL). */
function cookieMaxAge(): number {
  const raw = process.env.LOOMIS_REFRESH_COOKIE_MAX_AGE;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 24 * 30;
}

/** Writes the httpOnly refresh + session cookies onto a response. */
export function setAuthCookies(res: NextResponse, info: SessionInfo, refreshToken: string): void {
  const maxAge = cookieMaxAge();
  res.cookies.set(REFRESH_COOKIE, refreshToken, refreshCookieOptions(maxAge));
  res.cookies.set(SESSION_COOKIE, serializeSession(info), sessionCookieOptions(maxAge));
}

/** Expires both auth cookies (logout / session invalidation). */
export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(REFRESH_COOKIE, '', refreshCookieOptions(0));
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
}

/**
 * Successful authentication: refresh token → httpOnly cookie, access token →
 * response body (held in memory by the client, NEVER persisted). The raw
 * refresh token is stripped from the body so it can never reach client JS.
 */
export function respondAuthenticated(bundle: AuthenticatedBundle): NextResponse {
  const res = NextResponse.json({
    outcome: 'authenticated' as const,
    accessToken: bundle.accessToken,
    expiresAt: bundle.expiresAt,
    role: bundle.role,
    tenantId: bundle.tenantId,
    mustChangePassword: bundle.mustChangePassword ?? false,
    displayName: bundle.displayName ?? undefined,
  });
  setAuthCookies(
    res,
    {
      role: bundle.role,
      tenantId: bundle.tenantId,
      ...(bundle.mustChangePassword ? { mustChangePassword: true } : {}),
      ...(bundle.displayName ? { displayName: bundle.displayName } : {}),
    },
    bundle.refreshToken,
  );
  return res;
}

/** Forwards a backend error envelope to the client with its original status. */
export function forwardError(status: number, body: unknown): NextResponse {
  return NextResponse.json(body ?? { status: 'error' }, { status: status || 502 });
}

/** Generic BFF-level failure (backend unreachable, malformed response, etc.). */
export function bffError(code: string, message: string, status = 502): NextResponse {
  return NextResponse.json(
    { status: 'error', error: { code, message, requestId: 'bff' } },
    { status },
  );
}

interface BackendAuthData {
  outcome?: string;
  accessToken?: string;
  expiresAt?: string;
  role?: unknown;
  tenantId?: unknown;
  refreshToken?: string;
  mustChangePassword?: boolean;
  displayName?: string;
  [key: string]: unknown;
}

/**
 * Turns the Fastify backend auth response into the BFF response:
 *   - `authenticated`  → set httpOnly cookies, strip the refresh token from body
 *   - any other outcome (mfa_required, mfa_enrollment_required) → pass through
 *   - error            → forward status + envelope unchanged
 */
export async function handleAuthBackendResponse(response: Response): Promise<NextResponse> {
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok || !json || (json as { status?: string }).status !== 'success') {
    return forwardError(response.status, json);
  }

  const data = (json as { data: BackendAuthData }).data;

  if (data.outcome === 'authenticated') {
    if (
      typeof data.accessToken !== 'string' ||
      typeof data.expiresAt !== 'string' ||
      typeof data.refreshToken !== 'string'
    ) {
      return bffError('INTERNAL_ERROR', 'Malformed authenticated response from backend');
    }
    const session: SessionInfo = {
      role: data.role as AuthenticatedBundle['role'],
      tenantId: typeof data.tenantId === 'string' ? data.tenantId : null,
      ...(data.mustChangePassword === true ? { mustChangePassword: true } : {}),
      ...(typeof data.displayName === 'string' ? { displayName: data.displayName } : {}),
    };
    return respondAuthenticated({
      ...session,
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
      refreshToken: data.refreshToken,
    });
  }

  // mfa_required / mfa_enrollment_required and other non-token outcomes: no cookies.
  return NextResponse.json(data);
}
