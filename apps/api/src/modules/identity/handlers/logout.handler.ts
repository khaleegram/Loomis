import type { FastifyReply, FastifyRequest } from 'fastify';
import type { LogoutRequest } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import { authService } from '../services/auth.service.js';
import { clearRefreshCookie, getRefreshToken } from './_context.js';

/** POST /auth/logout — requires authentication. Revokes the session (or all). */
export async function logoutHandler(
  req: FastifyRequest<{ Body: LogoutRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  const refreshToken = getRefreshToken(req, req.body?.refreshToken);

  await authService.logout({
    userId: user.sub,
    sessionId: user.sessionId,
    accessJti: user.jti,
    accessExpiresAt: new Date(user.exp * 1000),
    allDevices: req.body?.allDevices ?? false,
    ...(user.deviceId !== undefined ? { deviceId: user.deviceId } : {}),
    ...(refreshToken !== undefined ? { refreshToken } : {}),
  });

  clearRefreshCookie(reply);
  return sendSuccess(reply, { loggedOut: true });
}
