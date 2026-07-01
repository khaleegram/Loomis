import { z } from 'zod';
import { calendarDate } from '../academic/academic.schema.js';

/**
 * Finance module contracts (SRS §4.6 FR-FIN-001/004; US-FIN-001, US-FIN-005).
 * Shared by API request/response validation and the web/mobile clients.
 *
 * Money rule (loomis-financial-integrity / loomis-frontend): every amount is an
 * integer number of kobo (minor NGN units). The client enters Naira and converts
 * to kobo before sending; never transmit floats.
 */

/** A non-negative integer amount in kobo. */
export const koboAmount = z
  .number()
  .int('Amount must be a whole number of kobo')
  .nonnegative('Amount cannot be negative');

/** A strictly-positive integer amount in kobo (used for individual fee items). */
export const positiveKoboAmount = z
  .number()
  .int('Amount must be a whole number of kobo')
  .positive('Amount must be greater than zero');

/** Fee item categories (US-FIN-001: tuition, development levy, uniform, …). */
export const feeItemCategory = z.enum([
  'tuition',
  'development_levy',
  'uniform',
  'books',
  'materials',
  'exam',
  'transport',
  'feeding',
  'technology',
  'boarding',
  'other',
]);
export type FeeItemCategory = z.infer<typeof feeItemCategory>;

// ── Fee structure ────────────────────────────────────────────────────────────

export const feeStructureStatus = z.enum(['draft', 'active', 'superseded']);
export type FeeStructureStatus = z.infer<typeof feeStructureStatus>;

/** A single named fee line item with an amount in kobo. */
export const feeItemInput = z.object({
  name: z.string().min(1).max(120),
  category: feeItemCategory,
  amountMinor: positiveKoboAmount,
});
export type FeeItemInput = z.infer<typeof feeItemInput>;

const feeItemList = z
  .array(feeItemInput)
  .min(1, 'A fee structure must have at least one fee item')
  .max(50, 'A fee structure cannot have more than 50 fee items');

/** FR-FIN-001 / US-FIN-001. Create a fee structure for one class level + term. */
export const createFeeStructureRequest = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  items: feeItemList,
});
export type CreateFeeStructureRequest = z.infer<typeof createFeeStructureRequest>;

/** Replace the items of a draft (pre-term-open) fee structure. */
export const updateFeeStructureRequest = z.object({
  items: feeItemList,
});
export type UpdateFeeStructureRequest = z.infer<typeof updateFeeStructureRequest>;

/**
 * Amend a fee structure AFTER its term has opened (US-FIN-001). This does not
 * apply immediately — it routes through the Workflow module for Principal
 * approval. A justification is required and logged.
 */
export const amendFeeStructureRequest = z.object({
  items: feeItemList,
  justification: z.string().min(10).max(500),
});
export type AmendFeeStructureRequest = z.infer<typeof amendFeeStructureRequest>;

export const feeItemResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: feeItemCategory,
  amountMinor: koboAmount,
});
export type FeeItemResponse = z.infer<typeof feeItemResponse>;

export const feeStructureResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  termId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  status: feeStructureStatus,
  version: z.number().int(),
  totalAmountMinor: koboAmount,
  items: z.array(feeItemResponse),
  createdById: z.string().uuid(),
  lastAmendedById: z.string().uuid().nullable(),
  lastAmendmentWorkflowId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FeeStructureResponse = z.infer<typeof feeStructureResponse>;

export const feeStructureListResponse = z.object({
  feeStructures: z.array(feeStructureResponse),
});
export type FeeStructureListResponse = z.infer<typeof feeStructureListResponse>;

/** Returned when an amendment is routed to Workflow for Principal approval. */
export const feeStructureAmendmentResponse = z.object({
  feeStructureId: z.string().uuid(),
  workflowInstanceId: z.string().uuid(),
  status: z.literal('pending'),
});
export type FeeStructureAmendmentResponse = z.infer<typeof feeStructureAmendmentResponse>;

// ── Invoices ─────────────────────────────────────────────────────────────────

export const invoiceStatus = z.enum(['draft', 'issued', 'partially_paid', 'paid', 'void']);
export type InvoiceStatus = z.infer<typeof invoiceStatus>;

/**
 * Issue a single invoice for a student for a term. The line items and amount are
 * taken from the active fee structure for the student's class level — the caller
 * supplies the student/class context (which the enrollment UI already has).
 */
export const issueInvoiceRequest = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  studentId: z.string().uuid(),
  enrollmentId: z.string().uuid().nullable().optional(),
  dueDate: calendarDate.optional(),
});
export type IssueInvoiceRequest = z.infer<typeof issueInvoiceRequest>;

/** Batch-issue invoices for many students of a term in one call. */
export const batchIssueInvoicesRequest = z.object({
  academicYearId: z.string().uuid(),
  termId: z.string().uuid(),
  dueDate: calendarDate.optional(),
  students: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        classLevelId: z.string().uuid(),
        enrollmentId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1)
    .max(500),
});
export type BatchIssueInvoicesRequest = z.infer<typeof batchIssueInvoicesRequest>;

export const invoiceItemResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: feeItemCategory,
  amountMinor: koboAmount,
});
export type InvoiceItemResponse = z.infer<typeof invoiceItemResponse>;

export const invoiceResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  termId: z.string().uuid(),
  studentId: z.string().uuid(),
  enrollmentId: z.string().uuid().nullable(),
  classLevelId: z.string().uuid(),
  feeStructureId: z.string().uuid(),
  status: invoiceStatus,
  amountChargedMinor: koboAmount,
  amountPaidMinor: koboAmount,
  balanceMinor: koboAmount,
  dueDate: calendarDate.nullable(),
  issuedById: z.string().uuid(),
  issuedAt: z.string().datetime(),
  items: z.array(invoiceItemResponse),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type InvoiceResponse = z.infer<typeof invoiceResponse>;

export const invoiceListResponse = z.object({
  invoices: z.array(invoiceResponse),
});
export type InvoiceListResponse = z.infer<typeof invoiceListResponse>;

export const batchIssueInvoicesResponse = z.object({
  issued: z.number().int(),
  skipped: z.number().int(),
  invoices: z.array(invoiceResponse),
});
export type BatchIssueInvoicesResponse = z.infer<typeof batchIssueInvoicesResponse>;

// ── Outstanding balances (US-FIN-005) ─────────────────────────────────────────

/** Lens for the outstanding balances list (US-FIN-005). */
export const outstandingBalanceScope = z.enum(['term', 'arrears', 'all']);
export type OutstandingBalanceScope = z.infer<typeof outstandingBalanceScope>;

/** Filter outstanding balances by class level, payment status, and scope. */
export const outstandingBalancesQuery = z.object({
  classLevelId: z.string().uuid().optional(),
  status: invoiceStatus.optional(),
  scope: outstandingBalanceScope.optional(),
});
export type OutstandingBalancesQuery = z.infer<typeof outstandingBalancesQuery>;

export const outstandingBalanceRow = z.object({
  invoiceId: z.string().uuid().nullable(),
  studentId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  status: invoiceStatus.nullable(),
  amountChargedMinor: koboAmount,
  amountPaidMinor: koboAmount,
  balanceMinor: koboAmount,
  termBalanceMinor: koboAmount.optional(),
  arrearsBalanceMinor: koboAmount.optional(),
  totalBalanceMinor: koboAmount.optional(),
});
export type OutstandingBalanceRow = z.infer<typeof outstandingBalanceRow>;

export const sendFeeReminderResponse = z.object({
  studentId: z.string().uuid(),
  remindedParentCount: z.number().int(),
});
export type SendFeeReminderResponse = z.infer<typeof sendFeeReminderResponse>;

export const bulkFeeReminderRequest = z.object({
  studentIds: z.array(z.string().uuid()).min(1).max(100),
});
export type BulkFeeReminderRequest = z.infer<typeof bulkFeeReminderRequest>;

export const bulkFeeReminderResponse = z.object({
  remindedStudentCount: z.number().int(),
  remindedParentCount: z.number().int(),
});
export type BulkFeeReminderResponse = z.infer<typeof bulkFeeReminderResponse>;

export const FEE_REMINDER_PRESET_CONFIG_KEY = 'finance.fee_reminder_preset';

export const feeReminderPreset = z.enum(['standard', 'due_date_only', 'minimal']);
export type FeeReminderPreset = z.infer<typeof feeReminderPreset>;

export const feeReminderSettingsResponse = z.object({
  preset: feeReminderPreset,
});
export type FeeReminderSettingsResponse = z.infer<typeof feeReminderSettingsResponse>;

export const updateFeeReminderSettingsRequest = z.object({
  preset: feeReminderPreset,
});
export type UpdateFeeReminderSettingsRequest = z.infer<typeof updateFeeReminderSettingsRequest>;

export const outstandingBalancesResponse = z.object({
  termId: z.string().uuid(),
  summary: z.object({
    studentCount: z.number().int(),
    totalChargedMinor: koboAmount,
    totalPaidMinor: koboAmount,
    totalBalanceMinor: koboAmount,
  }),
  rows: z.array(outstandingBalanceRow),
});
export type OutstandingBalancesResponse = z.infer<typeof outstandingBalancesResponse>;

// ── Payments (US-FIN-002..004) ───────────────────────────────────────────────

export const paymentChannel = z.enum(['offline', 'online']);
export type PaymentChannel = z.infer<typeof paymentChannel>;

export const offlinePaymentMethod = z.enum(['cash', 'bank_transfer', 'pos']);
export type OfflinePaymentMethod = z.infer<typeof offlinePaymentMethod>;

export const onlinePaymentMethod = z.enum(['card', 'bank_transfer', 'ussd']);
export type OnlinePaymentMethod = z.infer<typeof onlinePaymentMethod>;

export const paymentGatewayProvider = z.enum(['paystack', 'nomba']);
export type PaymentGatewayProvider = z.infer<typeof paymentGatewayProvider>;

export const paymentStatus = z.enum([
  'pending_verification',
  'pending',
  'verified',
  'failed',
  'cancelled',
]);
export type PaymentStatus = z.infer<typeof paymentStatus>;

export const receiptStatus = z.enum(['provisional', 'final']);
export type ReceiptStatus = z.infer<typeof receiptStatus>;

/** US-FIN-002. Cashier logs an offline payment against an invoice. */
export const logOfflinePaymentRequest = z.object({
  invoiceId: z.string().uuid(),
  amountMinor: positiveKoboAmount,
  method: offlinePaymentMethod,
  paymentDate: calendarDate,
  channelReference: z.string().min(1).max(120).optional(),
  evidenceStorageObjectId: z.string().uuid().optional(),
});
export type LogOfflinePaymentRequest = z.infer<typeof logOfflinePaymentRequest>;

/** US-FIN-003. Accountant verifies a pending offline payment. */
export const verifyOfflinePaymentRequest = z.object({
  notes: z.string().max(500).optional(),
});
export type VerifyOfflinePaymentRequest = z.infer<typeof verifyOfflinePaymentRequest>;

/** US-FIN-004. Parent initiates an online payment via a gateway. */
export const paymentClientPlatform = z.enum(['web', 'mobile']);
export type PaymentClientPlatform = z.infer<typeof paymentClientPlatform>;

export const initializeOnlinePaymentRequest = z
  .object({
    invoiceId: z.string().uuid().optional(),
    /** Required when paying total owed without a single-term invoice. */
    studentId: z.string().uuid().optional(),
    /** Apply payment oldest-invoice-first across all open balances for the student. */
    payAllOwed: z.boolean().optional(),
    /** Allow amount above total owed; surplus is stored as pay-ahead credit. */
    payAhead: z.boolean().optional(),
    amountMinor: positiveKoboAmount,
    /** Only Paystack is supported; field kept for forward-compatible clients. */
    provider: paymentGatewayProvider.default('paystack'),
    method: onlinePaymentMethod.default('card'),
    payerEmail: z.string().email(),
    /** Selects redirect URL after Paystack checkout (web vs mobile deep link). */
    clientPlatform: paymentClientPlatform.default('web'),
  })
  .superRefine((data, ctx) => {
    if (!data.invoiceId && !(data.studentId && data.payAllOwed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide invoiceId, or studentId with payAllOwed',
        path: ['invoiceId'],
      });
    }
  });
export type InitializeOnlinePaymentRequest = z.infer<typeof initializeOnlinePaymentRequest>;

export const paymentGatewayConfigResponse = z.object({
  provider: paymentGatewayProvider,
  publicKey: z.string().nullable(),
  onlinePaymentEnabled: z.boolean(),
  virtualAccountEnabled: z.boolean().optional(),
});
export type PaymentGatewayConfigResponse = z.infer<typeof paymentGatewayConfigResponse>;

export const receiptLineItemResponse = z.object({
  name: z.string(),
  category: feeItemCategory,
  amountMinor: koboAmount,
});
export type ReceiptLineItemResponse = z.infer<typeof receiptLineItemResponse>;

export const receiptResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid(),
  termId: z.string().uuid(),
  sequenceNumber: z.number().int(),
  status: receiptStatus,
  amountMinor: koboAmount,
  lineItems: z.array(receiptLineItemResponse),
  issuedById: z.string().uuid(),
  issuedAt: z.string().datetime(),
  finalizedAt: z.string().datetime().nullable(),
});
export type ReceiptResponse = z.infer<typeof receiptResponse>;

export const paymentResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  termId: z.string().uuid(),
  studentId: z.string().uuid(),
  channel: paymentChannel,
  method: z.string(),
  amountMinor: koboAmount,
  status: paymentStatus,
  loggedById: z.string().uuid(),
  verifiedById: z.string().uuid().nullable(),
  verifiedAt: z.string().datetime().nullable(),
  paymentDate: calendarDate,
  channelReference: z.string().nullable(),
  evidenceStorageObjectId: z.string().uuid().nullable(),
  gatewayProvider: paymentGatewayProvider.nullable(),
  gatewayReference: z.string().nullable(),
  gatewayAuthorizationUrl: z.string().nullable(),
  receipt: receiptResponse.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PaymentResponse = z.infer<typeof paymentResponse>;

export const paymentListResponse = z.object({
  payments: z.array(paymentResponse),
});
export type PaymentListResponse = z.infer<typeof paymentListResponse>;

export const initializeOnlinePaymentResponse = z.object({
  payment: paymentResponse,
  authorizationUrl: z.string().url(),
});
export type InitializeOnlinePaymentResponse = z.infer<typeof initializeOnlinePaymentResponse>;

export const paymentsQuery = z.object({
  termId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: paymentStatus.optional(),
  channel: paymentChannel.optional(),
});
export type PaymentsQuery = z.infer<typeof paymentsQuery>;

// ── Parent portal fee status (US-PAR-004) ────────────────────────────────────

export const parentFeesQuery = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
});
export type ParentFeesQuery = z.infer<typeof parentFeesQuery>;

export const parentFeeLineItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: feeItemCategory,
  amountMinor: koboAmount,
  paidMinor: koboAmount,
  balanceMinor: koboAmount,
});
export type ParentFeeLineItem = z.infer<typeof parentFeeLineItem>;

export const parentFeeStatusResponse = z.object({
  termId: z.string().uuid(),
  studentId: z.string().uuid(),
  classArmLabel: z.string().nullable(),
  invoiceId: z.string().uuid().nullable(),
  status: invoiceStatus.nullable(),
  amountChargedMinor: koboAmount,
  amountPaidMinor: koboAmount,
  /** Balance for the selected term invoice. */
  balanceMinor: koboAmount,
  /** Unpaid balance from terms before the selected term. */
  arrearsBalanceMinor: koboAmount,
  /** Term balance + arrears — what the family owes in total. */
  totalBalanceMinor: koboAmount,
  /** Oldest open invoice — use for single-term pay; omit when payAllOwed. */
  primaryInvoiceId: z.string().uuid().nullable(),
  /** Prepaid surplus from pay-ahead payments; auto-applies to new invoices. */
  creditBalanceMinor: koboAmount,
  dueDate: calendarDate.nullable(),
  lineItems: z.array(parentFeeLineItem),
  onlinePaymentEnabled: z.boolean(),
  /** Nomba dedicated virtual account for bank transfer (when configured). */
  virtualAccountEnabled: z.boolean(),
  virtualAccount: z
    .object({
      accountNumber: z.string(),
      bankName: z.string(),
      accountName: z.string(),
      accountRef: z.string(),
    })
    .nullable(),
  /** True when HACKATHON_DEMO_RESET_ENABLED — shows sandbox reset control on parent fees. */
  hackathonDemoResetEnabled: z.boolean().optional(),
});
export type ParentFeeStatusResponse = z.infer<typeof parentFeeStatusResponse>;

export const hackathonDemoResetResponse = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amountChargedMinor: koboAmount,
  amountPaidMinor: koboAmount,
  balanceMinor: koboAmount,
  creditBalanceMinor: koboAmount,
});
export type HackathonDemoResetResponse = z.infer<typeof hackathonDemoResetResponse>;

export const parentStudentVirtualAccountQuery = z.object({
  studentId: z.string().uuid(),
});
export type ParentStudentVirtualAccountQuery = z.infer<typeof parentStudentVirtualAccountQuery>;

export const studentVirtualAccountResponse = z.object({
  studentId: z.string().uuid(),
  accountNumber: z.string(),
  bankName: z.string(),
  accountName: z.string(),
  accountRef: z.string(),
  provider: z.literal('nomba'),
});
export type StudentVirtualAccountResponse = z.infer<typeof studentVirtualAccountResponse>;

/** US-PAR-004. Parent views payment history for a linked child in a term. */
export const parentPaymentsQuery = parentFeesQuery;
export type ParentPaymentsQuery = z.infer<typeof parentPaymentsQuery>;

export const parentPaymentsListResponse = z.object({
  payments: z.array(paymentResponse),
});
export type ParentPaymentsListResponse = z.infer<typeof parentPaymentsListResponse>;

// ── Refunds (US-FIN-006 / FR-FIN-007) ────────────────────────────────────────

export const refundReasonCode = z.enum([
  'duplicate',
  'overpayment',
  'student_withdrawal',
  'service_failure',
  'chargeback',
  'platform_error',
  'legal_compulsion',
]);
export type RefundReasonCode = z.infer<typeof refundReasonCode>;

/** PSF reversal is permitted only for these reason codes (loomis-financial-integrity). */
export const PSF_REVERSAL_ELIGIBLE_REASONS: RefundReasonCode[] = [
  'duplicate',
  'platform_error',
  'chargeback',
  'legal_compulsion',
];

export const refundPsfTreatment = z.enum(['not_reversed', 'reversal_pending', 'reversed']);
export type RefundPsfTreatment = z.infer<typeof refundPsfTreatment>;

export const refundRequestStatus = z.enum([
  'pending',
  'approved',
  'rejected',
  'executed',
  'cancelled',
]);
export type RefundRequestStatus = z.infer<typeof refundRequestStatus>;

/** US-FIN-006. Cashier initiates a refund against a verified payment. */
export const createRefundRequest = z.object({
  paymentId: z.string().uuid(),
  amountMinor: positiveKoboAmount,
  reasonCode: refundReasonCode,
  reasonNotes: z.string().min(10).max(1000),
});
export type CreateRefundRequest = z.infer<typeof createRefundRequest>;

export const refundRequestResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  termId: z.string().uuid(),
  studentId: z.string().uuid(),
  amountMinor: koboAmount,
  reasonCode: refundReasonCode,
  reasonNotes: z.string().nullable(),
  psfTreatment: refundPsfTreatment,
  status: refundRequestStatus,
  workflowInstanceId: z.string().uuid(),
  psfReversalWorkflowId: z.string().uuid().nullable(),
  requestedById: z.string().uuid(),
  approvedById: z.string().uuid().nullable(),
  executedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RefundRequestResponse = z.infer<typeof refundRequestResponse>;

export const refundRequestListResponse = z.object({
  refunds: z.array(refundRequestResponse),
});
export type RefundRequestListResponse = z.infer<typeof refundRequestListResponse>;

/** Returned when a refund request is routed to Workflow for approval. */
export const createRefundResponse = z.object({
  refund: refundRequestResponse,
  workflowInstanceId: z.string().uuid(),
  status: z.literal('pending'),
});
export type CreateRefundResponse = z.infer<typeof createRefundResponse>;

/** Request platform PSF reversal for an executed refund (dual platform approval). */
export const requestPsfReversalRequest = z.object({
  justification: z.string().min(10).max(500),
});
export type RequestPsfReversalRequest = z.infer<typeof requestPsfReversalRequest>;

export const psfReversalResponse = z.object({
  refundId: z.string().uuid(),
  psfReversalWorkflowId: z.string().uuid(),
  status: z.literal('reversal_pending'),
});
export type PsfReversalResponse = z.infer<typeof psfReversalResponse>;

export const refundsQuery = z.object({
  termId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
  status: refundRequestStatus.optional(),
});
export type RefundsQuery = z.infer<typeof refundsQuery>;

// ── Reconciliation (US-FIN-007 / SRS §10.1) ──────────────────────────────────

export const reconciliationExceptionType = z.enum([
  'gateway_only',
  'platform_only',
  'amount_mismatch',
]);
export type ReconciliationExceptionType = z.infer<typeof reconciliationExceptionType>;

export const reconciliationExceptionStatus = z.enum(['open', 'resolved', 'ignored']);
export type ReconciliationExceptionStatus = z.infer<typeof reconciliationExceptionStatus>;

export const reconciliationExceptionResponse = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid().nullable(),
  provider: paymentGatewayProvider,
  exceptionType: reconciliationExceptionType,
  gatewayReference: z.string().nullable(),
  paymentId: z.string().uuid().nullable(),
  gatewayAmountMinor: koboAmount.nullable(),
  platformAmountMinor: koboAmount.nullable(),
  settlementDate: calendarDate,
  reconciliationRunId: z.string().uuid(),
  status: reconciliationExceptionStatus,
  resolutionNotes: z.string().nullable(),
  resolvedById: z.string().uuid().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ReconciliationExceptionResponse = z.infer<typeof reconciliationExceptionResponse>;

export const reconciliationExceptionListResponse = z.object({
  exceptions: z.array(reconciliationExceptionResponse),
});
export type ReconciliationExceptionListResponse = z.infer<
  typeof reconciliationExceptionListResponse
>;

export const resolveReconciliationExceptionRequest = z.object({
  status: z.enum(['resolved', 'ignored']),
  resolutionNotes: z.string().min(10).max(1000),
});
export type ResolveReconciliationExceptionRequest = z.infer<
  typeof resolveReconciliationExceptionRequest
>;

export const reconciliationExceptionsQuery = z.object({
  status: reconciliationExceptionStatus.optional(),
  provider: paymentGatewayProvider.optional(),
});
export type ReconciliationExceptionsQuery = z.infer<typeof reconciliationExceptionsQuery>;

export const runReconciliationResponse = z.object({
  runId: z.string().uuid(),
  exceptionsCreated: z.number().int(),
  settlementDate: calendarDate,
});
export type RunReconciliationResponse = z.infer<typeof runReconciliationResponse>;
