'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { memoryTokenStore } from '@/lib/auth/memory-token-store';
import * as authClient from '@/lib/auth/auth-client';
import { landingPathForRole } from '@/lib/auth/route-groups';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: authClient.AuthenticatedSession | null;
  /** Promote a fresh session (after login / MFA) into memory + schedule refresh. */
  completeAuthentication: (session: authClient.AuthenticatedSession) => void;
  signOut: (allDevices?: boolean) => Promise<void>;
  homePath: () => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Refresh this many ms before the access token expires. */
const REFRESH_LEEWAY_MS = 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<authClient.AuthenticatedSession | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const applySession = useCallback(
    (next: authClient.AuthenticatedSession) => {
      memoryTokenStore.setAccessToken(next.accessToken);
      useActiveTenantStore.getState().setActiveTenantId(next.tenantId);
      setSession(next);
      setStatus('authenticated');
    },
    [],
  );

  const clearSession = useCallback(() => {
    clearTimer();
    memoryTokenStore.setAccessToken(null);
    useActiveTenantStore.getState().clear();
    setSession(null);
    setStatus('unauthenticated');
  }, [clearTimer]);

  /** Clears httpOnly cookies when the in-memory session is dead but edge gating still sees a session. */
  const purgeStaleServerSession = useCallback(async () => {
    try {
      await authClient.logout();
    } catch {
      // Best-effort — logout clears cookies even when the backend is unreachable.
    }
  }, []);

  // Single source for scheduling the next silent refresh.
  const scheduleRefresh = useCallback(
    (expiresAt: string) => {
      clearTimer();
      const delay = Math.max(new Date(expiresAt).getTime() - Date.now() - REFRESH_LEEWAY_MS, 0);
      refreshTimer.current = setTimeout(() => {
        void (async () => {
          try {
            const next = await authClient.refresh();
            if (next) {
              applySession(next);
              scheduleRefresh(next.expiresAt);
            } else {
              clearSession();
            }
          } catch {
            clearSession();
          }
        })();
      }, delay);
    },
    [applySession, clearSession, clearTimer],
  );

  const completeAuthentication = useCallback(
    (next: authClient.AuthenticatedSession) => {
      applySession(next);
      scheduleRefresh(next.expiresAt);
    },
    [applySession, scheduleRefresh],
  );

  const signOut = useCallback(
    async (allDevices = false) => {
      try {
        await authClient.logout(allDevices);
      } finally {
        clearSession();
        // Purge all cached tenant data on logout (loomis-frontend).
        queryClient.clear();
        router.replace('/login');
      }
    },
    [clearSession, queryClient, router],
  );

  // Bootstrap: try to mint an access token from the httpOnly refresh cookie.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = await authClient.refresh();
        if (!active) return;
        if (next) {
          applySession(next);
          scheduleRefresh(next.expiresAt);
        } else if (!memoryTokenStore.getAccessToken()) {
          await purgeStaleServerSession();
          if (active) clearSession();
        }
      } catch {
        await purgeStaleServerSession();
        if (active) clearSession();
      }
    })();
    return () => {
      active = false;
      clearTimer();
    };
  }, [applySession, clearSession, clearTimer, purgeStaleServerSession, scheduleRefresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      completeAuthentication,
      signOut,
      homePath: () => (session ? landingPathForRole(session.role) : '/login'),
    }),
    [status, session, completeAuthentication, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
