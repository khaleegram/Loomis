import { passwordResetRequest } from '@loomis/contracts';
import { NextResponse, type NextRequest } from 'next/server';

import { callBackend } from '@/lib/auth/bff';
import { bffError, forwardError } from '@/lib/auth/bff-response';

export const runtime = 'nodejs';

/**
 * POST /api/auth/password/reset — request a password-reset OTP (US-XC-003).
 * Unauthenticated; the OTP is delivered to the user's registered email/phone.
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = passwordResetRequest.safeParse(body);
  if (!parsed.success) {
    return forwardError(422, {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid password reset request',
        requestId: 'bff',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  try {
    const response = await callBackend('/auth/password/reset', {
      method: 'POST',
      body: parsed.data,
    });
    const json: unknown = await response.json().catch(() => null);
    return NextResponse.json(json ?? { status: 'error' }, { status: response.status });
  } catch {
    return bffError('UPSTREAM_UNAVAILABLE', 'Authentication service is unavailable', 503);
  }
}
