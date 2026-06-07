import { create } from 'zustand';

export interface ActiveBreakGlassSession {
  sessionId: string;
  tenantId: string;
  tenantName: string;
  supportTicketId: string;
  /** Unix timestamp in milliseconds */
  expiresAt: number;
}

interface BreakGlassStore {
  session: ActiveBreakGlassSession | null;
  activate: (session: ActiveBreakGlassSession) => void;
  deactivate: () => void;
}

/**
 * Zustand store for tracking an active break-glass session (US-PLT-006).
 * Client-side UI state only. The authoritative session lives in the API.
 * The red strip in PlatformTopBar reads from this store.
 */
export const useBreakGlassStore = create<BreakGlassStore>((set) => ({
  session: null,
  activate: (session) => set({ session }),
  deactivate: () => set({ session: null }),
}));
