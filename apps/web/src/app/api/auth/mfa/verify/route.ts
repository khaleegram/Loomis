import { mfaVerifyRequest } from '@loomis/contracts';
import type { NextRequest } from 'next/server';

import { callBackend } from '@/lib/auth/bff';
import { bffError, forwardError, handleAuthBackendResponse } from '@/lib/auth/bff-response';

export const runtime = 'nodejs';

function deviceHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  const fingerprint = req.headers.get('x-device-fingerprint');
  const token = req.headers.get('x-device-token');
  if (fingerprint) headers['X-Device-Fingerprint'] = fingerprint;
  if (token) headers['X-Device-Token'] = token;
  return headers;
}

/**
 * POST /api/auth/mfa/verify — solve the MFA challenge from login (US-XC-001).
 * On success the refresh token is set as an httpOnly cookie; the access token is
 * returned in the body for the client to hold in memory.
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = mfaVerifyRequest.safeParse(body);
  if (!parsed.success) {
    return forwardError(422, {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid MFA verification request',
        requestId: 'bff',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  try {
    const response = await callBackend('/auth/mfa/verify', {
      method: 'POST',
      body: parsed.data,
      headers: deviceHeaders(req),
    });
    return await handleAuthBackendResponse(response);
  } catch {
    return bffError('UPSTREAM_UNAVAILABLE', 'Authentication service is unavailable', 503);
  }
}
