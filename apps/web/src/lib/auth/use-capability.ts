'use client';

import { can, type Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';

import { useAuth } from '@/lib/auth/auth-context';

/** True when the signed-in role has the given capability (UX gating only). */
export function useCan(capability: Capability): boolean {
  const { session } = useAuth();
  if (!session) return false;
  return can(session.role, capability);
}

/** True when the signed-in role has any of the given capabilities. */
export function useCanAny(capabilities: Capability[]): boolean {
  const { session } = useAuth();
  if (!session) return false;
  return capabilities.some((cap) => can(session.role, cap));
}

/** Returns the current role or null while loading / unauthenticated. */
export function useRole(): Role | null {
  const { session } = useAuth();
  return session?.role ?? null;
}
