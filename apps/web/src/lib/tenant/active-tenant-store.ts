import { create } from 'zustand';

/**
 * Active tenant for API `X-Tenant-Id` header (Frontend Architecture §4.2).
 * School staff roles have a fixed tenant from the JWT; parents switch per child.
 */
interface ActiveTenantStore {
  activeTenantId: string | null;
  setActiveTenantId: (tenantId: string | null) => void;
  clear: () => void;
}

export const useActiveTenantStore = create<ActiveTenantStore>((set) => ({
  activeTenantId: null,
  setActiveTenantId: (tenantId) => set({ activeTenantId: tenantId }),
  clear: () => set({ activeTenantId: null }),
}));

/** Imperative read for the api-client (outside React). */
export function getActiveTenantId(): string | null {
  return useActiveTenantStore.getState().activeTenantId;
}
