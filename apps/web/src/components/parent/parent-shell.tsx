'use client';

import type { ReactNode } from 'react';
import { AppShell, PageBody, PageHeader } from '@loomis/ui-web';

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
      {children}
    </AppShell>
  );
}

export { PageBody, PageHeader };
