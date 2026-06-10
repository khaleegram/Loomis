import type { ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
}

/** Standard inner-page header with bottom border. */
export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-5 shadow-xs">
      {breadcrumbs ? <div className="mb-3 text-sm text-muted-foreground">{breadcrumbs}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn('mx-auto w-full max-w-7xl flex-1 px-6 py-6 lg:px-8 lg:py-8', className)}>
      {children}
    </main>
  );
}
