import type { FastifyReply, FastifyRequest } from 'fastify';
import type { StepUpRequest } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import { authService } from '../services/auth.service.js';

/** POST /auth/stepup — requires authentication. Issues a step-up proof token. */
export async function stepUpHandler(
  req: FastifyRequest<{ Body: StepUpRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  const { action, code, refundAmountMinor } = req.body;
  const { mfaToken, expiresAt } = await authService.stepUp(user.sub, action, code, {
    ...(refundAmountMinor !== undefined ? { refundAmountMinor } : {}),
  });

  return sendSuccess(reply, { mfaToken, expiresAt: expiresAt.toISOString() });
}
