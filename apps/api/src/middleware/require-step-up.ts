import type { FastifyReply, FastifyRequest } from 'fastify';
import type { StepUpAction } from '@loomis/contracts';
import { LoomisError } from '../shared/errors.js';
import { tokenService } from '../modules/identity/services/token.service.js';

/**
 * Requires a valid step-up proof (X-MFA-Token) scoped to `action` before the
 * handler runs (SEC-AUTH-008, System Design §5.3). Must run after `authenticate`.
 */
export function requireStepUp(action: StepUpAction) {
  return async function requireStepUpHandler(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const user = req.authUser;
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
    }

    const header = req.headers['x-mfa-token'];
    const mfaToken = Array.isArray(header) ? header[0] : header;
    if (!mfaToken) {
      throw new LoomisError('IDENTITY_STEPUP_REQUIRED', 401, 'Step-up MFA required for this action');
    }

    await tokenService.verifyStepUpToken(mfaToken, action, user.sub);
    req.stepUp = { action };
  };
}
