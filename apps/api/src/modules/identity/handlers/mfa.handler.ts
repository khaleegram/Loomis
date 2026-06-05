import type { FastifyReply, FastifyRequest } from 'fastify';
import type { MfaEnrollConfirmRequest, MfaVerifyRequest } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import { authService } from '../services/auth.service.js';
import { tokenService } from '../services/token.service.js';
import { buildRequestContext, getBearerToken, respondAuthenticated } from './_context.js';

/** POST /auth/mfa/verify — solve the TOTP challenge from login and receive tokens. */
export async function mfaVerifyHandler(
  req: FastifyRequest<{ Body: MfaVerifyRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const { mfaChallengeId, code } = req.body;
  const bundle = await authService.verifyMfaChallenge(mfaChallengeId, code, buildRequestContext(req));
  return respondAuthenticated(reply, bundle);
}

/**
 * GET /auth/mfa/enroll — begin enrollment. Authorised by the short-lived
 * enrollment token (Bearer) issued by login when MFA is mandatory but absent.
 */
export async function mfaEnrollStartHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const enrollmentToken = getBearerToken(req);
  if (!enrollmentToken) {
    throw new LoomisError('IDENTITY_MFA_NOT_ENROLLED', 401, 'Missing enrollment token');
  }
  const { userId } = await tokenService.verifyEnrollmentToken(enrollmentToken);
  const result = await authService.startEnrollment(userId);
  return sendSuccess(reply, result);
}

/** POST /auth/mfa/enroll — confirm the first TOTP and receive one-time backup codes. */
export async function mfaEnrollConfirmHandler(
  req: FastifyRequest<{ Body: MfaEnrollConfirmRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const { enrollmentToken, code } = req.body;
  const { userId } = await tokenService.verifyEnrollmentToken(enrollmentToken);
  const result = await authService.confirmEnrollment(userId, code);
  return sendSuccess(reply, result);
}
