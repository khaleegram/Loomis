'use client';

import { canDecideAdmissions, effectiveCan, type Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';

import { useAuth } from '@/lib/auth/auth-context';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

function resolveCapability(
  role: Role,
  capability: Capability,
  financeMode: ReturnType<typeof useTenantExperience>['financeMode'],
  flags: ReturnType<typeof useTenantExperience>['flags'],
): boolean {
  if (capability === 'admissions.approve') {
    return canDecideAdmissions(role, flags);
  }
  return effectiveCan(role, capability, financeMode);
}

/** True when the signed-in role has the given capability (UX gating; finance-mode aware). */
export function useCan(capability: Capability): boolean {
  const { session } = useAuth();
  const { financeMode, flags } = useTenantExperience();
  if (!session) return false;
  return resolveCapability(session.role, capability, financeMode, flags);
}

/** True when the signed-in role has any of the given capabilities. */
export function useCanAny(capabilities: Capability[]): boolean {
  const { session } = useAuth();
  const { financeMode, flags } = useTenantExperience();
  if (!session) return false;
  return capabilities.some((cap) => resolveCapability(session.role, cap, financeMode, flags));
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
