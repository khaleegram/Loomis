import type {
  ReconciliationExceptionResponse,
  RefundRequestResponse,
} from '@loomis/contracts';
import type { reconciliationExceptions, refundRequests } from '../../../../drizzle/schema/finance.js';

type RefundRow = typeof refundRequests.$inferSelect;
type ExceptionRow = typeof reconciliationExceptions.$inferSelect;

export function refundToResponse(row: RefundRow): RefundRequestResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    paymentId: row.paymentId,
    invoiceId: row.invoiceId,
    termId: row.termId,
    studentId: row.studentId,
    amountMinor: row.amountMinor,
    reasonCode: row.reasonCode as RefundRequestResponse['reasonCode'],
    reasonNotes: row.reasonNotes ?? null,
    psfTreatment: row.psfTreatment as RefundRequestResponse['psfTreatment'],
    status: row.status as RefundRequestResponse['status'],
    workflowInstanceId: row.workflowInstanceId,
    psfReversalWorkflowId: row.psfReversalWorkflowId ?? null,
    requestedById: row.requestedById,
    approvedById: row.approvedById ?? null,
    executedAt: row.executedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function reconciliationExceptionToResponse(
  row: ExceptionRow,
): ReconciliationExceptionResponse {
  return {
    id: row.id,
    tenantId: row.tenantId ?? null,
    provider: row.provider as ReconciliationExceptionResponse['provider'],
    exceptionType: row.exceptionType as ReconciliationExceptionResponse['exceptionType'],
    gatewayReference: row.gatewayReference ?? null,
    paymentId: row.paymentId ?? null,
    gatewayAmountMinor: row.gatewayAmountMinor ?? null,
    platformAmountMinor: row.platformAmountMinor ?? null,
    settlementDate: row.settlementDate,
    reconciliationRunId: row.reconciliationRunId,
    status: row.status as ReconciliationExceptionResponse['status'],
    resolutionNotes: row.resolutionNotes ?? null,
    resolvedById: row.resolvedById ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
