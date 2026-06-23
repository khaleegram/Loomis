import type { FastifyReply, FastifyRequest } from 'fastify';
import { getEnv } from '../../../config/env.js';
import { sendSuccess } from '../../../shared/http.js';
import type { AuthenticatedBundle, LoginContext, RequestContext } from '../services/auth.service.js';
import type { DevicePlatform } from '../types.js';

const REFRESH_COOKIE = 'loomis_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function headerValue(req: FastifyRequest, name: string): string | undefined {
  const raw = req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.length > 0 ? value : undefined;
}

function resolvePlatform(req: FastifyRequest): DevicePlatform {
  const platform = headerValue(req, 'x-client-platform');
  if (platform === 'ios' || platform === 'android' || platform === 'web') return platform;
  return 'web';
}

/** Full login context — includes optional device fingerprint + persistent token. */
export function buildLoginContext(req: FastifyRequest): LoginContext {
  const ipAddress = req.ip;
  const userAgent = headerValue(req, 'user-agent');
  const deviceFingerprint = headerValue(req, 'x-device-fingerprint');
  const persistentToken = headerValue(req, 'x-device-token');
  return {
    platform: resolvePlatform(req),
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent !== undefined ? { userAgent } : {}),
    ...(deviceFingerprint !== undefined ? { deviceFingerprint } : {}),
    ...(persistentToken !== undefined ? { persistentToken } : {}),
  };
}

/** Lightweight context for post-login flows (no credentials/device secrets). */
export function buildRequestContext(req: FastifyRequest): RequestContext {
  const ipAddress = req.ip;
  const userAgent = headerValue(req, 'user-agent');
  return {
    platform: resolvePlatform(req),
    ...(ipAddress ? { ipAddress } : {}),
    ...(userAgent !== undefined ? { userAgent } : {}),
  };
}

export function getBearerToken(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : undefined;
}

/** Reads the refresh token from the request body or the httpOnly cookie. */
export function getRefreshToken(req: FastifyRequest, bodyToken?: string): string | undefined {
  if (bodyToken && bodyToken.length > 0) return bodyToken;
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === REFRESH_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function refreshCookie(value: string, expires: Date | null): string {
  const env = getEnv();
  const attrs = [
    `${REFRESH_COOKIE}=${encodeURIComponent(value)}`,
    `Path=${REFRESH_COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Strict',
  ];
  if (env.NODE_ENV === 'production') attrs.push('Secure');
  if (expires) {
    attrs.push(`Expires=${expires.toUTCString()}`);
  } else {
    attrs.push('Max-Age=0');
  }
  return attrs.join('; ');
}

export function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  reply.header('set-cookie', refreshCookie(token, expiresAt));
}

export function clearRefreshCookie(reply: FastifyReply): void {
  reply.header('set-cookie', refreshCookie('', null));
}

/**
 * Sends the `authenticated` login outcome: access token in the body (per the
 * loginResponse contract) and the refresh token in an httpOnly cookie. The raw
 * refresh + persistent tokens are also returned so native clients (which do not
 * use cookies) can persist them in the secure keychain.
 */
export function respondAuthenticated(reply: FastifyReply, bundle: AuthenticatedBundle): FastifyReply {
  setRefreshCookie(reply, bundle.refreshToken, bundle.refreshExpiresAt);
  return sendSuccess(reply, {
    outcome: 'authenticated' as const,
    accessToken: bundle.accessToken,
    expiresAt: bundle.accessExpiresAt.toISOString(),
    role: bundle.role,
    tenantId: bundle.tenantId,
    mustChangePassword: bundle.mustChangePassword ?? false,
    displayName: bundle.displayName ?? undefined,
    refreshToken: bundle.refreshToken,
    staffExtensionRoles: bundle.staffExtensionRoles ?? [],
    ...(bundle.persistentToken !== undefined
      ? {
          persistentToken: bundle.persistentToken,
          persistentTokenExpiresAt: bundle.persistentTokenExpiresAt?.toISOString(),
        }
      : {}),
  });
}
