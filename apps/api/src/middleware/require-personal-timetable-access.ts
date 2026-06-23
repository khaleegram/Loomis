import type { FastifyReply, FastifyRequest } from 'fastify';
import { isSchoolTenantRole } from '@loomis/core';

import { LoomisError } from '../shared/errors.js';

/** Students and tenant school staff may load `/timetable/me` (service picks the view). */
export function requirePersonalTimetableAccess() {
  return async function requirePersonalTimetableAccessHandler(
    req: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = req.authUser;
    if (!user) {
      throw new LoomisError('IDENTITY_SESSION_INVALIDATED', 401, 'Not authenticated');
    }
    if (user.role === 'student') {
      return;
    }
    if (user.tenantId && isSchoolTenantRole(user.role)) {
      return;
    }
    throw new LoomisError('FORBIDDEN', 403, 'Personal timetable access required');
  };
}
