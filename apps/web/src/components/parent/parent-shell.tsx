'use client';

import type { ReactNode } from 'react';
import { AppShell, PageBody, PageHeader } from '@loomis/ui-web';

import { ParentTopBar } from '@/components/parent/parent-sidebar';

interface ParentShellProps {
  children: ReactNode;
}

export function ParentShell({ children }: ParentShellProps) {
  return (
    <AppShell sidebar={null} topBar={<ParentTopBar />} contentClassName="dashboard-canvas">
      {children}
    </AppShell>
  );
}

export { PageBody, PageHeader };
