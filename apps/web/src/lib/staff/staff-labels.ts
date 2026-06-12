import type { StaffDirectoryEntryResponse, StaffPrimaryRole } from '@loomis/contracts';

/** Roles where the school must always have coverage (FR-HRM-005). */
export const SINGLETON_PRIMARY_ROLES = new Set<StaffPrimaryRole>(['accountant', 'exam_officer']);

export function isSingletonPrimaryRole(role: StaffPrimaryRole | null | undefined): boolean {
  return role != null && SINGLETON_PRIMARY_ROLES.has(role);
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
