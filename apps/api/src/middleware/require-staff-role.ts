import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@loomis/contracts';
import { hasAnyStaffRole } from '@loomis/core';

import { resolveStaffEffectiveRoles } from '../modules/hrm/services/staff-role-resolver.js';
import { LoomisError } from '../shared/errors.js';

/** Load and cache HRM extension roles on the request (after authenticate). */
export async function ensureStaffEffectiveRoles(req: FastifyRequest): Promise<Role[]> {
  if (req.staffEffectiveRoles) {
    return req.staffEffectiveRoles;
  }

  const user = req.authUser;
  if (!user) {
    throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
  }

  if (!user.tenantId) {
    req.staffEffectiveRoles = [user.role];
    return req.staffEffectiveRoles;
  }

  const roles = await resolveStaffEffectiveRoles(user.tenantId, user.sub, user.role);
  req.staffEffectiveRoles = roles;
  return roles;
}

/**
 * RBAC gate that honours HRM role extensions (e.g. accountant + teacher extension).
 * Must run after `authenticate`. Primary JWT role is checked first without a DB round-trip.
 */
export function requireStaffRole(...allowed: Role[]) {
  return async function requireStaffRoleHandler(
    req: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = req.authUser;
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
    }

    if (allowed.includes(user.role)) {
      return;
    }

    const effective = await ensureStaffEffectiveRoles(req);
    if (hasAnyStaffRole(effective, ...allowed)) {
      return;
    }

    throw new LoomisError('FORBIDDEN', 403, 'Insufficient role for this resource');
  };
}
