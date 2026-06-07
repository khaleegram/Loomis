import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.sig`;
}

function envelope(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ status: 'success', data }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function errorEnvelope(code: string, status: number): Response {
  return new Response(
    JSON.stringify({ status: 'error', error: { code, message: code, requestId: 'r' } }),
    { status, headers: { 'content-type': 'application/json' } },
  );
}

function loginReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/auth/login', () => {
  it('stores the refresh token in a cookie and never returns it', async () => {
    const accessToken = fakeJwt({ role: 'principal', tenant_id: 'tenant-1' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        envelope({
          outcome: 'authenticated',
          accessToken,
          expiresAt: '2030-01-01T00:00:00.000Z',
          role: 'principal',
          tenantId: 'tenant-1',
          refreshToken: 'secret-refresh',
        }),
      ),
    );

    const res = await POST(loginReq({ email: 'p@school.ng', password: 'Sup3rPass!' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ outcome: 'authenticated', accessToken, role: 'principal' });
    expect('refreshToken' in body).toBe(false);

    expect(res.cookies.get('loomis_refresh')?.value).toBe('secret-refresh');
    const sessionCookie = res.cookies.get('loomis_session');
    expect(sessionCookie?.value).toContain('principal');
    expect(res.cookies.get('loomis_refresh')?.httpOnly).toBe(true);
  });

  it('passes through an MFA challenge without setting cookies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        envelope({ outcome: 'mfa_required', mfaChallengeId: '11111111-1111-1111-1111-111111111111' }),
      ),
    );

    const res = await POST(loginReq({ email: 'p@school.ng', password: 'Sup3rPass!' }));
    const body = await res.json();
    expect(body.outcome).toBe('mfa_required');
    expect(res.cookies.get('loomis_refresh')).toBeUndefined();
  });

  it('rejects an invalid body with 422', async () => {
    const res = await POST(loginReq({ email: 'not-an-email' }));
    expect(res.status).toBe(422);
  });

  it('forwards a backend error with its status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(errorEnvelope('IDENTITY_INVALID_CREDENTIALS', 401)),
    );
    const res = await POST(loginReq({ email: 'p@school.ng', password: 'Sup3rPass!' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('IDENTITY_INVALID_CREDENTIALS');
  });
});
