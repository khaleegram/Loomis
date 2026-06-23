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
