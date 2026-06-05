import type { PsfRateScope, PsfRateSnapshotResponse } from '@loomis/contracts';
import type { psfRateSnapshots } from '../../../../drizzle/schema/tenant.js';

type PsfRateSnapshotRow = typeof psfRateSnapshots.$inferSelect;

export function psfRateSnapshotToResponse(row: PsfRateSnapshotRow): PsfRateSnapshotResponse {
  return {
    id: row.id,
    scope: row.scope as PsfRateScope,
    tenantId: row.tenantId ?? null,
    rateMinor: row.rateMinor,
    previousRateMinor: row.previousRateMinor ?? null,
    effectiveFrom: row.effectiveFrom.toISOString(),
    reason: row.reason ?? null,
    changedById: row.changedById,
    approvedById: row.approvedById ?? null,
    workflowInstanceId: row.workflowInstanceId ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
