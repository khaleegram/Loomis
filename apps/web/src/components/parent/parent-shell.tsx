'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell, PageBody, PageHeader } from '@loomis/ui-web';

import { AuthTokenReadyGate } from '@/components/auth/auth-token-ready-gate';
import { ParentTopBar } from '@/components/parent/parent-sidebar';
import { PushNotificationPrompt } from '@/components/parent/push-notification-prompt';
import { useAuth } from '@/lib/auth/auth-context';

interface ParentShellProps {
  children: ReactNode;
}

export function ParentShell({ children }: ParentShellProps) {
  const { session } = useAuth();
  const showPushPrompt = session?.role === 'parent';

  return (
    <AppShell sidebar={null} topBar={<ParentTopBar />} contentClassName="dashboard-canvas">
      {showPushPrompt ? <PushNotificationPrompt /> : null}
      <AuthTokenReadyGate>{children}</AuthTokenReadyGate>
    </AppShell>
  );
}

export function ParentLayoutGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, session } = useAuth();

  useEffect(() => {
    if (!session && status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (
      session &&
      session.role !== 'parent' &&
      session.role !== 'student'
    ) {
      router.replace('/school/dashboard');
    }
  }, [router, session, status]);

  if (!session && status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (session.role !== 'parent' && session.role !== 'student') {
    return null;
  }

  return <ParentShell>{children}</ParentShell>;
}

export { PageBody, PageHeader };
