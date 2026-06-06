/**
 * Events published by the Finance module (System Design §3.2; loomis-financial-integrity).
 * Written to the durable transactional outbox (`ledger.outbox_events`) inside the
 * producing transaction — never dispatched out-of-band. The BullMQ relay (built
 * with the Ledger module) drains them to consumers.
 */
export const FINANCE_EVENT_TYPES = {
  feeStructureCreated: 'finance.fee_structure.created',
  feeStructureUpdated: 'finance.fee_structure.updated',
  feeStructureAmendmentRequested: 'finance.fee_structure.amendment_requested',
  feeStructureAmended: 'finance.fee_structure.amended',
  invoiceIssued: 'finance.invoice.issued',
} as const;

export interface FeeStructureEventPayload extends Record<string, unknown> {
  tenantId: string;
  feeStructureId: string;
  termId: string;
  classLevelId: string;
  version: number;
  totalAmountMinor: number;
  actorId: string;
}

export interface InvoiceIssuedPayload extends Record<string, unknown> {
  tenantId: string;
  invoiceId: string;
  termId: string;
  studentId: string;
  classLevelId: string;
  amountChargedMinor: number;
  issuedById: string;
}
