import { cn } from '../../lib/utils.js';

export interface ProgressStripProps {
  label: string;
  valueLabel: string;
  /** 0–100 */
  percent: number;
  /** When true, bar turns warning/danger near cap. */
  nearCap?: boolean;
  className?: string;
}

/** Horizontal cap-meter strip for referral payout limits. */
export function ProgressStrip({
  label,
  valueLabel,
  percent,
  nearCap = false,
  className,
}: ProgressStripProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const barColor = nearCap || clamped >= 90
    ? 'bg-danger'
    : clamped >= 70
      ? 'bg-warning'
      : 'bg-gold-400';

  return (
    <div
      className={cn(
        'rounded-sm border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-forest-800 dark:bg-forest-900',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="font-medium text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
          {valueLabel}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-forest-800">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}
