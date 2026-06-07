import { cn } from '../../lib/utils.js';

export interface CountdownRingProps {
  /** 0–100 progress (100 = full time remaining, 0 = expired). */
  progress: number;
  /** Center label, e.g. "48h" or "12d". */
  label: string;
  /** Ring diameter in px. */
  size?: number;
  /** When true, ring uses danger colours. */
  urgent?: boolean;
  className?: string;
}

/**
 * Circular countdown indicator for NDPC breach deadlines and DSAR due dates.
 */
export function CountdownRing({
  progress,
  label,
  size = 44,
  urgent = false,
  className,
}: CountdownRingProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const stroke = urgent ? 'var(--color-danger)' : 'var(--color-gold-400)';
  const track = urgent ? 'rgb(185 28 28 / 0.15)' : 'rgb(212 175 55 / 0.2)';
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label} remaining`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span
        className={cn(
          'absolute font-mono text-[9px] font-semibold tabular-nums',
          urgent ? 'text-danger' : 'text-gold-700 dark:text-gold-300',
        )}
      >
        {label}
      </span>
    </div>
  );
}
