'use client';

import type { ReactNode } from 'react';

import { ConsoleShell } from '@/components/layout/console-shell';
import { ParentSidebar } from '@/components/parent/parent-sidebar';

interface ParentShellProps {
  children: ReactNode;
}

export function ParentShell({ children }: ParentShellProps) {
  return <ConsoleShell sidebar={<ParentSidebar />}>{children}</ConsoleShell>;
}

export { PageBody, PageHeader } from '@/components/layout/page-header';
