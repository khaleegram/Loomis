'use client';

import type { ReactNode } from 'react';

import { ConsoleTopBar } from '@/components/layout/console-top-bar';

interface ConsoleShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  breadcrumbs?: ReactNode;
}

/** Dense sidebar + top bar + max-w content rail (Option 1 console pattern). */
export function ConsoleShell({ sidebar, children, breadcrumbs }: ConsoleShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        <ConsoleTopBar breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
