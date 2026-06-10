'use client';

import type { ReactNode } from 'react';
import { AppShell, PageBody, PageHeader } from '@loomis/ui-web';

import { RegionalAuthGate } from '@/components/regional/regional-auth-gate';
import { RegionalTopBar } from '@/components/regional/regional-sidebar';

interface RegionalShellProps {
  children: ReactNode;
}

export function RegionalShell({ children }: RegionalShellProps) {
  return (
    <RegionalAuthGate>
      <AppShell sidebar={null} topBar={<RegionalTopBar />} contentClassName="dashboard-canvas">
        {children}
      </AppShell>
    </RegionalAuthGate>
  );
}

export { PageBody, PageHeader };
