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
  const { status, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?next=/platform/dashboard');
      return;
    }
    if (status === 'authenticated' && session && !PLATFORM_ROLES.has(session.role)) {
      router.replace('/login');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen bg-neutral-50 dark:bg-forest-950">
        {/* Sidebar skeleton */}
        <div className="hidden w-60 shrink-0 border-r border-neutral-200 bg-neutral-100 p-4 dark:border-forest-800 dark:bg-forest-950 lg:block">
          <Skeleton className="mb-6 h-8 w-36 bg-neutral-200 dark:bg-forest-800" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-9 w-full bg-neutral-200 dark:bg-forest-800"
              />
            ))}
          </div>
        </div>
        {/* Content skeleton */}
        <div className="flex flex-1 flex-col">
          <Skeleton className="h-14 w-full rounded-none bg-neutral-200 dark:bg-forest-900" />
          <div className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || !session || !PLATFORM_ROLES.has(session.role)) {
    return null;
  }

  return children;
}
