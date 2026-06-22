import type { Role } from '@loomis/contracts';

/** Which school dashboard shell to render (master plan §6). */
export type SchoolDashboardVariant =
  | 'class_teacher'
  | 'admin_officer'
  | 'teacher'
  | 'core_owner'
  | 'core_principal'
  | 'advanced_owner'
  | 'advanced_principal'
  | 'redirect';

export function resolveSchoolDashboardVariant(
  role: Role | null | undefined,
  isCore: boolean,
): SchoolDashboardVariant {
  if (!role) return 'redirect';

  switch (role) {
    case 'class_teacher':
      return 'class_teacher';
    case 'admin_officer':
      return 'admin_officer';
    case 'teacher':
      return 'teacher';
    case 'school_owner':
      return isCore ? 'core_owner' : 'advanced_owner';
    case 'principal':
      return isCore ? 'core_principal' : 'advanced_principal';
    default:
      return 'redirect';
  }
}
