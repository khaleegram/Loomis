'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export type TrendSentiment = 'positive' | 'negative' | 'neutral';

export interface TrendBadgeProps {
  value: number | null;
  period?: string;
  className?: string;
  /** Override automatic sentiment from sign of value */
  sentiment?: TrendSentiment;
}

function resolveSentiment(value: number, override?: TrendSentiment): TrendSentiment {
  if (override) return override;
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

const SENTIMENT_STYLES: Record<TrendSentiment, string> = {
  positive: 'bg-accent-green-50 text-accent-green-700 ring-accent-green-100 dark:bg-accent-green-500/10 dark:text-accent-green-500',
  negative: 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-400',
  neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400',
};

/** Compact trend pill for KPI cards — e.g. "+5.4% this term". */
export function TrendBadge({ value, period, className, sentiment }: TrendBadgeProps) {
  if (value == null) return null;

  const resolved = resolveSentiment(value, sentiment);
  const TrendIcon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        SENTIMENT_STYLES[resolved],
        className,
      )}
    >
      <TrendIcon aria-hidden className="size-3" />
      {Math.abs(value).toFixed(1)}%
      {period ? <span className="font-normal opacity-80">{period}</span> : null}
    </span>
  );
}
