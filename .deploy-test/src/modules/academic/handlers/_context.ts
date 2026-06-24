import type { FastifyRequest } from 'fastify';
import { LoomisError } from '../../../shared/errors.js';
import type { ActorContext } from '../types.js';

/** Builds the actor context from the verified access token, or throws 401. */
export function requireActor(req: FastifyRequest): ActorContext {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  return { userId: user.sub, role: user.role, tenantId: user.tenantId };
}
