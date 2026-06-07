import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  backendBaseUrl,
  callBackend,
  decodeSessionFromAccessToken,
  readEnvelope,
  refreshCookieOptions,
  sessionCookieOptions,
} from './bff';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(payload)}.signature`;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('decodeSessionFromAccessToken', () => {
  it('reads role + tenant from the JWT payload', () => {
    const token = fakeJwt({ role: 'principal', tenant_id: 'tenant-9' });
    expect(decodeSessionFromAccessToken(token)).toEqual({
      role: 'principal',
      tenantId: 'tenant-9',
    });
  });

  it('maps a missing tenant to null', () => {
    const token = fakeJwt({ role: 'platform_owner', tenant_id: null });
    expect(decodeSessionFromAccessToken(token)).toEqual({
      role: 'platform_owner',
      tenantId: null,
    });
  });

  it('returns null for a malformed token', () => {
    expect(decodeSessionFromAccessToken('not-a-jwt')).toBeNull();
    expect(decodeSessionFromAccessToken(fakeJwt({ role: 'nope' }))).toBeNull();
  });
});

describe('cookie options', () => {
  it('are httpOnly + SameSite=Strict and not Secure outside production', () => {
    const refresh = refreshCookieOptions(100);
    expect(refresh).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/api/auth', maxAge: 100 });
    expect(refresh.secure).toBe(false);
    expect(sessionCookieOptions().path).toBe('/');
  });

  it('are Secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(refreshCookieOptions().secure).toBe(true);
    expect(sessionCookieOptions().secure).toBe(true);
  });
});

describe('backendBaseUrl', () => {
  it('prefers the server-only var and strips a trailing slash', () => {
    vi.stubEnv('LOOMIS_API_BASE_URL', 'http://api.local/api/v1/');
    expect(backendBaseUrl()).toBe('http://api.local/api/v1');
  });
});

describe('callBackend', () => {
  it('builds the URL, JSON body and platform headers', async () => {
    vi.stubEnv('LOOMIS_API_BASE_URL', 'http://api.local/api/v1');
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    await callBackend('/auth/login', { method: 'POST', body: { email: 'a@b.co' } }, fetchFn);

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.local/api/v1/auth/login');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.co' }));
    const headers = new Headers(init.headers);
    expect(headers.get('X-Client-Platform')).toBe('web');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('forwards the Authorization header when given', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    await callBackend('/auth/logout', { authorization: 'Bearer abc' }, fetchFn);
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer abc');
  });
});

describe('readEnvelope', () => {
  it('extracts data from a success envelope', async () => {
    const res = new Response(
      JSON.stringify({ status: 'success', data: { ok: 1 } }),
      { status: 200 },
    );
    const result = await readEnvelope<{ ok: number }>(res);
    expect(result).toEqual({ ok: true, data: { ok: 1 } });
  });

  it('reports failure for an error envelope', async () => {
    const res = new Response(
      JSON.stringify({ status: 'error', error: { code: 'X' } }),
      { status: 400 },
    );
    const result = await readEnvelope(res);
    expect(result.ok).toBe(false);
  });
});
