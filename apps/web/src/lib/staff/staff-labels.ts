import type { StaffDirectoryEntryResponse, StaffPrimaryRole, StaffRole } from '@loomis/contracts';

import { formatRoleLabel } from '@/components/school/school-nav-config';

/** Roles where the school must always have coverage (FR-HRM-005). */
export const SINGLETON_PRIMARY_ROLES = new Set<StaffPrimaryRole>(['accountant', 'exam_officer']);

export function isSingletonPrimaryRole(role: StaffPrimaryRole | null | undefined): boolean {
  return role != null && SINGLETON_PRIMARY_ROLES.has(role);
}

export function hasClassTeacherExtension(
  roleExtensions: readonly StaffRole[] | null | undefined,
): boolean {
  return roleExtensions?.includes('class_teacher') === true;
}

/** Human-facing role label — promotes teacher + class_teacher extension to "Class Teacher". */
export function formatStaffDisplayRole(
  primaryRole: StaffPrimaryRole | null | undefined,
  roleExtensions?: readonly StaffRole[] | null,
): string {
  if (!primaryRole) return 'No role';
  if (primaryRole === 'teacher' && hasClassTeacherExtension(roleExtensions)) {
    return formatRoleLabel('class_teacher');
  }
  return formatRoleLabel(primaryRole);
}

/** Extension suffixes excluding class_teacher when already shown in the primary label. */
export function formatStaffExtensionLabels(
  roleExtensions: readonly StaffRole[],
  primaryRole?: StaffPrimaryRole | null,
): string | null {
  const visible = roleExtensions.filter(
    (extension) => !(primaryRole === 'teacher' && extension === 'class_teacher'),
  );
  if (visible.length === 0) return null;
  return visible.map((extension) => formatRoleLabel(extension)).join(', ');
}

export function staffInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

export function formatStaffJoinedDate(joinedAt: string | null | undefined): string {
  if (!joinedAt) return '—';
  return new Date(joinedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export interface StaffDirectoryMetrics {
  total: number;
  active: number;
  pending: number;
  deactivated: number;
  expiredInvites: number;
}

export function computeStaffMetrics(staff: StaffDirectoryEntryResponse[]): StaffDirectoryMetrics {
  return {
    total: staff.length,
    active: staff.filter((m) => m.status === 'active').length,
    pending: staff.filter((m) => m.status === 'pending').length,
    deactivated: staff.filter((m) => m.status === 'deactivated').length,
    expiredInvites: staff.filter((m) => m.pendingInvitation?.isExpired).length,
  };
}

/** Singleton roles with no active primary holder (accountant, exam_officer). */
export function computeVacantSingletonRoles(
  staff: StaffDirectoryEntryResponse[],
): StaffPrimaryRole[] {
  const active = staff.filter((member) => member.status === 'active');
  return [...SINGLETON_PRIMARY_ROLES].filter(
    (role) => !active.some((member) => member.primaryRole === role),
  );
}

export type StaffKpiFilter = 'active' | 'pending' | 'deactivated';
