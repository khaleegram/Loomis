'use client';

import { useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@loomis/ui-web';

// ── Inline SVG sparkline (no extra Recharts instance for hover state) ──────────

interface SparkLineProps {
  data: number[];
  trend: 'up' | 'down' | 'neutral';
  className?: string;
}

function SparkLine({ data, trend, className }: SparkLineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 120;
  const H = 36;
  const P = 2;

  const points = data
    .map((v, i) => {
      const x = P + (i / (data.length - 1)) * (W - 2 * P);
      const y = H - P - ((v - min) / range) * (H - 2 * P);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const strokeColor =
    trend === 'up'
      ? '#15803d'
      : trend === 'down'
        ? '#b91c1c'
        : '#94a3b8';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn('w-full', className)}
      aria-hidden
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  subValue?: string;
  /** Percentage change (positive = up, negative = down, null = no data). */
  change?: number | null;
  changePeriod?: string;
  /** Data points for the hover sparkline. */
  sparklineData?: number[];
  className?: string;
}

/**
 * Minimalist KPI card — large Playfair number at rest, inline sparkline on hover.
 * Command Centre design: hairline border, gold top accent on hover.
 */
export function KpiCard({
  label,
  value,
  subValue,
  change,
  changePeriod = 'vs last month',
  sparklineData,
  className,
}: KpiCardProps) {
  const [hovered, setHovered] = useState(false);

  const trend =
    change == null ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
        ? 'text-danger'
        : 'text-muted-foreground';

  const hasSparkline = sparklineData && sparklineData.length >= 2;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-white p-5 transition-all duration-200',
        'border-neutral-200 dark:border-forest-800 dark:bg-forest-900',
        'hover:border-gold-300 hover:shadow-md dark:hover:border-gold-600/50',
        className,
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gold top-border accent on hover */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] bg-gold-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />

      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
        {label}
      </p>

      <p className="mt-2 font-serif text-[1.75rem] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">
        {value}
      </p>

      {subValue ? (
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subValue}</p>
      ) : null}

      {/* Sparkline — slides in on hover */}
      {hasSparkline ? (
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            hovered ? 'mt-3 max-h-9 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <SparkLine data={sparklineData} trend={trend} />
        </div>
      ) : null}

      {change != null ? (
        <div className={cn('mt-3 flex items-center gap-1 text-xs font-medium', trendColor)}>
          <TrendIcon aria-hidden className="size-3.5" />
          <span>{Math.abs(change).toFixed(1)}%</span>
          <span className="text-neutral-400 dark:text-neutral-500">{changePeriod}</span>
        </div>
      ) : null}
    </div>
  );
}
