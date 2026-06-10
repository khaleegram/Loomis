'use client';

import type { ReactNode } from 'react';
import { AppShell, DashboardPageHeader, PageBody, PageHeader } from '@loomis/ui-web';

import { SchoolAuthGate } from '@/components/school/school-auth-gate';
import { SchoolTopBar } from '@/components/school/school-sidebar';

interface SchoolShellProps {
  children: ReactNode;
}

export function SchoolShell({ children }: SchoolShellProps) {
  return (
    <SchoolAuthGate>
      <AppShell
        sidebar={null}
        topBar={<SchoolTopBar />}
        contentClassName="dashboard-canvas"
      >
        {children}
      </AppShell>
    </SchoolAuthGate>
  );
}

export { PageBody, PageHeader, DashboardPageHeader };
