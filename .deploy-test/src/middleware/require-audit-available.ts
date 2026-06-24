import type { FastifyReply, FastifyRequest } from 'fastify';
import { assertAuditAvailable } from '../shared/audit.js';

/**
 * Fail-closed gate for financial and other sensitive writes (loomis-financial-integrity).
 * Returns 503 when the audit trail is unreachable so mutations cannot proceed unaudited.
 */
export async function requireAuditAvailable(
  _req: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  await assertAuditAvailable();
}
