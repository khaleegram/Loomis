import { LoomisError } from '../../../shared/errors.js';
import type { ActorContext } from '../types.js';

export function requireTenant(actor: ActorContext, tenantId: string): void {
  if (actor.tenantId !== null && actor.tenantId !== tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Tenant mismatch');
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
