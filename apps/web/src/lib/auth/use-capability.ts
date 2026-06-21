'use client';

import { effectiveCan, type Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';

import { useAuth } from '@/lib/auth/auth-context';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

/** True when the signed-in role has the given capability (UX gating; finance-mode aware). */
export function useCan(capability: Capability): boolean {
  const { session } = useAuth();
  const { financeMode } = useTenantExperience();
  if (!session) return false;
  return effectiveCan(session.role, capability, financeMode);
}

/** True when the signed-in role has any of the given capabilities. */
export function useCanAny(capabilities: Capability[]): boolean {
  const { session } = useAuth();
  const { financeMode } = useTenantExperience();
  if (!session) return false;
  return capabilities.some((cap) => effectiveCan(session.role, cap, financeMode));
}

/** Returns the current role or null while loading / unauthenticated. */
export function useRole(): Role | null {
  const { session } = useAuth();
  return session?.role ?? null;
}
