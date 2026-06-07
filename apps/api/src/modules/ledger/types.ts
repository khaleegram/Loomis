import type { LedgerSourceType } from '@loomis/contracts';

/** A single durable outbox event row to insert inside a producer's transaction. */
export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  tenantId: string | null;
  payload: Record<string, unknown>;
}

/** One leg of a double-entry ledger posting. */
export interface LedgerPostingLeg {
  accountCode: string;
  direction: 'debit' | 'credit';
  amountMinor: number;
}

/** Parameters for LedgerService.post() — every transaction must net to zero. */
export interface LedgerPostInput {
  tenantId: string | null;
  sourceType: LedgerSourceType;
  sourceId: string;
  currency?: string;
  entries: LedgerPostingLeg[];
}

export interface CreatePsfObligationInput {
  tenantId: string;
  termId: string;
  studentId: string;
  rateSnapshotId: string;
  amountMinor: number;
  liabilityReason: 'census_locked' | 'late_enrollment' | 'activity_inferred' | 'platform_adjustment';
}

export interface CreatePsfSettlementInput {
  tenantId: string;
  psfObligationId: string;
  paymentId: string;
  settlementAmountMinor: number;
  settlementSource:
    | 'GATEWAY_SPLIT'
    | 'OFFLINE_CASH'
    | 'BANK_TRANSFER'
    | 'MANUAL_ADJUSTMENT'
    | 'BULK_RECONCILIATION';
  verifiedBy: string | null;
  verifiedAt: Date | null;
  idempotencyKey: string;
}
