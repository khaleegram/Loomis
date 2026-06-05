import type { FastifyRequest } from 'fastify';
import { LoomisError } from '../../../shared/errors.js';
import type { ActorContext } from '../types.js';

/** Builds tenant-scoped actor context from the verified access token. */
export function requireTenantActor(req: FastifyRequest): ActorContext {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  if (!user.tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Storage requires a tenant-scoped session');
  }
  return { userId: user.sub, role: user.role, tenantId: user.tenantId };
}
