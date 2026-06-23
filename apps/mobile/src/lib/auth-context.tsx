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
import type { QueryClient } from '@tanstack/react-query';
import type { Role } from '@loomis/contracts';
import type { Href } from 'expo-router';
import { router } from 'expo-router';
import {
  clearSession,
  persistSession,
  refreshSession,
  type AuthenticatedSession,
} from './auth-client.js';
import { setActiveTenantId, setOnSessionInvalidated } from './api-client.js';
import { homeRouteForRole, isMobileRole } from './role-routes.js';
import { useOfflineSummaryStore } from '../offline/offline-summary-store.js';

export interface SessionState {
  role: Role;
  tenantId: string | null;
  displayName?: string;
  mustChangePassword?: boolean;
  staffExtensionRoles?: Role[];
}

interface AuthContextValue {
  session: SessionState | null;
  isLoading: boolean;
  setSession: (session: AuthenticatedSession) => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
  queryClient: QueryClient;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, queryClient }: AuthProviderProps) {
  const [session, setSessionState] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authGeneration = useRef(0);
  const preserveOfflineQueue = useOfflineSummaryStore((s) => s.preserveOnLogout);

  const signOut = useCallback(async () => {
    if (!preserveOfflineQueue) {
      // offline queue preserved by default — only clear auth/session cache
    }
    await clearSession();
    setActiveTenantId(null);
    setSessionState(null);
    queryClient.clear();
    router.replace('/(auth)/login');
  }, [preserveOfflineQueue, queryClient]);

  useEffect(() => {
    setOnSessionInvalidated(() => {
      void signOut();
    });
  }, [signOut]);

  useEffect(() => {
    const generationAtStart = authGeneration.current;
    let cancelled = false;
    (async () => {
      try {
        const restored = await refreshSession();
        if (cancelled || authGeneration.current !== generationAtStart) return;
        if (restored) {
          await persistSession(restored);
          setActiveTenantId(restored.tenantId);
          setSessionState({
            role: restored.role,
            tenantId: restored.tenantId,
            displayName: restored.displayName,
            mustChangePassword: restored.mustChangePassword,
            staffExtensionRoles: restored.staffExtensionRoles,
          });
          if (isMobileRole(restored.role, restored.staffExtensionRoles ?? [])) {
            router.replace(
              homeRouteForRole(restored.role, restored.staffExtensionRoles ?? []) as Href,
            );
          } else {
            router.replace('/(auth)/unsupported');
          }
        }
      } catch {
        if (!cancelled && authGeneration.current === generationAtStart) {
          await clearSession();
          setSessionState(null);
        }
      } finally {
        if (!cancelled && authGeneration.current === generationAtStart) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback(async (next: AuthenticatedSession) => {
    authGeneration.current += 1;
    await persistSession(next);
    setActiveTenantId(next.tenantId);
    setSessionState({
      role: next.role,
      tenantId: next.tenantId,
      displayName: next.displayName,
      mustChangePassword: next.mustChangePassword,
      staffExtensionRoles: next.staffExtensionRoles,
    });
    if (isMobileRole(next.role, next.staffExtensionRoles ?? [])) {
      router.replace(homeRouteForRole(next.role, next.staffExtensionRoles ?? []) as Href);
    } else {
      router.replace('/(auth)/unsupported');
    }
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, setSession, signOut }),
    [session, isLoading, setSession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
