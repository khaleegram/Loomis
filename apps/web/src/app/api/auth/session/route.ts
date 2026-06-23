import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, parseSession } from '@/lib/auth/bff';

export const runtime = 'nodejs';

/**
 * GET /api/auth/session — lightweight session descriptor for the client.
 * Returns the role + tenant from the httpOnly session cookie WITHOUT any token.
 * The access token is obtained separately via POST /api/auth/refresh.
 */
export async function GET(req: NextRequest) {
  const session = parseSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    role: session.role,
    tenantId: session.tenantId,
    ...(session.mustChangePassword ? { mustChangePassword: true } : {}),
    ...(session.displayName ? { displayName: session.displayName } : {}),
  });
}
