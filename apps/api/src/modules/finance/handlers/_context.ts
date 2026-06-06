import type { FastifyRequest } from 'fastify';
import { LoomisError } from '../../../shared/errors.js';
import type { ActorContext, AuditContext } from '../types.js';

/** Builds tenant-scoped actor context from the verified access token, or throws. */
export function requireTenantActor(req: FastifyRequest): ActorContext {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  if (!user.tenantId) {
    throw new LoomisError('FORBIDDEN', 403, 'Finance operations require a tenant-scoped session');
  }
  return { userId: user.sub, role: user.role, tenantId: user.tenantId };
}

/** Captures request metadata for the immutable audit trail. */
export function auditContext(req: FastifyRequest): AuditContext {
  return {
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  };
}
