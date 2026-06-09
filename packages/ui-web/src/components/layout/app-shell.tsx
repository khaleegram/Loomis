'use client';

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export interface AppShellProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
  topSlot?: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** V2 console layout — sidebar + app bar + scrollable main column. */
export function AppShell({ sidebar, topBar, children, topSlot, className, contentClassName }: AppShellProps) {
  return (
    <div className={cn('flex h-screen overflow-hidden bg-background', className)}>
      {sidebar}
      <div className="relative flex min-w-0 flex-1 transform-gpu flex-col overflow-hidden">
        {topSlot}
        {topBar}
        <div data-scroll-content className={cn('flex flex-1 flex-col overflow-y-auto', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
