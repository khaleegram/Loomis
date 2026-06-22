import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendSuccess } from '../../../shared/http.js';
import { attestationService } from '../services/attestation.service.js';
import { requireActor } from './_context.js';

export async function listAttestationsHandler(
  req: FastifyRequest<{ Params: { tenantId: string }; Querystring: { limit?: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const actor = requireActor(req);
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await attestationService.listAttestations(
    req.params.tenantId,
    actor,
    limit,
  );
  return sendSuccess(reply, result);
}
