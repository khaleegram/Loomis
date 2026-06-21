import { create } from 'zustand';

interface OfflineSummaryState {
  pendingCount: number;
  lastSyncAt: string | null;
  syncing: boolean;
  preserveOnLogout: boolean;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (iso: string | null) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useOfflineSummaryStore = create<OfflineSummaryState>((set) => ({
  pendingCount: 0,
  lastSyncAt: null,
  syncing: false,
  preserveOnLogout: true,
  setPendingCount: (count) => set({ pendingCount: count }),
  setLastSyncAt: (iso) => set({ lastSyncAt: iso }),
  setSyncing: (syncing) => set({ syncing }),
}));
