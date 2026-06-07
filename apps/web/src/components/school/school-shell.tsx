'use client';

import type { ReactNode } from 'react';

import { ConsoleShell } from '@/components/layout/console-shell';
import { SchoolAuthGate } from '@/components/school/school-auth-gate';
import { SchoolSidebar } from '@/components/school/school-sidebar';

interface SchoolShellProps {
  children: ReactNode;
}

export function SchoolShell({ children }: SchoolShellProps) {
  return (
    <SchoolAuthGate>
      <ConsoleShell sidebar={<SchoolSidebar />}>{children}</ConsoleShell>
    </SchoolAuthGate>
  );
}

export { PageBody, PageHeader } from '@/components/layout/page-header';
