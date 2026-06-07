'use client';

import { Skeleton } from '@loomis/ui-web';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth/auth-context';

interface SchoolAuthGateProps {
  children: ReactNode;
}

/** Ensures an authenticated school-session before rendering console pages. */
export function SchoolAuthGate({ children }: SchoolAuthGateProps) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?next=/school/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="hidden w-56 shrink-0 border-r border-border bg-sidebar p-4 lg:block">
          <Skeleton className="mb-4 h-6 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <Skeleton className="h-14 w-full" />
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return children;
}
