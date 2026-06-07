import { NextResponse, type NextRequest } from 'next/server';

import { REFRESH_COOKIE, callBackend } from '@/lib/auth/bff';
import { clearAuthCookies } from '@/lib/auth/bff-response';

export const runtime = 'nodejs';

/**
 * POST /api/auth/logout — revoke the session and clear all auth cookies.
 * Cookies are cleared unconditionally: even if the backend call fails, the
 * browser must not retain a session reference (loomis-security).
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value ?? null;
  const authorization = req.headers.get('authorization');
  const body: unknown = await req.json().catch(() => ({}));
  const allDevices = Boolean((body as { allDevices?: unknown })?.allDevices);

  try {
    await callBackend('/auth/logout', {
      method: 'POST',
      authorization,
      body: { allDevices, ...(refreshToken ? { refreshToken } : {}) },
    });
  } catch {
    // Best-effort revocation; cookies are cleared regardless.
  }

  const res = NextResponse.json({ status: 'success', data: { loggedOut: true } });
  clearAuthCookies(res);
  return res;
}
