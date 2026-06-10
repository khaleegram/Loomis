'use client';

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Container for dashboard analytics charts. */
export function ChartCard({ title, description, action, children, className }: ChartCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card p-5 shadow-card',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">{title}</p>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
