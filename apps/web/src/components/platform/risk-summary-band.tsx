'use client';

import { cn } from '@loomis/ui-web';
import type { IvpCasePriority } from '@loomis/contracts';

interface SeverityCount {
  priority: IvpCasePriority;
  label: string;
  count: number;
  colorClass: string;
  dotClass: string;
  activeClass: string;
}

const SEVERITY_COUNTS: Omit<SeverityCount, 'count'>[] = [
  {
    priority: 'urgent',
    label: 'Urgent',
    colorClass: 'text-red-700 dark:text-red-400',
    dotClass: 'bg-red-500',
    activeClass: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
  },
  {
    priority: 'standard',
    label: 'Standard',
    colorClass: 'text-amber-700 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    activeClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800',
  },
  {
    priority: 'watchlist',
    label: 'Watchlist',
    colorClass: 'text-blue-700 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    activeClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800',
  },
];

interface RiskSummaryBandProps {
  counts: Record<IvpCasePriority, number>;
  activeFilter: IvpCasePriority | null;
  onFilter: (priority: IvpCasePriority | null) => void;
  totalOpen: number;
}

/**
 * Compact severity count band above the risk case table.
 * Clicking a count chip auto-filters the table.
 */
export function RiskSummaryBand({
  counts,
  activeFilter,
  onFilter,
  totalOpen,
}: RiskSummaryBandProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => onFilter(null)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          activeFilter === null
            ? 'border-neutral-300 bg-neutral-900 text-white dark:border-forest-600 dark:bg-forest-700 dark:text-neutral-100'
            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-forest-800 dark:bg-forest-900 dark:text-neutral-300 dark:hover:bg-forest-800',
        )}
        aria-pressed={activeFilter === null}
      >
        <span className="text-xs uppercase tracking-wide opacity-70">All Open</span>
        <span className="text-lg font-semibold tabular-nums leading-none">{totalOpen}</span>
      </button>

      {SEVERITY_COUNTS.map(({ priority, label, colorClass, dotClass, activeClass }) => {
        const count = counts[priority] ?? 0;
        const isActive = activeFilter === priority;
        return (
          <button
            key={priority}
            onClick={() => onFilter(isActive ? null : priority)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? activeClass
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-forest-800 dark:bg-forest-900 dark:text-neutral-300 dark:hover:bg-forest-800',
            )}
            aria-pressed={isActive}
          >
            <span className={cn('flex items-center gap-1.5', colorClass)}>
              <span aria-hidden className={cn('size-2 rounded-full', dotClass)} />
              <span className="text-xs uppercase tracking-wide">{label}</span>
            </span>
            <span className={cn('text-lg font-semibold tabular-nums leading-none', colorClass)}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
