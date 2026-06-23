'use client';

import type { ReactNode } from 'react';

import { SchoolHistoricalTermBanner } from '@/components/school/school-academic-session-bar';
import { SchoolAuthGate } from '@/components/school/school-auth-gate';
import { SchoolTopBar } from '@/components/school/school-sidebar';
import { AuthTokenReadyGate } from '@/components/auth/auth-token-ready-gate';
import { SchoolAcademicProvider } from '@/lib/academic/school-academic-context';
import { AppShell, DashboardPageHeader, PageBody, PageHeader } from '@loomis/ui-web';

interface SchoolShellProps {
  children: ReactNode;
}

export function SchoolShell({ children }: SchoolShellProps) {
  return (
    <SchoolAuthGate>
      <SchoolAcademicProvider>
        <AppShell
          sidebar={null}
          topBar={<SchoolTopBar />}
          topSlot={<SchoolHistoricalTermBanner />}
          contentClassName="dashboard-canvas"
        >
          <AuthTokenReadyGate>{children}</AuthTokenReadyGate>
        </AppShell>
      </SchoolAcademicProvider>
    </SchoolAuthGate>
  );
}

export { PageBody, PageHeader, DashboardPageHeader };
