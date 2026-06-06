import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AmendFeeStructureRequest,
  BatchIssueInvoicesRequest,
  CreateFeeStructureRequest,
  IssueInvoiceRequest,
  OutstandingBalancesQuery,
  UpdateFeeStructureRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { feeStructureService, invoiceService } from '../services/index.js';
import { auditContext, requireTenantActor } from './_context.js';
import {
  feeStructureToResponse,
  invoiceToResponse,
  outstandingBalancesToResponse,
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
