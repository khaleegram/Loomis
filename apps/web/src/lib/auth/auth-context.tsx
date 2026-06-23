'use client';

import { useApiClient } from '@loomis/api-client';
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
import { prefetchSchoolConsoleCache } from '@/lib/auth/prefetch-console-cache';
import { landingPathForRole } from '@/lib/auth/route-groups';
import { useActiveTenantStore } from '@/lib/tenant/active-tenant-store';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: authClient.AuthenticatedSession | null;
  /** True once a valid access token is in memory. */
  isTokenReady: boolean;
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
  const apiClient = useApiClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<authClient.AuthenticatedSession | null>(null);
  const [isTokenReady, setIsTokenReady] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const applySession = useCallback((next: authClient.AuthenticatedSession) => {
    memoryTokenStore.setAccessToken(next.accessToken);
    useActiveTenantStore.getState().setActiveTenantId(next.tenantId);
    setSession(next);
    setStatus('authenticated');
    setIsTokenReady(Boolean(next.accessToken));
  }, []);

  const clearSession = useCallback(() => {
    clearTimer();
    memoryTokenStore.setAccessToken(null);
    useActiveTenantStore.getState().clear();
    setSession(null);
    setStatus('unauthenticated');
    setIsTokenReady(false);
  }, [clearTimer]);

  const prefetchShell = useCallback(
    (tenantId: string | null) => {
      if (!tenantId) return;
      void prefetchSchoolConsoleCache(queryClient, apiClient, tenantId);
    },
    [apiClient, queryClient],
  );

  const purgeStaleServerSession = useCallback(async () => {
    try {
      await authClient.logout();
    } catch {
      // Best-effort
    }
  }, []);

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
      prefetchShell(next.tenantId);
    },
    [applySession, prefetchShell, scheduleRefresh],
  );

  const signOut = useCallback(
    async (allDevices = false) => {
      try {
        await authClient.logout(allDevices);
      } finally {
        clearSession();
        queryClient.clear();
        router.replace('/login');
      }
    },
    [clearSession, queryClient, router],
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      const refreshPromise = authClient.refresh().catch(
        () => null as authClient.AuthenticatedSession | null,
      );

      try {
        const descriptor = await authClient.fetchSessionDescriptor();
        if (!active) return;

        if (descriptor) {
          useActiveTenantStore.getState().setActiveTenantId(descriptor.tenantId);
          setSession(authClient.sessionFromDescriptor(descriptor));
          setStatus('authenticated');
          prefetchShell(descriptor.tenantId);
        }

        const refreshed = await refreshPromise;
        if (!active) return;

        if (refreshed) {
          applySession(refreshed);
          scheduleRefresh(refreshed.expiresAt);
          prefetchShell(refreshed.tenantId);
          return;
        }

        if (!descriptor) {
          if (!memoryTokenStore.getAccessToken()) {
            await purgeStaleServerSession();
            if (active) clearSession();
          }
          return;
        }

        await purgeStaleServerSession();
        if (active) clearSession();
      } catch {
        await purgeStaleServerSession();
        if (active) clearSession();
      }
    })();

    return () => {
      active = false;
      clearTimer();
    };
  }, [
    applySession,
    clearSession,
    clearTimer,
    prefetchShell,
    purgeStaleServerSession,
    scheduleRefresh,
  ]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      isTokenReady,
      completeAuthentication,
      signOut,
      homePath: () => (session ? landingPathForRole(session.role) : '/login'),
    }),
    [status, session, isTokenReady, completeAuthentication, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
