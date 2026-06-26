import type { FastifyRequest } from 'fastify';
import { LoomisError } from '../../../shared/errors.js';

export interface WebsiteActorContext {
  userId: string;
  role: string;
}

export function requireWebsiteActor(req: FastifyRequest): WebsiteActorContext {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  return { userId: user.sub, role: user.role };
}
