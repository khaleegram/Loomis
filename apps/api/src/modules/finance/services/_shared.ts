import type { FeeItemInput } from '@loomis/contracts';
import { isAuditAvailable, writeAudit, type AuditResult } from '../../../shared/audit.js';
import { LoomisError } from '../../../shared/errors.js';
import type { ActorContext, AuditContext } from '../types.js';

/** Defense in depth beyond requireTenantMatch: the actor must own the tenant. */
export function requireTenant(actor: ActorContext, tenantId: string): void {
  if (actor.tenantId !== null && actor.tenantId !== tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Tenant mismatch');
  }
}

/**
 * Fail-closed audit gate (loomis-financial-integrity): a financial write must
 * NOT proceed when the audit trail is unavailable. Call this before mutating.
 */
export async function assertAuditAvailable(): Promise<void> {
  if (!(await isAuditAvailable())) {
    throw new LoomisError(
      'AUDIT_UNAVAILABLE',
      503,
      'Audit trail is unavailable; financial writes are blocked until it recovers',
    );
  }
}

/** Sum fee-item amounts (all integer kobo) into the structure/invoice total. */
export function sumItemsMinor(items: FeeItemInput[]): number {
  return items.reduce((total, item) => total + item.amountMinor, 0);
}

/** Writes a financial-sensitivity audit event. Never includes PII or amounts beyond opaque ids. */
export async function writeFinanceAudit(params: {
  tenantId: string;
  actorUserId: string | null;
  actorType?: 'user' | 'system' | 'job';
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: AuditResult;
  audit: AuditContext;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await writeAudit({
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    actorType: params.actorType ?? 'user',
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    sensitivity: 'financial',
    result: params.result,
    requestId: params.audit.requestId,
    ipAddress: params.audit.ipAddress ?? null,
    userAgent: params.audit.userAgent ?? null,
    ...(params.metadata ? { metadata: params.metadata } : {}),
  });
}
