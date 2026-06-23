import type { Role, TeachingStaffContextResponse } from '@loomis/contracts';
import { mergeEffectiveRoles } from '@loomis/core';

/**
 * Union HRM extension roles (from auth session) with term-scoped teaching duties
 * (`/teaching/me`). Extensions win for nav before term loads; teaching context
 * refines class-teacher vs subject-teacher for the open term.
 */
export function resolveEffectiveStaffRoles(
  primaryRole: Role,
  staffExtensionRoles: Role[] | undefined,
  teaching: TeachingStaffContextResponse | undefined,
): Role[] {
  const fromSession = staffExtensionRoles ?? [];
  if (!teaching) {
    return mergeEffectiveRoles(primaryRole, fromSession);
  }

  const fromTeaching: Role[] = [];
  if (teaching.subjectAssignments.length) fromTeaching.push('teacher');
  if (teaching.classTeacherAssignment) fromTeaching.push('class_teacher');

  return mergeEffectiveRoles(primaryRole, [...fromSession, ...fromTeaching]);
}

export function hasTeachingDutiesFromRoles(roles: Role[]): boolean {
  return roles.includes('teacher') || roles.includes('class_teacher');
}
