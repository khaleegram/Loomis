import type { Role } from '@loomis/contracts';

/** Mobile-only role stacks. School admin / platform roles use web. */
export const MOBILE_ROLES: Role[] = [
  'parent',
  'student',
  'class_teacher',
  'teacher',
];

export function isMobileRole(role: Role): boolean {
  return MOBILE_ROLES.includes(role);
}

export function homeRouteForRole(role: Role): string {
  switch (role) {
    case 'parent':
      return '/(parent)/(tabs)';
    case 'student':
      return '/(student)/(tabs)';
    case 'class_teacher':
      return '/(class-teacher)/(tabs)';
    case 'teacher':
      return '/(teacher)/(tabs)';
    default:
      return '/(auth)/unsupported';
  }
}
