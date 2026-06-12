import { role as roleSchema } from '@loomis/contracts';

import { SESSION_COOKIE, parseSession, serializeSession, type SessionInfo } from './session';

export { SESSION_COOKIE, parseSession, serializeSession };
export type { SessionInfo };

/**
 * Backend-for-Frontend (BFF) primitives — Frontend Architecture §7.3.
 *
 * The browser never sees the refresh token and never stores a JWT. These helpers
 * run ONLY in Next.js route handlers (server side). They:
 *   - proxy auth calls to the Fastify backend,
 *   - keep the refresh token in an httpOnly, Secure, SameSite=Strict cookie,
 *   - keep a minimal session descriptor (role + tenant) in a second httpOnly
 *     cookie so the edge middleware can gate route groups,
 *   - return the access token in the body for the client to hold in memory only.
 */

/** httpOnly cookie carrying the opaque refresh token. Scoped to the BFF auth routes. */
export const REFRESH_COOKIE = 'loomis_refresh';

/** Path restriction for the refresh cookie — only sent to refresh/logout routes. */
const REFRESH_COOKIE_PATH = '/api/auth';

export interface AuthenticatedBundle extends SessionInfo {
  accessToken: string;
  expiresAt: string;
  refreshToken: string;
  mustChangePassword?: boolean;
}

/** Cookie attributes shared by both session cookies (loomis-security). */
export interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: string;
  maxAge?: number;
}

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function refreshCookieOptions(maxAgeSeconds?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds } : {}),
  };
}

export function sessionCookieOptions(maxAgeSeconds?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict',
    path: '/',
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds } : {}),
  };
}

/** Server-only base URL of the Fastify backend (e.g. http://localhost:18080/api/v1). */
export function backendBaseUrl(): string {
  const url =
    process.env.LOOMIS_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:18080/api/v1';
  return url.replace(/\/$/, '');
}

/**
 * Decodes (does NOT verify) the role + tenant claims from an access token JWT.
 * Used solely to populate the UX-gating session cookie; the backend remains the
 * authoritative verifier of every request (§7.2).
 */
export function decodeSessionFromAccessToken(accessToken: string): SessionInfo | null {
  const parts = accessToken.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadPart = parts[1];
    if (!payloadPart) return null;
    const json = Buffer.from(payloadPart, 'base64url').toString('utf8');
    const claims = JSON.parse(json) as { role?: unknown; tenant_id?: unknown; display_name?: unknown };
    const parsedRole = roleSchema.safeParse(claims.role);
    if (!parsedRole.success) return null;
    const tenantId =
      typeof claims.tenant_id === 'string' ? claims.tenant_id : null;
    const displayName =
      typeof claims.display_name === 'string' && claims.display_name.length > 0
        ? claims.display_name
        : undefined;
    return { role: parsedRole.data, tenantId, ...(displayName ? { displayName } : {}) };
  } catch {
    return null;
  }
}

export interface BackendCallOptions {
  method?: string;
  body?: unknown;
  /** Forwarded Authorization header (Bearer access token) for protected backend routes. */
  authorization?: string | null;
  /** Forwarded refresh token, sent in the body for the backend refresh/logout routes. */
  refreshToken?: string | null;
  headers?: Record<string, string>;
}

/** Calls the Fastify backend and returns the raw Response (status + envelope intact). */
export async function callBackend(
  path: string,
  options: BackendCallOptions = {},
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  headers.set('X-Client-Platform', 'web');

  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }
  if (options.authorization) {
    headers.set('Authorization', options.authorization);
  }

  const url = `${backendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  return fetchFn(url, {
    method: options.method ?? 'POST',
    headers,
    ...(body !== undefined ? { body } : {}),
  });
}

/** Reads the `data` payload from a Loomis success envelope, or null on error. */
export async function readEnvelope<T>(response: Response): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; body: unknown }
> {
  const json: unknown = await response.json().catch(() => null);
  if (response.ok && json && (json as { status?: string }).status === 'success') {
    return { ok: true, data: (json as { data: T }).data };
  }
  return { ok: false, status: response.status, body: json };
}
