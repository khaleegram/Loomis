import type { FastifyReply, FastifyRequest } from 'fastify';
import type { StepUpAction } from '@loomis/contracts';
import { requireStepUp } from './require-step-up.js';

/** Step-up MFA only when the authenticated actor is Principal (emergency publish path). */
export function requireStepUpForPrincipal(action: StepUpAction) {
  const stepUp = requireStepUp(action);
  return async function requireStepUpForPrincipalHandler(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (req.authUser?.role === 'principal') {
      await stepUp(req, reply);
    }
  };
}
