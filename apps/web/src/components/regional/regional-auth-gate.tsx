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
  const { status, session, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      void signOut();
      return;
    }
    if (status === 'authenticated' && session && !REGIONAL_ROLES.has(session.role)) {
      router.replace('/login');
    }
  }, [status, session, router, signOut]);

  if (status === 'loading' && !session) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-neutral-50 dark:bg-forest-950">
        <Skeleton className="h-14 w-full shrink-0 rounded-none bg-neutral-200 dark:bg-forest-900" />
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
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
