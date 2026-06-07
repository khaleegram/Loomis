'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@loomis/ui-web';

/** SchoolHub preview palette (option B — match template colors). */
export const SCHOOLHUB = {
  pageBg: '#F0F4FA',
  blue: '#5B93FF',
  yellow: '#FFD66B',
  purple: '#A594F9',
  orange: '#FFAE69',
  chartBlue: '#5B93FF',
  chartPurple: '#9B89EC',
  chartYellow: '#FFD66B',
} as const;

export type SchoolHubStatVariant = 'blue' | 'yellow' | 'purple' | 'orange';

const VARIANT_BG: Record<SchoolHubStatVariant, string> = {
  blue: SCHOOLHUB.blue,
  yellow: SCHOOLHUB.yellow,
  purple: SCHOOLHUB.purple,
  orange: SCHOOLHUB.orange,
};

interface SchoolHubStatCardProps {
  label: string;
  value: string;
  change?: number | null;
  changePeriod?: string;
  variant: SchoolHubStatVariant;
  className?: string;
}

export function SchoolHubStatCard({
  label,
  value,
  change,
  changePeriod = 'than last period',
  variant,
  className,
}: SchoolHubStatCardProps) {
  const positive = change != null && change >= 0;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[20px] p-5 text-white shadow-sm transition-transform hover:-translate-y-0.5',
        className,
      )}
      style={{ backgroundColor: VARIANT_BG[variant] }}
    >
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight">{value}</p>
      {change != null ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          <span className="flex items-center gap-0.5 rounded-full bg-white/25 px-2 py-0.5">
            <TrendIcon aria-hidden className="size-3" />
            {Math.abs(change).toFixed(0)}%
          </span>
          <span className="opacity-80">{changePeriod}</span>
        </div>
      ) : null}
    </div>
  );
}
