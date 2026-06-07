'use client';

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
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-500">Loading session…</p>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return children;
}
