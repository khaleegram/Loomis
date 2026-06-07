'use client';

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { useAuth } from '@/lib/auth/auth-context';
import { ParentShell } from '@/components/parent/parent-shell';

export default function ParentLayout({ children }: { children: ReactNode }) {
  const { status, session } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (status !== 'authenticated' || !session) {
    redirect('/login');
    return null;
  }

  if (session.role !== 'parent' && session.role !== 'student') {
    redirect('/school/dashboard');
    return null;
  }

  return <ParentShell>{children}</ParentShell>;
}
