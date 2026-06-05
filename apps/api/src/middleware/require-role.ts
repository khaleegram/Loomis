import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@loomis/contracts';
import { LoomisError } from '../shared/errors.js';

/**
 * RBAC gate. Must run after `authenticate`. Never check `req.authUser.role`
 * inline in business logic — always use this middleware (loomis-security).
 */
export function requireRole(...roles: Role[]) {
  return async function requireRoleHandler(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const user = req.authUser;
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
    }
    if (!roles.includes(user.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'Insufficient role for this resource');
    }
  };
}
