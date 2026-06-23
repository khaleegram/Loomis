import type { Role } from '@loomis/contracts';
import { mergeEffectiveRoles } from '@loomis/core';

import { staffRepository } from '../repository/staff.repository.js';

/** JWT primary role plus active HRM extension roles for the staff profile. */
export async function resolveStaffEffectiveRoles(
  tenantId: string,
  userId: string,
  jwtRole: Role,
): Promise<Role[]> {
  const profile = await staffRepository.findProfileByUserId(tenantId, userId);
  if (!profile) {
    return mergeEffectiveRoles(jwtRole);
  }

  const assignments = await staffRepository.listActiveRoles(tenantId, profile.id);
  const extensions = assignments
    .filter((assignment) => assignment.assignmentType === 'extension')
    .map((assignment) => assignment.role as Role);

  return mergeEffectiveRoles(jwtRole, extensions);
}
