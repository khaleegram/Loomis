'use client';

import { Skeleton } from '@loomis/ui-web';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from '@/lib/auth/auth-context';

interface SchoolAuthGateProps {
  children: ReactNode;
}

function AuthShellSkeleton() {
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

/**
 * Ensures a school session before rendering the console shell.
 * Renders the shell as soon as the session descriptor is known (optimistic UI);
 * API calls stay gated on `isTokenReady` in auth context.
 */
export function SchoolAuthGate({ children }: SchoolAuthGateProps) {
  const router = useRouter();
  const { status, session } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (!session && status === 'loading') {
    return <AuthShellSkeleton />;
  }

  if (!session) {
    return null;
  }

  return children;
}
