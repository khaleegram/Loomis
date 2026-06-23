import type { FinanceMode, Role } from '@loomis/contracts';

import { type Capability } from './capabilities.js';
import { effectiveCapabilities } from './finance-presets.js';

/** Teaching-related roles — primary or HRM extension (CON-003, FR-ACA-003). */
export const TEACHING_STAFF_ROLES = ['teacher', 'class_teacher'] as const satisfies readonly Role[];

/** Roles that may be granted as HRM extensions on a non-teaching primary staff account. */
export const STAFF_ROLE_EXTENSIONS = ['teacher', 'class_teacher'] as const satisfies readonly Role[];

/** Tenant-scoped school staff JWT roles (excludes parent/student/platform/regional). */
export const SCHOOL_TENANT_ROLES: readonly Role[] = [
  'school_owner',
  'principal',
  'admin_officer',
  'accountant',
  'cashier',
  'exam_officer',
  'deputy_exam_officer',
  'timetable_officer',
  'teacher',
  'class_teacher',
];

/** Extension roles only (excludes JWT primary). */
export function extractStaffExtensionRoles(
  primaryRole: Role,
  effectiveRoles: Iterable<Role>,
): Role[] {
  const extensions: Role[] = [];
  for (const candidate of effectiveRoles) {
    if (candidate !== primaryRole) extensions.push(candidate);
  }
  return extensions;
}

/** Whether this staff account may use parent/student/teacher mobile stacks. */
export function hasMobileTeachingAccess(primaryRole: Role, extensionRoles: Iterable<Role> = []): boolean {
  if (MOBILE_STAFF_ROLES.includes(primaryRole)) return true;
  for (const extension of extensionRoles) {
    if (MOBILE_STAFF_ROLES.includes(extension)) return true;
  }
  return false;
}

/** Mobile home stack — class teacher wins over subject teacher. */
export function mobileHomeRole(primaryRole: Role, extensionRoles: Iterable<Role> = []): Role | null {
  if (primaryRole === 'class_teacher' || hasStaffRole(extensionRoles, 'class_teacher')) {
    return 'class_teacher';
  }
  if (primaryRole === 'teacher' || hasStaffRole(extensionRoles, 'teacher')) {
    return 'teacher';
  }
  if (primaryRole === 'parent') return 'parent';
  if (primaryRole === 'student') return 'student';
  return null;
}

/** Roles supported on the Expo mobile app (primary or extension). */
export const MOBILE_STAFF_ROLES: readonly Role[] = ['teacher', 'class_teacher'];

/** Parent and student portals on mobile. */
export const MOBILE_PORTAL_ROLES: readonly Role[] = ['parent', 'student'];

/** Merge JWT primary role with active HRM extension roles (deduped). */
export function mergeEffectiveRoles(primaryRole: Role, extensionRoles: Iterable<Role> = []): Role[] {
  const merged = new Set<Role>([primaryRole]);
  for (const extension of extensionRoles) {
    if (extension !== primaryRole) merged.add(extension);
  }
  return [...merged];
}

export function hasStaffRole(effectiveRoles: Iterable<Role>, role: Role): boolean {
  for (const candidate of effectiveRoles) {
    if (candidate === role) return true;
  }
  return false;
}

export function hasAnyStaffRole(effectiveRoles: Iterable<Role>, ...roles: Role[]): boolean {
  return roles.some((role) => hasStaffRole(effectiveRoles, role));
}

export function isTeachingStaffRoleSet(effectiveRoles: Iterable<Role>): boolean {
  return hasAnyStaffRole(effectiveRoles, ...TEACHING_STAFF_ROLES);
}

export function canActAsClassTeacher(effectiveRoles: Iterable<Role>): boolean {
  return hasStaffRole(effectiveRoles, 'class_teacher');
}

export function canTeachSubjects(effectiveRoles: Iterable<Role>): boolean {
  return hasAnyStaffRole(effectiveRoles, 'teacher', 'class_teacher');
}

export function isSchoolTenantRole(role: Role): boolean {
  return SCHOOL_TENANT_ROLES.includes(role);
}

/** Union capabilities across all effective roles (finance presets applied per role). */
export function effectiveCapabilitiesForRoles(
  roles: Iterable<Role>,
  financeMode: FinanceMode = 'combined',
): ReadonlySet<Capability> {
  const caps = new Set<Capability>();
  for (const role of roles) {
    for (const cap of effectiveCapabilities(role, financeMode)) {
      caps.add(cap);
    }
  }
  return caps;
}

export function effectiveCanForRoles(
  roles: Iterable<Role>,
  capability: Capability,
  financeMode: FinanceMode = 'combined',
): boolean {
  return effectiveCapabilitiesForRoles(roles, financeMode).has(capability);
}
