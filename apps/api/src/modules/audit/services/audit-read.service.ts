import postgres from 'postgres';
import { getEnv } from '../../../config/env.js';
import { LoomisError } from '../../../shared/errors.js';
import { writeAudit, writeDataAccess } from '../../../shared/audit.js';
import type { AuditLogExportRequest, AuditLogSearchFilters } from '@loomis/contracts';

type AuditEventRow = {
  id: string;
  tenant_id: string | null;
  actor_user_id: string | null;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  sensitivity: string;
  result: string;
  ip_address: string | null;
  request_id: string;
  created_at: Date;
};

let readClient: ReturnType<typeof postgres> | null = null;

async function getReadClient() {
  if (!readClient) {
    readClient = postgres(getEnv().DATABASE_AUDIT_URL, { max: 3 });
  }
  return readClient;
}

function isSensitiveQuery(filters: AuditLogSearchFilters): boolean {
  return Boolean(
    filters.sensitivity === 'privileged' && filters.actorUserId && !filters.tenantId,
  );
}

function entriesToCsv(
  entries: Array<{
    id: string;
    createdAt: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    sensitivity: string;
    result: string;
    actorUserId: string | null;
    actorType: string;
    requestId: string;
  }>,
): string {
  const header = [
    'id',
    'createdAt',
    'action',
    'resourceType',
    'resourceId',
    'sensitivity',
    'result',
    'actorUserId',
    'actorType',
    'requestId',
  ].join(',');
  const rows = entries.map((e) =>
    [
      e.id,
      e.createdAt,
      e.action,
      e.resourceType,
      e.resourceId ?? '',
      e.sensitivity,
      e.result,
      e.actorUserId ?? '',
      e.actorType,
      e.requestId,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

export const auditReadService = {
  async search(filters: AuditLogSearchFilters) {
    const client = await getReadClient();
    const limit = Math.min(filters.limit ?? 50, 200);

    try {
      const rows = await client<AuditEventRow[]>`
        SELECT id, tenant_id, actor_user_id, actor_type, action, resource_type,
               resource_id, sensitivity, result, ip_address, request_id, created_at
        FROM audit.audit_events
        WHERE (${filters.actorUserId ?? null}::uuid IS NULL OR actor_user_id = ${filters.actorUserId ?? null})
          AND (${filters.tenantId ?? null}::uuid IS NULL OR tenant_id = ${filters.tenantId ?? null})
          AND (${filters.action ?? null}::text IS NULL OR action ILIKE ${filters.action ? `%${filters.action}%` : null})
          AND (${filters.sensitivity ?? null}::text IS NULL OR sensitivity = ${filters.sensitivity ?? null})
          AND (${filters.from ?? null}::timestamptz IS NULL OR created_at >= ${filters.from ?? null})
          AND (${filters.to ?? null}::timestamptz IS NULL OR created_at <= ${filters.to ?? null})
          AND (${filters.cursor ?? null}::uuid IS NULL OR id < ${filters.cursor ?? null})
        ORDER BY created_at DESC, id DESC
        LIMIT ${limit}
      `;

      return {
        entries: rows.map((r) => ({
          id: r.id,
          tenantId: r.tenant_id,
          actorUserId: r.actor_user_id,
          actorType: r.actor_type,
          action: r.action,
          resourceType: r.resource_type,
          resourceId: r.resource_id,
          sensitivity: r.sensitivity,
          result: r.result,
          ipAddress: r.ip_address,
          requestId: r.request_id,
          createdAt: r.created_at.toISOString(),
        })),
        nextCursor: rows.length === limit ? (rows[rows.length - 1]?.id ?? null) : null,
        totalApprox: null,
        sensitiveQuery: isSensitiveQuery(filters),
      };
    } catch {
      throw new LoomisError('AUDIT_UNAVAILABLE', 503, 'Audit database is unavailable');
    }
  },

  async export(
    body: AuditLogExportRequest,
    actorUserId: string,
    requestId: string,
    opts?: { tenantId?: string; inlineDelivery?: boolean },
  ) {
    const scopedFilters = {
      ...body.filters,
      ...(opts?.tenantId ? { tenantId: opts.tenantId } : {}),
      limit: 200,
    };
    const result = await this.search(scopedFilters);
    const tenantId = opts?.tenantId ?? body.filters.tenantId ?? null;

    await writeDataAccess({
      tenantId,
      actorUserId,
      accessReason: 'export',
      resourceType: 'audit_events',
      resourceCount: result.entries.length,
      containsChildPii: body.filters.sensitivity === 'child_pii',
      containsFinancialData: body.filters.sensitivity === 'financial',
    });
    await writeAudit({
      tenantId,
      actorUserId,
      action: 'audit.export',
      resourceType: 'audit_events',
      resourceId: null,
      sensitivity: 'privileged',
      result: 'success',
      requestId,
      metadata: { reason: body.reason, format: body.format, recordCount: result.entries.length },
    });

    const content =
      opts?.inlineDelivery && body.format === 'csv'
        ? entriesToCsv(result.entries)
        : opts?.inlineDelivery && body.format === 'json'
          ? JSON.stringify(result.entries, null, 2)
          : null;

    return {
      exportId: requestId,
      recordCount: result.entries.length,
      format: body.format,
      downloadUrl: null,
      content,
      message: content
        ? `Exported ${result.entries.length} records.`
        : `Export of ${result.entries.length} records logged. Download delivery is async.`,
    };
  },
};
