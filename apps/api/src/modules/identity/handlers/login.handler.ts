import type { FastifyReply, FastifyRequest } from 'fastify';
import type { LoginRequest } from '@loomis/contracts';
import { sendSuccess } from '../../../shared/http.js';
import { authService } from '../services/auth.service.js';
import { buildLoginContext, respondAuthenticated } from './_context.js';

export async function loginHandler(
  req: FastifyRequest<{ Body: LoginRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const { email, password } = req.body;
  const result = await authService.login(email, password, buildLoginContext(req));

  if (result.kind === 'authenticated') {
    return respondAuthenticated(reply, result.bundle);
  }
  if (result.kind === 'mfa_required') {
    return sendSuccess(reply, {
      outcome: 'mfa_required' as const,
      mfaChallengeId: result.mfaChallengeId,
    });
  }
  return sendSuccess(reply, {
    outcome: 'mfa_enrollment_required' as const,
    enrollmentToken: result.enrollmentToken,
  });
}
