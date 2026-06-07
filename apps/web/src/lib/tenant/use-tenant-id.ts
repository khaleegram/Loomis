'use client';

import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';

/** Active tenant UUID for tenant-scoped queries and mutations. */
export function useTenantId(): string | null {
  return useActiveTenantStore((s) => s.activeTenantId);
}
