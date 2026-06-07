'use client';

import type { ReactNode } from 'react';

import { PlatformAuthGate } from '@/components/platform/platform-auth-gate';
import { PlatformSidebar, PlatformTopBar } from '@/components/platform/platform-sidebar';
import { SCHOOLHUB } from '@/components/platform/schoolhub-stat-card';

interface PlatformShellProps {
  children: ReactNode;
}

/** Island-shell — soft page bg visible behind floating islands. */
export function PlatformShell({ children }: PlatformShellProps) {
  return (
    <PlatformAuthGate>
      <div className="flex min-h-screen" style={{ backgroundColor: SCHOOLHUB.pageBg }}>
        {/* Sidebar: white panel, no inner border-radius — fills full height */}
        <PlatformSidebar />
        {/* Main column: transparent bg so page bg shows through the island bar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <PlatformTopBar />
          {/* Page content sits on the page bg — cards/panels are white */}
          <div className="flex flex-1 flex-col overflow-auto">{children}</div>
        </div>
      </div>
    </PlatformAuthGate>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <main className="flex-1 p-6">{children}</main>;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumbs ? <div className="mb-3 text-sm text-[#64748B]">{breadcrumbs}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">{title}</h1>
          {description ? <p className="mt-1 text-sm text-[#64748B]">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
