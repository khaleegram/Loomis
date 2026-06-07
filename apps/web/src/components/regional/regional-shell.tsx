'use client';

import type { ReactNode } from 'react';

import { RegionalAuthGate } from '@/components/regional/regional-auth-gate';
import { RegionalSidebar } from '@/components/regional/regional-sidebar';
import { RegionalTopBar } from '@/components/regional/regional-top-bar';

interface RegionalShellProps {
  children: ReactNode;
  breadcrumbs?: ReactNode;
}

/** Regional console shell — Command Atlas styling, emerald/gold accents. */
export function RegionalShell({ children, breadcrumbs }: RegionalShellProps) {
  return (
    <RegionalAuthGate>
      <div className="flex min-h-screen bg-neutral-50 dark:bg-forest-950">
        <RegionalSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <RegionalTopBar breadcrumbs={breadcrumbs} />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </div>
    </RegionalAuthGate>
  );
}

export { PageBody, PageHeader } from '@/components/layout/page-header';
