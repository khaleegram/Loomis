'use client';

import { Skeleton } from '@loomis/ui-web';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth/auth-context';

const PLATFORM_ROLES = new Set(['platform_owner', 'platform_admin', 'dpo']);

interface PlatformAuthGateProps {
  children: ReactNode;
}

/**
 * Ensures an authenticated platform-level session before rendering platform
 * console pages. Platform actors have null tenant_id in their JWT.
 */
export function PlatformAuthGate({ children }: PlatformAuthGateProps) {
  const { status, session, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      void signOut();
      return;
    }
    if (status === 'authenticated' && session && !PLATFORM_ROLES.has(session.role)) {
      router.replace('/login');
    }
  }, [status, session, router, signOut]);

  if (status === 'loading' && !session) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-neutral-50 dark:bg-forest-950">
        <Skeleton className="h-14 w-full shrink-0 rounded-none bg-neutral-200 dark:bg-forest-900" />
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || !session || !PLATFORM_ROLES.has(session.role)) {
    return null;
  }

  return children;
}
