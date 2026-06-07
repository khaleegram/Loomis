import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CreateRefundRequest,
  ReconciliationExceptionsQuery,
  RefundsQuery,
  RequestPsfReversalRequest,
  ResolveReconciliationExceptionRequest,
} from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { refundService, reconciliationService } from '../services/index.js';
import { auditContext, requireTenantActor } from './_context.js';
import {
  reconciliationExceptionToResponse,
  refundToResponse,
} from './_refund_serializers.js';

interface TenantParams {
  tenantId: string;
}
interface RefundParams extends TenantParams {
  refundId: string;
}
interface ExceptionParams extends TenantParams {
  exceptionId: string;
}

export async function createRefundHandler(
  req: FastifyRequest<{ Params: TenantParams; Body: CreateRefundRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await refundService.initiateRefund(
    req.params.tenantId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
    req.idempotencyKey!,
  );
  return sendSuccess(
    reply,
    {
      refund: refundToResponse(result.refund),
      workflowInstanceId: result.workflowInstanceId,
      status: 'pending' as const,
    },
    201,
  );
}

export async function listRefundsHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: RefundsQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const refunds = await refundService.listRefunds(
    req.params.tenantId,
    req.query,
    requireTenantActor(req),
  );
  return sendSuccess(reply, { refunds: refunds.map(refundToResponse) });
}

export async function getRefundHandler(
  req: FastifyRequest<{ Params: RefundParams }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const refund = await refundService.getRefund(
    req.params.tenantId,
    req.params.refundId,
    requireTenantActor(req),
  );
  return sendSuccess(reply, refundToResponse(refund));
}

export async function requestPsfReversalHandler(
  req: FastifyRequest<{ Params: RefundParams; Body: RequestPsfReversalRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await refundService.requestPsfReversal(
    req.params.tenantId,
    req.params.refundId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
    req.idempotencyKey!,
  );
  return sendSuccess(reply, {
    refundId: req.params.refundId,
    psfReversalWorkflowId: result.psfReversalWorkflowId,
    status: 'reversal_pending' as const,
  });
}

export async function listReconciliationExceptionsHandler(
  req: FastifyRequest<{ Params: TenantParams; Querystring: ReconciliationExceptionsQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const exceptions = await reconciliationService.listExceptions(
    req.params.tenantId,
    req.query,
    requireTenantActor(req),
  );
  return sendSuccess(reply, { exceptions: exceptions.map(reconciliationExceptionToResponse) });
}

export async function resolveReconciliationExceptionHandler(
  req: FastifyRequest<{ Params: ExceptionParams; Body: ResolveReconciliationExceptionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const resolved = await reconciliationService.resolveException(
    req.params.tenantId,
    req.params.exceptionId,
    req.body,
    requireTenantActor(req),
    auditContext(req),
  );
  return sendSuccess(reply, reconciliationExceptionToResponse(resolved));
}

export async function listPlatformReconciliationExceptionsHandler(
  req: FastifyRequest<{ Querystring: ReconciliationExceptionsQuery }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const exceptions = await reconciliationService.listExceptions(
    null,
    req.query,
    requireTenantActor(req),
  );
  return sendSuccess(reply, { exceptions: exceptions.map(reconciliationExceptionToResponse) });
}

export async function runReconciliationHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await reconciliationService.runGatewayReconciliation();
  return sendSuccess(reply, result);
}
