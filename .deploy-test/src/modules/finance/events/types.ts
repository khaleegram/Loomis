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
  paymentLogged: 'finance.payment.logged',
  paymentVerified: 'payment.verified',
  paymentWebhookReceived: 'payment.webhook.received',
  refundRequested: 'finance.refund.requested',
  refundApproved: 'refund.approved',
  psfReversalApproved: 'finance.psf_reversal.approved',
  reconciliationRunCompleted: 'finance.reconciliation.completed',
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

export interface PaymentVerifiedPayload extends Record<string, unknown> {
  tenantId: string;
  paymentId: string;
  invoiceId: string;
  studentId: string;
  termId: string;
  amountMinor: number;
  channel: string;
  verifiedAt: string;
  verifiedById: string | null;
}

export interface PaymentWebhookReceivedPayload extends Record<string, unknown> {
  webhookEventId: string;
  provider: string;
  providerEventId: string;
  tenantId: string | null;
  paymentId: string | null;
  gatewayReference: string | null;
}

export interface RefundApprovedPayload extends Record<string, unknown> {
  tenantId: string;
  refundId: string;
  paymentId: string;
  invoiceId: string;
  studentId: string;
  termId: string;
  amountMinor: number;
  reasonCode: string;
  psfTreatment: string;
  approvedById: string;
  executedAt: string;
}

export interface PsfReversalApprovedPayload extends Record<string, unknown> {
  tenantId: string;
  refundId: string;
  paymentId: string;
  termId: string;
  reasonCode: string;
  approvedById: string;
  workflowInstanceId: string;
}
