import { uuidv7 } from 'uuidv7';
import type { TokenStore } from './types.js';

export interface InterceptorContext {
  tokenStore: TokenStore;
  getActiveTenantId: () => string | null;
  idempotencyKey?: string;
  mfaToken?: string;
  /** When true, skip Authorization (e.g. public auth routes). */
  skipAuth?: boolean;
}

/** Generates a UUIDv7 for X-Request-Id (Frontend Architecture §3.3). */
export function generateRequestId(): string {
  return uuidv7();
}

/**
 * Applies cross-cutting request headers on every outbound call
 * (Frontend Architecture §3.3).
 */
export function applyRequestInterceptors(
  headers: Headers,
  ctx: InterceptorContext,
): void {
  if (!ctx.skipAuth) {
    const accessToken = ctx.tokenStore.getAccessToken();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  const tenantId = ctx.getActiveTenantId();
  if (tenantId) {
    headers.set('X-Tenant-Id', tenantId);
  }

  if (!headers.has('X-Request-Id')) {
    headers.set('X-Request-Id', generateRequestId());
  }

  if (ctx.idempotencyKey) {
    headers.set('Idempotency-Key', ctx.idempotencyKey);
  }

  if (ctx.mfaToken) {
    headers.set('X-MFA-Token', ctx.mfaToken);
  }
}
