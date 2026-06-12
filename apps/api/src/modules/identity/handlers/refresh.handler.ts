import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RefreshTokenRequest } from '@loomis/contracts';
import { LoomisError } from '../../../shared/errors.js';
import { sendSuccess } from '../../../shared/http.js';
import { authService } from '../services/auth.service.js';
import { getRefreshToken, setRefreshCookie } from './_context.js';

export async function refreshHandler(
  req: FastifyRequest<{ Body: RefreshTokenRequest }>,
  reply: FastifyReply,
): Promise<FastifyReply> {
  const rawToken = getRefreshToken(req, req.body?.refreshToken);
  if (!rawToken) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Missing refresh token');
  }

  const { accessToken, refreshToken, expiresAt, refreshExpiresAt, mustChangePassword, displayName } =
    await authService.refresh(rawToken);
  setRefreshCookie(reply, refreshToken, refreshExpiresAt);

  return sendSuccess(reply, {
    accessToken,
    refreshToken,
    expiresAt: expiresAt.toISOString(),
    ...(mustChangePassword ? { mustChangePassword: true } : {}),
    ...(displayName ? { displayName } : {}),
  });
}
