'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

/** V2 is light-mode only. */
export type Theme = 'light';
type ResolvedTheme = 'light';

const STORAGE_KEY = 'loomis-theme';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  /** No-op — light mode is fixed in V2. */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyLightTheme() {
  const root = document.documentElement;
  root.classList.remove('dark');
  root.style.colorScheme = 'light';
  try {
    localStorage.setItem(STORAGE_KEY, 'light');
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyLightTheme();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: () => applyLightTheme(),
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
