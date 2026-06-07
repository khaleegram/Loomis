import { passwordResetConfirmRequest } from '@loomis/contracts';
import { NextResponse, type NextRequest } from 'next/server';

import { callBackend } from '@/lib/auth/bff';
import { bffError, clearAuthCookies, forwardError } from '@/lib/auth/bff-response';

export const runtime = 'nodejs';

/**
 * POST /api/auth/password/reset/confirm — set a new password after OTP
 * verification (US-XC-003). On success the backend invalidates other sessions;
 * the user re-authenticates, so we also clear any local auth cookies.
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = passwordResetConfirmRequest.safeParse(body);
  if (!parsed.success) {
    return forwardError(422, {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid password reset confirmation',
        requestId: 'bff',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  try {
    const response = await callBackend('/auth/password/reset/confirm', {
      method: 'POST',
      body: parsed.data,
    });
    const json: unknown = await response.json().catch(() => null);
    const res = NextResponse.json(json ?? { status: 'error' }, { status: response.status });
    if (response.ok) clearAuthCookies(res);
    return res;
  } catch {
    return bffError('UPSTREAM_UNAVAILABLE', 'Authentication service is unavailable', 503);
  }
}
