import type { FastifyReply, FastifyRequest } from 'fastify';
import type { StepUpAction } from '@loomis/contracts';
import { requireStepUp } from './require-step-up.js';

/**
 * Step-up MFA for the school-head override publish path. Exam Officer / Deputy use
 * the dedicated flow without step-up; when a Principal or School Owner publishes
 * (the emergency/override path) we require step-up MFA per loomis-security.
 */
export function requireStepUpForPrincipal(action: StepUpAction) {
  const stepUp = requireStepUp(action);
  return async function requireStepUpForPrincipalHandler(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (req.authUser?.role === 'principal' || req.authUser?.role === 'school_owner') {
      await stepUp(req, reply);
    }
  };
}
