'use client';

import { canDecideAdmissions, effectiveCan, effectiveCanForRoles, isSchoolTenantRole, type Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';
import { useTeachingStaffContext } from '@loomis/api-client';

import { useSchoolAcademicOptional } from '@/lib/academic/school-academic-context';
import { useAuth } from '@/lib/auth/auth-context';
import { deriveTeachingEffectiveRoles } from '@/lib/school/derive-teaching-roles';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function resolveCapability(
  roles: Role[],
  capability: Capability,
  financeMode: ReturnType<typeof useTenantExperience>['financeMode'],
  flags: ReturnType<typeof useTenantExperience>['flags'],
): boolean {
  if (capability === 'admissions.approve') {
    return roles.some((role) => canDecideAdmissions(role, flags));
  }
  return effectiveCanForRoles(roles, capability, financeMode);
}

/** JWT primary + HRM teaching extensions for capability checks in school UI. */
export function useEffectiveRoles(): Role[] {
  const { session } = useAuth();
  const tenantId = useTenantId();
  const role = session?.role;
  const schoolAcademic = useSchoolAcademicOptional();
  const termId = schoolAcademic?.termId ?? null;
  const { data: teaching } = useTeachingStaffContext(
    tenantId ?? '',
    role && isSchoolTenantRole(role) ? termId : null,
  );
  if (!role) return [];
  return deriveTeachingEffectiveRoles(role, teaching);
}

/** True when the signed-in role has the given capability (UX gating; finance-mode aware). */
export function useCan(capability: Capability): boolean {
  const { session } = useAuth();
  const { financeMode, flags } = useTenantExperience();
  const effectiveRoles = useEffectiveRoles();
  if (!session) return false;
  return resolveCapability(effectiveRoles, capability, financeMode, flags);
}

/** True when the signed-in role has any of the given capabilities. */
export function useCanAny(capabilities: Capability[]): boolean {
  const { session } = useAuth();
  const { financeMode, flags } = useTenantExperience();
  const effectiveRoles = useEffectiveRoles();
  if (!session) return false;
  return capabilities.some((cap) => resolveCapability(effectiveRoles, cap, financeMode, flags));
}

/** Returns the current role or null while loading / unauthenticated. */
export function useRole(): Role | null {
  const { session } = useAuth();
  return session?.role ?? null;
}

/** Whether the tenant requires Principal/Owner to approve admissions (Admin registers only). */
export function useAdmissionsRequirePrincipalApproval(): boolean {
  const { flags } = useTenantExperience();
  return flags.admissionsRequirePrincipalApproval;
}

/** Principal and Owner confirm promotion batches — not Admin Officer (US-ASM-005). */
export function useCanConfirmPromotions(): boolean {
  return useCan('student.promote.confirm');
}

/** Advanced tenant audit CSV export (Owner only). */
export function useCanExportAudit(): boolean {
  const { isAdvanced } = useTenantExperience();
  const canExport = useCan('audit.export');
  return isAdvanced && canExport;
}

export function useCanRequestStaffRole(): boolean {
  return useCan('staff.role.request');
}

export function useCanAssignStaffRole(): boolean {
  return useCan('staff.role.assign');
}

/** View refund timeline (initiate, approve, or leadership oversight). */
export function useCanViewRefunds(): boolean {
  return useCanAny(['refund.initiate', 'refund.approve', 'finance.balances.view']);
}
