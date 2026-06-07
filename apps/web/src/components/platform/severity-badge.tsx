import { cn } from '@loomis/ui-web';
import type { IvpCasePriority } from '@loomis/contracts';

interface SeverityBadgeProps {
  priority: IvpCasePriority;
  className?: string;
}

const SEVERITY_STYLES: Record<IvpCasePriority, string> = {
  urgent:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800',
  standard:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800',
  watchlist:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800',
};

const SEVERITY_DOT: Record<IvpCasePriority, string> = {
  urgent: 'bg-red-500',
  standard: 'bg-amber-500',
  watchlist: 'bg-blue-500',
};

const SEVERITY_LABELS: Record<IvpCasePriority, string> = {
  urgent: 'Urgent',
  standard: 'Standard',
  watchlist: 'Watchlist',
};

/** Severity pill badge with coloured dot for IVP anomaly cases. */
export function SeverityBadge({ priority, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        SEVERITY_STYLES[priority],
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', SEVERITY_DOT[priority])} />
      {SEVERITY_LABELS[priority]}
    </span>
  );
}

/** Left-border colour class for a table row, keyed by severity. */
export const SEVERITY_ROW_BORDER: Record<IvpCasePriority, string> = {
  urgent: 'border-l-red-500',
  standard: 'border-l-amber-500',
  watchlist: 'border-l-blue-500',
};
