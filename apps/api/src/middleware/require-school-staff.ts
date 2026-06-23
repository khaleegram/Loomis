import type { FastifyReply, FastifyRequest } from 'fastify';
import { isSchoolTenantRole } from '@loomis/core';

import { LoomisError } from '../shared/errors.js';

/** Tenant-bound school staff only — parent/student/platform actors are rejected. */
export function requireSchoolStaff() {
  return async function requireSchoolStaffHandler(
    req: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = req.authUser;
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
    }
    if (!user.tenantId || !isSchoolTenantRole(user.role)) {
      throw new LoomisError('FORBIDDEN', 403, 'School staff access required');
    }
  };
}
