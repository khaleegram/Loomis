import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { middleware } from './middleware';
import { serializeSession } from '@/lib/auth/session';

function req(path: string, session?: { role: string; tenantId: string | null }): NextRequest {
  const headers: Record<string, string> = {};
  if (session) {
    headers.cookie = `loomis_session=${encodeURIComponent(serializeSession(session as never))}`;
  }
  return new NextRequest(`http://localhost${path}`, { headers });
}

function locationOf(res: Response): string | null {
  const loc = res.headers.get('location');
  return loc ? new URL(loc).pathname + new URL(loc).search : null;
}

describe('middleware', () => {
  it('redirects unauthenticated users off a protected console to login', () => {
    const res = middleware(req('/school/students'));
    expect(res.status).toBe(307);
    expect(locationOf(res)).toBe('/login?next=%2Fschool%2Fstudents');
  });

  it('lets a role into its own group', () => {
    const res = middleware(req('/school/students', { role: 'principal', tenantId: 't1' }));
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects a role that requests another group to its home', () => {
    const res = middleware(req('/platform/revenue', { role: 'principal', tenantId: 't1' }));
    expect(locationOf(res)).toBe('/school');
  });

  it('keeps authenticated users out of the login page', () => {
    const res = middleware(req('/login', { role: 'platform_owner', tenantId: null }));
    expect(locationOf(res)).toBe('/platform');
  });

  it('allows unauthenticated access to the login page', () => {
    const res = middleware(req('/login'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows public paths through', () => {
    const res = middleware(req('/'));
    expect(res.headers.get('location')).toBeNull();
  });
});
