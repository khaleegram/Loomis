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

/** Filter outstanding balances by class level and/or payment status. */
export const outstandingBalancesQuery = z.object({
  classLevelId: z.string().uuid().optional(),
  status: invoiceStatus.optional(),
});
export type OutstandingBalancesQuery = z.infer<typeof outstandingBalancesQuery>;

export const outstandingBalanceRow = z.object({
  invoiceId: z.string().uuid(),
  studentId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  status: invoiceStatus,
  amountChargedMinor: koboAmount,
  amountPaidMinor: koboAmount,
  balanceMinor: koboAmount,
});
export type OutstandingBalanceRow = z.infer<typeof outstandingBalanceRow>;

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
