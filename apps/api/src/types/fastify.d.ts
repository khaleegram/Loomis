import type { LoomisErrorCode } from '@loomis/contracts';
import type { Role } from '@loomis/contracts';
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
    /** JWT primary + HRM extension roles — populated by `requireStaffRole` / `requireCapability`. */
    staffEffectiveRoles?: Role[];
    /** Set by `requireStepUp` once a valid X-MFA-Token is presented for the action. */
    stepUp?: { action: StepUpAction };
    /** Set by `requireIdempotencyKey` from the Idempotency-Key header. */
    idempotencyKey?: string;
    /** Raw request body preserved for gateway webhook HMAC verification. */
    rawBody?: string;
  }
}
