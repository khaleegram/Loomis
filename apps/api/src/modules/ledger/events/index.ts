import { registerEventHandler } from '../../../shared/events/registry.js';
import { ACADEMIC_EVENT_TYPES } from '../../academic/events/types.js';
import { FINANCE_EVENT_TYPES } from '../../finance/events/types.js';
import { STUDENT_EVENT_TYPES } from '../../student/events/types.js';
import { handleCensusLocked } from './consumers/census-locked.consumer.js';
import { handleLateEnrolled } from './consumers/late-enrollment.consumer.js';
import { handlePaymentVerified } from './consumers/payment-verified.consumer.js';

/**
 * Registers Ledger module consumers for cross-module revenue events
 * (System Design §8.1 / §8.5). Handlers are idempotent via
 * `ledger.processed_events` and dedupe on redelivery.
 */
export function registerLedgerEventConsumers(): void {
  registerEventHandler(ACADEMIC_EVENT_TYPES.termCensusLocked, handleCensusLocked);
  registerEventHandler(STUDENT_EVENT_TYPES.LATE_ENROLLED, handleLateEnrolled);
  registerEventHandler(FINANCE_EVENT_TYPES.paymentVerified, handlePaymentVerified);
}

export { LEDGER_ACCOUNT_CODES } from './types.js';
export type { CensusLockedEvent, LateEnrolledEvent, PaymentVerifiedEvent, LedgerEventEnvelope } from './types.js';
