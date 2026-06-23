import type { Role, TeachingStaffContextResponse } from '@loomis/contracts';
import { mergeEffectiveRoles } from '@loomis/core';

/** @deprecated Prefer `resolveEffectiveStaffRoles` with session extensions + teaching context. */
export function deriveTeachingEffectiveRoles(
  primaryRole: Role,
  teaching: TeachingStaffContextResponse | undefined,
): Role[] {
  const extensions: Role[] = [];
  if (teaching?.subjectAssignments.length) {
    extensions.push('teacher');
  }
  if (teaching?.classTeacherAssignment) {
    extensions.push('class_teacher');
  }
  return mergeEffectiveRoles(primaryRole, extensions);
}

export function hasTeachingDuties(
  teaching: TeachingStaffContextResponse | undefined,
): boolean {
  return Boolean(
    teaching?.subjectAssignments.length || teaching?.classTeacherAssignment,
  );
}
