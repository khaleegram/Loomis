import { z } from 'zod';
import { koboAmount, positiveKoboAmount } from '../finance/finance.schema.js';

/**
 * Ledger module contracts (Revenue Integrity §A/B; System Design §8.1/§8.3).
 * Money amounts are integer kobo (loomis-financial-integrity).
 */

/** PSF obligation lifecycle status (immutable row; settlement derived from settlements). */
export const psfObligationStatus = z.enum([
  'pending',
  'settled',
  'waived_pending',
  'waived',
  'disputed',
  'written_off',
]);
export type PsfObligationStatus = z.infer<typeof psfObligationStatus>;

export const psfLiabilityReason = z.enum([
  'census_locked',
  'activity_inferred',
  'late_enrollment',
  'platform_adjustment',
]);
export type PsfLiabilityReason = z.infer<typeof psfLiabilityReason>;

export const psfSettlementSource = z.enum([
  'GATEWAY_SPLIT',
  'OFFLINE_CASH',
  'BANK_TRANSFER',
  'MANUAL_ADJUSTMENT',
  'BULK_RECONCILIATION',
]);
export type PsfSettlementSource = z.infer<typeof psfSettlementSource>;

export const psfSettlementStatus = z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'REVERSED']);
export type PsfSettlementStatus = z.infer<typeof psfSettlementStatus>;

export const ledgerEntryDirection = z.enum(['debit', 'credit']);
export type LedgerEntryDirection = z.infer<typeof ledgerEntryDirection>;

export const ledgerSourceType = z.enum([
  'psf_obligation',
  'payment',
  'refund',
  'referral_payout',
  'admin_adjustment',
  'chargeback',
]);
export type LedgerSourceType = z.infer<typeof ledgerSourceType>;

/** Platform chart-of-accounts codes used by LedgerService.post(). */
export const ledgerAccountCode = z.enum([
  'school_psf_receivable',
  'loomis_psf_revenue',
  'cash_gateway_clearing',
]);
export type LedgerAccountCode = z.infer<typeof ledgerAccountCode>;

/** Events published by the Ledger module (System Design §7.2 / §8.5). */
export const LEDGER_EVENT_TYPES = {
  psfObligationCreated: 'billing.psf_obligation.created',
  psfObligationSettled: 'billing.psf_obligation.settled',
  transactionPosted: 'ledger.transaction.posted',
} as const;

export const psfObligationResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  termId: z.string().uuid(),
  studentId: z.string().uuid(),
  rateSnapshotId: z.string().uuid(),
  amountMinor: positiveKoboAmount,
  currency: z.string().length(3),
  status: psfObligationStatus,
  liabilityReason: psfLiabilityReason,
  settledAmountMinor: koboAmount,
  remainingAmountMinor: koboAmount,
  createdAt: z.string().datetime(),
});
export type PsfObligationResponse = z.infer<typeof psfObligationResponse>;

export const ledgerBalanceCheckResult = z.object({
  passed: z.boolean(),
  debitTotalMinor: koboAmount,
  creditTotalMinor: koboAmount,
  psfRevenueMinor: koboAmount,
  settledObligationsMinor: koboAmount,
  checkedAt: z.string().datetime(),
});
export type LedgerBalanceCheckResult = z.infer<typeof ledgerBalanceCheckResult>;
