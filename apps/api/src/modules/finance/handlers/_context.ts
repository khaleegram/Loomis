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

/** Parent actor scoped to a school via X-Tenant-Id (US-FIN-004). */
export function requireParentActor(req: FastifyRequest, tenantId: string): ActorContext {
  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }
  if (user.role !== 'parent') {
    throw new LoomisError('FORBIDDEN', 403, 'Only parents may perform this action');
  }
  return { userId: user.sub, role: user.role, tenantId };
}

/** Parent or school staff actor for tenant-scoped finance reads (e.g. payment status). */
export function requireSchoolFinanceActor(req: FastifyRequest, tenantId: string): ActorContext {
  if (req.authUser?.role === 'parent') {
    return requireParentActor(req, tenantId);
  }
  return requireTenantActor(req);
}

/** Captures request metadata for the immutable audit trail. */
export function auditContext(req: FastifyRequest): AuditContext {
  return {
    requestId: req.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  };
}
