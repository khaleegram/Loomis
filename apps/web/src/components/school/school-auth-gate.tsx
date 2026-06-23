'use client';

import { Skeleton } from '@loomis/ui-web';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth/auth-context';

interface SchoolAuthGateProps {
  children: ReactNode;
}

/** Ensures an authenticated school-session before rendering console pages. */
export function SchoolAuthGate({ children }: SchoolAuthGateProps) {
  const { status, session, signOut } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Clears stale edge cookies then sends the user to login.
      void signOut();
    }
  }, [status, signOut]);

  if (status === 'loading' && !session) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        <Skeleton className="h-14 w-full shrink-0 rounded-none" />
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
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
