import type { LoomisErrorCode } from '@loomis/contracts';
import type { VerifiedAccessToken } from '../modules/identity/types.js';
import type { StepUpAction } from '@loomis/contracts';

declare module 'fastify' {
  interface FastifyReply {
    /** Sends the standard Loomis error envelope. Registered in shared/http.ts. */
    loomisError(
      code: LoomisErrorCode,
      message: string,
      statusCode?: number,
      details?: Record<string, unknown>,
    ): FastifyReply;
  }

  interface FastifyRequest {
    /** Set by the `authenticate` middleware after the access token is verified. */
    authUser?: VerifiedAccessToken;
    /** Set by `requireStepUp` once a valid X-MFA-Token is presented for the action. */
    stepUp?: { action: StepUpAction };
  }
}
