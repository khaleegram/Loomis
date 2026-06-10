import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.sig`;
}

function refreshReq(cookie?: string): NextRequest {
  return new NextRequest('http://localhost/api/auth/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({}),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/auth/refresh', () => {
  it('returns 401 and clears cookies when there is no refresh cookie', async () => {
    const res = await POST(refreshReq('loomis_session={"role":"principal","tenantId":"t-1"}'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('IDENTITY_SESSION_INVALIDATED');
    expect(res.cookies.get('loomis_refresh')?.value).toBe('');
    expect(res.cookies.get('loomis_session')?.value).toBe('');
  });

  it('rotates the refresh token and returns a fresh access token', async () => {
    const accessToken = fakeJwt({ role: 'accountant', tenant_id: 'tenant-2' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'success',
            data: {
              accessToken,
              refreshToken: 'rotated-refresh',
              expiresAt: '2030-01-01T00:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const res = await POST(refreshReq('loomis_refresh=old-refresh'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({ outcome: 'authenticated', accessToken, role: 'accountant' });
    expect('refreshToken' in body).toBe(false);
    expect(res.cookies.get('loomis_refresh')?.value).toBe('rotated-refresh');
    expect(res.cookies.get('loomis_session')?.value).toContain('accountant');
  });

  it('clears cookies when the backend rejects the refresh token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'error', error: { code: 'IDENTITY_SESSION_INVALIDATED', message: 'x', requestId: 'r' } }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const res = await POST(refreshReq('loomis_refresh=stale'));
    expect(res.status).toBe(401);
    // Cleared cookie is set with an empty value / maxAge 0.
    expect(res.cookies.get('loomis_refresh')?.value).toBe('');
    expect(res.cookies.get('loomis_session')?.value).toBe('');
  });
});
