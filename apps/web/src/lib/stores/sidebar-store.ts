import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: 'loomis-sidebar' },
  ),
);
