import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../../shared/http.js';
import { adjustmentService } from '../services/adjustment.service.js';
import { requireActor } from '../../academic/handlers/_context.js';

export async function listPendingBillingAdjustmentsHandler(
  _req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const requests = await adjustmentService.listPending();
  return sendSuccess(reply, { requests });
}

export async function approveBillingAdjustmentHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await adjustmentService.approve(req.params.id, requireActor(req));
  return sendSuccess(reply, result);
}

export async function rejectBillingAdjustmentHandler(
  req: FastifyRequest<{ Params: { id: string }; Body: { rejectionReason: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const result = await adjustmentService.reject(
    req.params.id,
    req.body.rejectionReason,
    requireActor(req),
  );
  return sendSuccess(reply, result);
}
