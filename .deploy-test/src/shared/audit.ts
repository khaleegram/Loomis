import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { uuidv7 } from 'uuidv7';
import { getEnv } from '../config/env.js';
import { LoomisError } from './errors.js';

export type AuditSensitivity =
  | 'standard'
  | 'financial'
  | 'pii'
  | 'child_pii'
  | 'privileged'
  | 'security';

export type AuditResult = 'success' | 'denied' | 'failed';

export interface WriteAuditInput {
  tenantId: string | null;
  actorUserId: string | null;
  actorType?: 'user' | 'system' | 'provider' | 'support' | 'job';
  action: string;
  resourceType: string;
  resourceId: string | null;
  sensitivity: AuditSensitivity;
  result: AuditResult;
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export interface WriteDataAccessInput {
  tenantId: string | null;
  actorUserId: string;
  accessReason?:
    | 'normal_use'
    | 'support_case'
    | 'regional_analytics'
    | 'export'
    | 'legal'
    | 'security_investigation';
  resourceType: string;
  resourceCount?: number;
  containsChildPii: boolean;
  containsFinancialData: boolean;
  supportTicketId?: string | null;
}

let auditClient: ReturnType<typeof postgres> | null = null;

function getAuditClient() {
  if (!auditClient) {
    const env = getEnv();
    auditClient = postgres(env.DATABASE_AUDIT_URL, { max: 5 });
  }
  return auditClient;
}

/** Probes whether the audit database is reachable (fail-closed gate for sensitive writes). */
export async function isAuditAvailable(): Promise<boolean> {
  try {
    const client = getAuditClient();
    await client`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/** Throws when audit is down — used by services and `requireAuditAvailable` middleware. */
export async function assertAuditAvailable(): Promise<void> {
  if (!(await isAuditAvailable())) {
    throw new LoomisError(
      'AUDIT_UNAVAILABLE',
      503,
      'Audit trail is unavailable; writes are blocked until it recovers',
    );
  }
}

function computeEntryHash(input: {
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string;
  previousHash: string | null;
}): string {
  const canonical = JSON.stringify({
    id: input.id,
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    requestId: input.requestId,
    previousHash: input.previousHash,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Runs a state mutation then appends the audit event. Audit availability is
 * checked first (fail-closed). The audit cluster is separate from the main DB
 * (System Design §3.3), so the state transaction commits before the audit
 * INSERT — callers MUST treat audit failure after a successful mutation as fatal.
 */
export async function performAuditedWrite<T>(
  auditInput: WriteAuditInput,
  mutate: () => Promise<T>,
): Promise<T> {
  await assertAuditAvailable();
  const result = await mutate();
  await writeAudit(auditInput);
  return result;
}

/**
 * Appends an immutable audit event with tamper-evident hash chaining (CON-007).
 */
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  const client = getAuditClient();
  const id = uuidv7();
  const metadata = JSON.stringify(input.metadata ?? {});

  const [previous] = await client<{ entry_hash: string }[]>`
    SELECT entry_hash FROM audit.audit_events
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;

  const previousHash = previous?.entry_hash ?? null;
  const entryHash = computeEntryHash({
    id,
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    requestId: input.requestId,
    previousHash,
  });

  await client`
    INSERT INTO audit.audit_events (
      id, tenant_id, actor_user_id, actor_type, action, resource_type, resource_id,
      sensitivity, result, ip_address, user_agent, request_id, metadata_json,
      previous_hash, entry_hash
    ) VALUES (
      ${id},
      ${input.tenantId},
      ${input.actorUserId},
      ${input.actorType ?? 'user'},
      ${input.action},
      ${input.resourceType},
      ${input.resourceId},
      ${input.sensitivity},
      ${input.result},
      ${input.ipAddress ?? null},
      ${input.userAgent ?? null},
      ${input.requestId},
      ${metadata}::jsonb,
      ${previousHash},
      ${entryHash}
    )
  `;
}

/** Logs read access to sensitive resources (AUD-003). */
export async function writeDataAccess(input: WriteDataAccessInput): Promise<void> {
  const client = getAuditClient();
  await client`
    INSERT INTO audit.data_access_events (
      id, tenant_id, actor_user_id, access_reason, resource_type, resource_count,
      contains_child_pii, contains_financial_data, support_ticket_id
    ) VALUES (
      ${uuidv7()},
      ${input.tenantId},
      ${input.actorUserId},
      ${input.accessReason ?? 'normal_use'},
      ${input.resourceType},
      ${input.resourceCount ?? 1},
      ${input.containsChildPii},
      ${input.containsFinancialData},
      ${input.supportTicketId ?? null}
    )
  `;
}

/** @internal Resets the pooled audit client — test use only. */
export function resetAuditClientForTests(): void {
  auditClient = null;
}
