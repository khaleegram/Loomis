import postgres from 'postgres';
import { uuidv7 } from 'uuidv7';
import { getEnv } from '../config/env.js';

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
  accessReason?: 'normal_use' | 'support_case' | 'regional_analytics' | 'export' | 'legal' | 'security_investigation';
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

/**
 * Appends an immutable audit event (System Design §6.1).
 * Storage access uses action `storage.object.accessed`.
 */
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  const client = getAuditClient();
  const metadata = JSON.stringify(input.metadata ?? {});
  await client`
    INSERT INTO audit.audit_events (
      id, tenant_id, actor_user_id, actor_type, action, resource_type, resource_id,
      sensitivity, result, ip_address, user_agent, request_id, metadata_json
    ) VALUES (
      ${uuidv7()},
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
      ${metadata}::jsonb
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
