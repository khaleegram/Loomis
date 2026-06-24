import type {
  BreakGlassSessionResponse,
  IvpAnomalyCaseResponse,
  PrivilegedChangeResponse,
} from '@loomis/contracts';
import type { breakGlassSessions, ivpAnomalyCases, privilegedChangeRequests } from '../../../../drizzle/schema/risk.js';
import { ACTIVE_IVP_STATUSES } from '../types.js';

type IvpCaseRow = typeof ivpAnomalyCases.$inferSelect;
type PcrRow = typeof privilegedChangeRequests.$inferSelect;
type BreakGlassRow = typeof breakGlassSessions.$inferSelect;

export function ivpCaseToResponse(row: IvpCaseRow): IvpAnomalyCaseResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    termId: row.termId,
    detectedAt: row.detectedAt.toISOString(),
    reportedEnrollment: row.reportedEnrollment,
    estimatedRange: { min: row.estimatedMin, max: row.estimatedMax },
    anomalyScore: row.anomalyScore / 1000,
    priority: row.priority as IvpAnomalyCaseResponse['priority'],
    caseStatus: row.caseStatus as IvpAnomalyCaseResponse['caseStatus'],
    signalsAnalyzed: row.signalsAnalyzed,
    assignedToId: row.assignedToId ?? null,
    resolutionNotes: row.resolutionNotes ?? null,
    resolvedById: row.resolvedById ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    referralEarningsHeld: ACTIVE_IVP_STATUSES.includes(row.caseStatus as never),
    createdAt: row.createdAt.toISOString(),
  };
}

export function privilegedChangeToResponse(row: PcrRow): PrivilegedChangeResponse {
  return {
    id: row.id,
    changeType: row.changeType as PrivilegedChangeResponse['changeType'],
    targetTenantId: row.targetTenantId ?? null,
    requestedByUserId: row.requestedByUserId,
    approvedByUserId: row.approvedByUserId ?? null,
    status: row.status as PrivilegedChangeResponse['status'],
    beforeJson: row.beforeJson,
    afterJson: row.afterJson,
    reason: row.reason,
    riskScore: row.riskScore,
    createdAt: row.createdAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    executedAt: row.executedAt?.toISOString() ?? null,
  };
}

export function breakGlassToResponse(row: BreakGlassRow): BreakGlassSessionResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    supportUserId: row.supportUserId,
    supportTicketId: row.supportTicketId,
    status: row.status as BreakGlassSessionResponse['status'],
    activatedAt: row.activatedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    ownerNotifiedAt: row.ownerNotifiedAt?.toISOString() ?? null,
  };
}
