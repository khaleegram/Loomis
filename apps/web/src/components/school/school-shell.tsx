'use client';

import type { ReactNode } from 'react';

import { SchoolAuthGate } from '@/components/school/school-auth-gate';
import { SchoolSidebar } from '@/components/school/school-sidebar';

interface SchoolShellProps {
  children: ReactNode;
}

export function SchoolShell({ children }: SchoolShellProps) {
  return (
    <SchoolAuthGate>
      <div className="flex min-h-screen bg-neutral-50">
        <SchoolSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SchoolAuthGate>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-neutral-200 bg-white px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function PageBody({ children }: { children: ReactNode }) {
  return <main className="flex-1 p-6">{children}</main>;
}
