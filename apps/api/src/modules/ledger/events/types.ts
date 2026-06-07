import type { TermCensusLockedPayload } from '../../academic/events/types.js';
import type { PaymentVerifiedPayload } from '../../finance/events/types.js';
import type { StudentLateEnrolledPayload } from '../../student/events/types.js';

/** CloudEvents-style envelope dispatched by the outbox relay and in-process registry. */
export interface LedgerEventEnvelope<T extends Record<string, unknown> = Record<string, unknown>> {
  event_id: string;
  event_type: string;
  tenant_id: string | null;
  aggregate_type: string;
  aggregate_id: string;
  payload: T;
}

export type CensusLockedEvent = LedgerEventEnvelope<TermCensusLockedPayload>;
export type LateEnrolledEvent = LedgerEventEnvelope<StudentLateEnrolledPayload>;
export type PaymentVerifiedEvent = LedgerEventEnvelope<PaymentVerifiedPayload>;

export const LEDGER_ACCOUNT_CODES = {
  schoolPsfReceivable: 'school_psf_receivable',
  loomisPsfRevenue: 'loomis_psf_revenue',
  cashGatewayClearing: 'cash_gateway_clearing',
} as const;
