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
