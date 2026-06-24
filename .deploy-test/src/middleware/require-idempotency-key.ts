import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoomisError } from '../shared/errors.js';

/**
 * Enforces presence of the `Idempotency-Key` header on financial and workflow
 * writes (loomis-api, loomis-financial-integrity, CON-012). Rejects with 422 if
 * absent. The key is stashed on the request for downstream dedupe.
 *
 * NOTE — full duplicate suppression (IdempotencyService.wrap: store the result in
 * Redis for 24h and return the cached result on replay) lands with the Finance
 * module that performs the real money writes. This middleware enforces the
 * required contract (presence) now; it does not yet dedupe. Do NOT treat the
 * presence check as full idempotency once real financial writes exist.
 */
export async function requireIdempotencyKey(
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = req.headers['idempotency-key'];
  const key = Array.isArray(header) ? header[0] : header;
  if (!key || key.trim().length === 0) {
    throw new LoomisError(
      'IDEMPOTENCY_KEY_REQUIRED',
      422,
      'Idempotency-Key header is required for this operation',
    );
  }
  req.idempotencyKey = key;
}
