import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AmendFeeStructureRequest,
  BatchIssueInvoicesRequest,
  BulkFeeReminderRequest,
  CreateFeeStructureRequest,
  InitializeOnlinePaymentRequest,
  IssueInvoiceRequest,
  LogOfflinePaymentRequest,
  OutstandingBalancesQuery,
  PaymentsQuery,
  UpdateFeeReminderSettingsRequest,
  UpdateFeeStructureRequest,
  VerifyOfflinePaymentRequest,
} from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { getEnv } from '../../../config/env.js';
import { sendSuccess } from '../../../shared/http.js';
import { feeStructureService, feeReminderService, feeReminderSettingsService, invoiceService, paymentService } from '../services/index.js';
import { auditContext, requireParentActor, requireSchoolFinanceActor, requireTenantActor } from './_context.js';
import {
  feeStructureToResponse,
  invoiceToResponse,
  outstandingBalancesToResponse,
  paymentToResponse,
} from './_serializers.js';

interface TenantParams {
  tenantId: string;
}
interface FeeStructureParams extends TenantParams {
  feeStructureId: string;
}
interface TermParams extends TenantParams {
  termId: string;
}
interface InvoiceParams extends TenantParams {
  invoiceId: string;
}
interface PaymentParams extends TenantParams {
  paymentId: string;
}

// ── Fee structures ────────────────────────────────────────────────────────────

export async function createFeeStructureHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateFeeStructureRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await feeStructureService.createFeeStructure(
    req.params.tenantId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
  );
  return sendSuccess(reply, feeStructureToResponse(result), 201);
}

export async function listFeeStructuresHandler(
  req: FastifyRequest<{ Params: TermParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const results = await feeStructureService.listFeeStructures(
    req.params.tenantId,
    req.params.termId,
    requireTenantActor(req),
  );
  return sendSuccess(reply, { feeStructures: results.map(feeStructureToResponse) });
}

export async function getFeeStructureHandler(
  req: FastifyRequest<{ Params: FeeStructureParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await feeStructureService.getFeeStructure(
    req.params.tenantId,
    req.params.feeStructureId,
    requireTenantActor(req),
  );
  return sendSuccess(reply, feeStructureToResponse(result));
}

export async function updateFeeStructureHandler(
  req: FastifyRequest<{ Params: FeeStructureParams; Body: UpdateFeeStructureRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await feeStructureService.updateFeeStructure(
    req.params.tenantId,
    req.params.feeStructureId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
  );
  return sendSuccess(reply, feeStructureToResponse(result));
}

export async function amendFeeStructureHandler(
  req: FastifyRequest<{ Params: FeeStructureParams; Body: AmendFeeStructureRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await feeStructureService.requestAmendment(
    req.params.tenantId,
    req.params.feeStructureId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
  );
  return sendSuccess(reply, result, 202);
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export async function issueInvoiceHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: IssueInvoiceRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await invoiceService.issueInvoice(
    req.params.tenantId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
  );
  return sendSuccess(reply, invoiceToResponse(result), 201);
}

export async function batchIssueInvoicesHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: BatchIssueInvoicesRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await invoiceService.batchIssueInvoices(
    req.params.tenantId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
  );
  return sendSuccess(
    reply,
    {
      issued: result.issued,
      skipped: result.skipped,
      invoices: result.invoices.map(invoiceToResponse),
    },
    201,
  );
}

export async function listInvoicesHandler(
  req: FastifyRequest<{ Params: TermParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const results = await invoiceService.listInvoices(
    req.params.tenantId,
    req.params.termId,
    requireTenantActor(req),
  );
  return sendSuccess(reply, { invoices: results.map(invoiceToResponse) });
}

export async function getInvoiceHandler(
  req: FastifyRequest<{ Params: InvoiceParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await invoiceService.getInvoice(
    req.params.tenantId,
    req.params.invoiceId,
    requireTenantActor(req),
  );
  return sendSuccess(reply, invoiceToResponse(result));
}

export async function outstandingBalancesHandler(
  req: FastifyRequest<{ Params: TermParams; Querystring: OutstandingBalancesQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await invoiceService.getOutstandingBalances(
    req.params.tenantId,
    req.params.termId,
    req.query,
    requireTenantActor(req),
  );
  return sendSuccess(reply, outstandingBalancesToResponse(result));
}

// ── Payments ──────────────────────────────────────────────────────────────────

function requireIdempotencyKey(req: FastifyRequest): string {
  const key = req.idempotencyKey;
  if (!key) {
    throw new LoomisError('IDEMPOTENCY_KEY_REQUIRED', 422, 'Idempotency-Key header is required');
  }
  return key;
}

export async function logOfflinePaymentHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: LogOfflinePaymentRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await paymentService.logOfflinePayment(
    req.params.tenantId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
    requireIdempotencyKey(req),
  );
  return sendSuccess(reply, paymentToResponse(result), 201);
}

export async function verifyOfflinePaymentHandler(
  req: FastifyRequest<{ Params: PaymentParams; Body: VerifyOfflinePaymentRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await paymentService.verifyOfflinePayment(
    req.params.tenantId,
    req.params.paymentId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
    requireIdempotencyKey(req),
  );
  return sendSuccess(reply, paymentToResponse(result));
}

export async function initializeOnlinePaymentHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: InitializeOnlinePaymentRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await paymentService.initializeOnlinePayment(
    req.params.tenantId,
    req.body,
    requireParentActor(req, req.params.tenantId),
    auditContext(req),
    requireIdempotencyKey(req),
  );
  return sendSuccess(reply, {
    payment: paymentToResponse({ payment: result.payment, receipt: null }),
    authorizationUrl: result.authorizationUrl,
  }, 201);
}

export async function listPaymentsHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: PaymentsQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const results = await paymentService.listPayments(
    req.params.tenantId,
    req.query,
    requireTenantActor(req),
  );
  return sendSuccess(reply, { payments: results.map(paymentToResponse) });
}

export async function getPaymentHandler(
  req: FastifyRequest<{ Params: PaymentParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await paymentService.getPayment(
    req.params.tenantId,
    req.params.paymentId,
    requireSchoolFinanceActor(req, req.params.tenantId),
  );
  return sendSuccess(reply, paymentToResponse(result));
}

export async function confirmOnlinePaymentHandler(
  req: FastifyRequest<{ Params: PaymentParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await paymentService.confirmOnlinePayment(
    req.params.tenantId,
    req.params.paymentId,
    requireParentActor(req, req.params.tenantId),
  );
  return sendSuccess(reply, paymentToResponse(result));
}

export async function getPaymentGatewayConfigHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const env = getEnv();
  return sendSuccess(reply, {
    provider: 'paystack' as const,
    publicKey: env.PAYSTACK_PUBLIC_KEY ?? null,
    onlinePaymentEnabled: Boolean(env.PAYSTACK_SECRET_KEY),
  });
}

export async function sendFeeReminderHandler(
  req: FastifyRequest<{ Params: { tenantId: string; studentId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await feeReminderService.remindStudentNow(
    req.params.tenantId,
    req.params.studentId,
    requireTenantActor(req),
  );
  return sendSuccess(reply, {
    studentId: req.params.studentId,
    remindedParentCount: result.remindedParentCount,
  });
}

export async function bulkFeeReminderHandler(
  req: FastifyRequest<{ Params: { tenantId: string }; Body: BulkFeeReminderRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await feeReminderService.remindStudentsBulk(
    req.params.tenantId,
    req.body.studentIds,
    requireTenantActor(req),
  );
  return sendSuccess(reply, result);
}

export async function getFeeReminderSettingsHandler(
  req: FastifyRequest<{ Params: { tenantId: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await feeReminderSettingsService.getSettings(req.params.tenantId);
  return sendSuccess(reply, result);
}

export async function updateFeeReminderSettingsHandler(
  req: FastifyRequest<{ Params: { tenantId: string }; Body: UpdateFeeReminderSettingsRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await feeReminderSettingsService.updateSettings(req.params.tenantId, req.body);
  return sendSuccess(reply, result);
}
