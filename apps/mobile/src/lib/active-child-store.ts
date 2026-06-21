import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ActiveChildState {
  activeChildKey: string | null;
  setActiveChildKey: (key: string | null) => void;
}

/** Composite key: `${tenantId}:${studentId}` */
export const useActiveChildStore = create<ActiveChildState>()(
  persist(
    (set) => ({
      activeChildKey: null,
      setActiveChildKey: (key) => set({ activeChildKey: key }),
    }),
    {
      name: 'loomis-active-child',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function childKey(tenantId: string, studentId: string): string {
  return `${tenantId}:${studentId}`;
}

export function parseChildKey(key: string): { tenantId: string; studentId: string } | null {
  const [tenantId, studentId] = key.split(':');
  if (!tenantId || !studentId) return null;
  return { tenantId, studentId };
}
