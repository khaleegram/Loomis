import { mfaEnrollConfirmRequest } from '@loomis/contracts';
import { NextResponse, type NextRequest } from 'next/server';

import { callBackend } from '@/lib/auth/bff';
import { bffError, forwardError } from '@/lib/auth/bff-response';

export const runtime = 'nodejs';

/**
 * GET /api/auth/mfa/enroll — begin TOTP enrollment (US-XC-001).
 * Authorised by the short-lived enrollment token issued at login when MFA is
 * mandatory but not yet configured. The client forwards it as a Bearer header.
 */
export async function GET(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization) {
    return forwardError(401, {
      status: 'error',
      error: { code: 'IDENTITY_MFA_NOT_ENROLLED', message: 'Missing enrollment token', requestId: 'bff' },
    });
  }

  try {
    const response = await callBackend('/auth/mfa/enroll', { method: 'GET', authorization });
    const json: unknown = await response.json().catch(() => null);
    return NextResponse.json(
      json ?? { status: 'error' },
      { status: response.status },
    );
  } catch {
    return bffError('UPSTREAM_UNAVAILABLE', 'Authentication service is unavailable', 503);
  }
}

/** POST /api/auth/mfa/enroll — confirm the first TOTP and receive backup codes. */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = mfaEnrollConfirmRequest.safeParse(body);
  if (!parsed.success) {
    return forwardError(422, {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid enrollment confirmation request',
        requestId: 'bff',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  try {
    const response = await callBackend('/auth/mfa/enroll', { method: 'POST', body: parsed.data });
    const json: unknown = await response.json().catch(() => null);
    return NextResponse.json(json ?? { status: 'error' }, { status: response.status });
  } catch {
    return bffError('UPSTREAM_UNAVAILABLE', 'Authentication service is unavailable', 503);
  }
}
