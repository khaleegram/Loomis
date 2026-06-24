import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RevokeSessionRequest } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import { sessionService } from '../services/session.service.js';

/** GET /identity/sessions — list the caller's active sessions (US-HRM-008). */
export async function listSessionsHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  const sessions = await sessionService.listActiveSessionsForUser(user.sub, user.sessionId);
  return sendSuccess(reply, { sessions });
}

/** POST /identity/sessions/revoke — revoke one of the caller's sessions. */
export async function revokeSessionHandler(
  req: FastifyRequest<{ Body: RevokeSessionRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  await sessionService.revokeSessionForUser(user.sub, req.body.sessionId);
  return sendSuccess(reply, { revoked: true });
}
