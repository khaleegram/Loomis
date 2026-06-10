import type { ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export interface DashboardPageHeaderProps {
  greeting?: string;
  /** Bold brand-colored name inside the greeting (e.g. "Platform Owner"). */
  greetingName?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** Executive dashboard page header — greeting, large title, period/export actions. */
export function DashboardPageHeader({
  greeting,
  greetingName,
  title,
  description,
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn('mb-7', className)}>
      {(greeting ?? greetingName) ? (
        <p className="mb-1.5 text-[13px] text-neutral-500">
          {greeting ? (
            <>
              {greeting.split(greetingName ?? '').map((part, i, arr) =>
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    {greetingName ? (
                      <span className="font-semibold text-blue-600">{greetingName}</span>
                    ) : null}
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
            </>
          ) : null}
          {!greeting && greetingName ? (
            <span className="font-semibold text-blue-600">{greetingName}</span>
          ) : null}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.025em] text-neutral-900">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2.5 sm:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
