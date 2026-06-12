import { changePasswordRequest } from '@loomis/contracts';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { callBackend, sessionCookieOptions } from '@/lib/auth/bff';
import { bffError, forwardError } from '@/lib/auth/bff-response';
import { SESSION_COOKIE, parseSession, serializeSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

/** POST /api/auth/change-password — set a new password and clear the forced-change flag. */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = changePasswordRequest.safeParse(body);
  if (!parsed.success) {
    return forwardError(422, {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid change-password request',
        requestId: 'bff',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization) {
    return forwardError(401, {
      status: 'error',
      error: {
        code: 'IDENTITY_SESSION_INVALIDATED',
        message: 'Missing authorization',
        requestId: 'bff',
      },
    });
  }

  let response: Response;
  try {
    response = await callBackend('/auth/change-password', {
      method: 'POST',
      authorization,
      body: parsed.data,
    });
  } catch {
    return bffError('UPSTREAM_UNAVAILABLE', 'Authentication service is unavailable', 503);
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok || !json || (json as { status?: string }).status !== 'success') {
    return forwardError(response.status, json);
  }

  const sessionRaw = req.cookies.get(SESSION_COOKIE)?.value;
  const session = parseSession(sessionRaw);
  const res = NextResponse.json({ mustChangePassword: false });
  if (session) {
    const maxAge = 60 * 60 * 24 * 30;
    res.cookies.set(
      SESSION_COOKIE,
      serializeSession({
        role: session.role,
        tenantId: session.tenantId,
        ...(session.displayName ? { displayName: session.displayName } : {}),
      }),
      sessionCookieOptions(maxAge),
    );
  }
  return res;
}
