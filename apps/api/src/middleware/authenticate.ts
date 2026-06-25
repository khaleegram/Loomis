import type { FastifyReply, FastifyRequest } from 'fastify';
import { LoomisError } from '../shared/errors.js';
import { sessionService } from '../modules/identity/services/session.service.js';
import { tokenService } from '../modules/identity/services/token.service.js';
import type { DevicePlatform } from '../modules/identity/types.js';
import { userRepository } from '../modules/identity/repository/user.repository.js';
import { tenantAccessService } from '../modules/tenant/services/tenant-access.service.js';

function extractBearer(req: FastifyRequest): string {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Missing or malformed Authorization header');
  }
  return header.slice('Bearer '.length).trim();
}

/**
 * Validates the JWT, checks `user_ver` against Redis, verifies the jti is not
 * blacklisted, and confirms the session row is still active (loomis-security).
 * Slides the session idle clock forward on activity (SEC-AUTH-011).
 */
export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = extractBearer(req);
  const verified = await tokenService.verifyAccessToken(token);
  await tokenService.assertUserVerValid(verified.sub, verified.userVer);

  const session = await sessionService.assertActiveSession(verified.sessionId);
  const platform = (session.platform as DevicePlatform | null) ?? 'web';
  await sessionService.slideIdle(session.id, platform, session.absExpiresAt);

  req.authUser = verified;

  if (verified.tenantId && tenantAccessService.isSchoolTenantRole(verified.role)) {
    await tenantAccessService.assertSchoolAccessAllowed(verified.tenantId);
  }

  const url = req.url.split('?')[0] ?? req.url;
  if (!url.endsWith('/auth/change-password')) {
    const user = await userRepository.findById(verified.sub);
    if (user?.mustChangePassword) {
      throw new LoomisError(
        'IDENTITY_PASSWORD_CHANGE_REQUIRED',
        403,
        'You must change your password before continuing',
      );
    }
  }
}
