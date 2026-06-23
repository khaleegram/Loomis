import type { ExperienceTier, StaffPrimaryRole } from '@loomis/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { isOptionalStaffRoleEnabled } from '@loomis/core';

import { tenantRepository } from '../modules/tenant/repository/tenant.repository.js';
import { LoomisError } from '../shared/errors.js';

const OPTIONAL_PRIMARY_ROLES = new Set<StaffPrimaryRole>([
  'timetable_officer',
  'deputy_exam_officer',
]);

function parseExperienceTier(value: string | undefined): ExperienceTier {
  if (value === 'advanced' || value === 'enterprise') return value;
  return 'core';
}

/**
 * Blocks timetable_officer / deputy_exam_officer JWT roles when the tenant has not
 * enabled the matching Advanced experience flag (Core tier plan §2.2–§2.3).
 * No-op for all other roles — run after `authenticate`.
 */
export function requireOptionalStaffRoleIfApplicable() {
  return async function requireOptionalStaffRoleHandler(
    req: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const user = req.authUser;
    if (!user?.tenantId) return;

    const primary = user.role as StaffPrimaryRole;
    if (!OPTIONAL_PRIMARY_ROLES.has(primary)) return;

    const tenant = await tenantRepository.findById(user.tenantId);
    if (!tenant) {
      throw new LoomisError('TENANT_NOT_FOUND', 404, 'Tenant not found');
    }

    if (
      !isOptionalStaffRoleEnabled(
        primary,
        parseExperienceTier(tenant.experienceTier),
        tenant.experienceFlags as Record<string, boolean>,
      )
    ) {
      throw new LoomisError(
        'HRM_ROLE_NOT_ENABLED',
        403,
        'This role requires an Advanced module to be enabled in Experience settings',
      );
    }
  };
}
