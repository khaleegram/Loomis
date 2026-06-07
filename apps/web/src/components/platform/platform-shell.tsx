'use client';

import type { ReactNode } from 'react';

import { PlatformAuthGate } from '@/components/platform/platform-auth-gate';
import { PlatformSidebar } from '@/components/platform/platform-sidebar';
import { PlatformTopBar } from '@/components/platform/platform-top-bar';

interface PlatformShellProps {
  children: ReactNode;
  breadcrumbs?: ReactNode;
}

/** Distinct platform ConsoleShell — forest sidebar, gold active bar, break-glass strip. */
export function PlatformShell({ children, breadcrumbs }: PlatformShellProps) {
  return (
    <PlatformAuthGate>
      <div className="flex min-h-screen bg-neutral-50 dark:bg-forest-950">
        <PlatformSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PlatformTopBar breadcrumbs={breadcrumbs} />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </div>
    </PlatformAuthGate>
  );
}

export { PageBody, PageHeader } from '@/components/layout/page-header';
