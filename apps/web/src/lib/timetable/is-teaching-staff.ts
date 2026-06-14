import type { Role } from '@loomis/contracts';

export function isTeacherRole(role: Role | null | undefined): role is 'teacher' {
  return role === 'teacher';
}

export function isClassTeacherRole(role: Role | null | undefined): role is 'class_teacher' {
  return role === 'class_teacher';
}

/** Either teaching role — personal schedule via /timetable/me. */
export function isTeachingStaffRole(role: Role | null | undefined): role is 'teacher' | 'class_teacher' {
  return isTeacherRole(role) || isClassTeacherRole(role);
}
