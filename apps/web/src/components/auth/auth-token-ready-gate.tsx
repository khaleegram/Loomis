'use client';

import { Skeleton } from '@loomis/ui-web';
import type { ReactNode } from 'react';

import { useAuth } from '@/lib/auth/auth-context';

interface AuthTokenReadyGateProps {
  children: ReactNode;
}

/** Holds page content until the access token is in memory (shell chrome renders above). */
export function AuthTokenReadyGate({ children }: AuthTokenReadyGateProps) {
  const { session, isTokenReady } = useAuth();

  if (session && !isTokenReady) {
    return (
      <div className="space-y-4 px-4 py-5 sm:px-6 lg:px-12">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return children;
}
