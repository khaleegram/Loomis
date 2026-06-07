import { loginRequest } from '@loomis/contracts';
import type { NextRequest } from 'next/server';

import { callBackend } from '@/lib/auth/bff';
import { bffError, forwardError, handleAuthBackendResponse } from '@/lib/auth/bff-response';

export const runtime = 'nodejs';

/**
 * POST /api/auth/login — BFF login (Frontend Architecture §7.3).
 * Proxies to the backend; on success the refresh token is stored in an httpOnly
 * cookie and only the in-memory access token is returned to the browser.
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = loginRequest.safeParse(body);
  if (!parsed.success) {
    return forwardError(422, {
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid login request',
        requestId: 'bff',
        details: parsed.error.flatten().fieldErrors,
      },
    });
  }

  try {
    const response = await callBackend('/auth/login', { method: 'POST', body: parsed.data });
    return await handleAuthBackendResponse(response);
  } catch {
    return bffError('UPSTREAM_UNAVAILABLE', 'Authentication service is unavailable', 503);
  }
}
