import type { Role } from '@loomis/contracts';
import { hasMobileTeachingAccess, mobileHomeRole } from '@loomis/core';

/** Mobile-only role stacks. School admin / platform roles use web unless teaching extensions apply. */
export const MOBILE_ROLES: Role[] = [
  'parent',
  'student',
  'class_teacher',
  'teacher',
];

export function isMobileRole(role: Role, staffExtensionRoles: Role[] = []): boolean {
  if (MOBILE_ROLES.includes(role)) return true;
  return hasMobileTeachingAccess(role, staffExtensionRoles);
}

export function homeRouteForRole(role: Role, staffExtensionRoles: Role[] = []): string {
  const mobileRole = mobileHomeRole(role, staffExtensionRoles);
  switch (mobileRole) {
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
