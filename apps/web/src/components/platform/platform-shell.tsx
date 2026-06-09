'use client';

import type { ReactNode } from 'react';
import { AppShell, DashboardPageHeader, PageBody, PageHeader } from '@loomis/ui-web';

import { PlatformAuthGate } from '@/components/platform/platform-auth-gate';
import { PlatformTopBar } from '@/components/platform/platform-sidebar';

interface PlatformShellProps {
  children: ReactNode;
}

export function PlatformShell({ children }: PlatformShellProps) {
  return (
    <PlatformAuthGate>
      <AppShell
        sidebar={null}
        topBar={<PlatformTopBar />}
        contentClassName="dashboard-canvas"
      >
        {children}
      </AppShell>
    </PlatformAuthGate>
  );
}

export { PageBody, PageHeader, DashboardPageHeader };
