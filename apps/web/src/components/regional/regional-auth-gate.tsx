'use client';

import { Skeleton } from '@loomis/ui-web';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth/auth-context';

const REGIONAL_ROLES = new Set(['regional_manager', 'regional_subordinate']);

interface RegionalAuthGateProps {
  children: ReactNode;
}

export function RegionalAuthGate({ children }: RegionalAuthGateProps) {
  const { status, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?next=/regional/dashboard');
      return;
    }
    if (status === 'authenticated' && session && !REGIONAL_ROLES.has(session.role)) {
      router.replace('/login');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen bg-neutral-50 dark:bg-forest-950">
        <div className="hidden w-60 shrink-0 border-r border-neutral-200 bg-neutral-100 p-4 dark:border-forest-800 dark:bg-forest-950 lg:block">
          <Skeleton className="mb-6 h-8 w-36 bg-neutral-200 dark:bg-forest-800" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full bg-neutral-200 dark:bg-forest-800" />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <Skeleton className="h-14 w-full rounded-none bg-neutral-200 dark:bg-forest-900" />
          <div className="space-y-6 p-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || !session || !REGIONAL_ROLES.has(session.role)) {
    return null;
  }

  return children;
}
