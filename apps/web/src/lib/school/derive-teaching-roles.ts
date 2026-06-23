import type { Role, TeachingStaffContextResponse } from '@loomis/contracts';
import { mergeEffectiveRoles } from '@loomis/core';

/** Infer effective roles from JWT + `/teaching/me` (mirrors HRM extensions on the client). */
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
