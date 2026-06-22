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

/** GET /auth/mfa/status — optional TOTP enrollment state for the signed-in user. */
export async function mfaStatusHandler(req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  const result = await authService.getMfaStatus(user.sub, user.tenant_id ?? null);
  return sendSuccess(reply, result);
}

/** POST /auth/mfa/voluntary/enroll — begin optional authenticator setup (session auth). */
export async function mfaVoluntaryEnrollStartHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  const result = await authService.startVoluntaryEnrollment(user.sub, user.tenant_id ?? null);
  return sendSuccess(reply, result);
}

/** POST /auth/mfa/voluntary/enroll/confirm — activate optional authenticator. */
export async function mfaVoluntaryEnrollConfirmHandler(
  req: FastifyRequest<{ Body: { code: string } }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  const result = await authService.confirmVoluntaryEnrollment(
    user.sub,
    user.tenant_id ?? null,
    req.body.code,
  );
  return sendSuccess(reply, result);
}
