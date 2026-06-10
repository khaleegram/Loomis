'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils.js';
import type { MetricAccent } from './metric-card.js';

const ACCENT_GRADIENT: Record<MetricAccent, string> = {
  blue:   'linear-gradient(135deg,#3B82F6,#1D4ED8)',
  violet: 'linear-gradient(135deg,#8B5CF6,#5B21B6)',
  green:  'linear-gradient(135deg,#10B981,#065F46)',
  orange: 'linear-gradient(135deg,#F97316,#C2410C)',
  teal:   'linear-gradient(135deg,#14B8A6,#0F766E)',
  rose:   'linear-gradient(135deg,#F43F5E,#9F1239)',
  amber:  'linear-gradient(135deg,#F59E0B,#92400E)',
  indigo: 'linear-gradient(135deg,#6366F1,#3730A3)',
  cyan:   'linear-gradient(135deg,#06B6D4,#155E75)',
  pink:   'linear-gradient(135deg,#EC4899,#9D174D)',
};

export interface MetricStripCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: MetricAccent;
  children?: ReactNode;
  className?: string;
}

export function MetricStripCard({
  label,
  value,
  icon: Icon,
  accent = 'blue',
  children,
  className,
}: MetricStripCardProps) {
  return (
    <div
      className={cn(
        'card flex min-w-[160px] flex-1 items-center gap-3 rounded-2xl px-4 py-4',
        className,
      )}
    >
      {Icon ? (
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ background: ACCENT_GRADIENT[accent] }}
        >
          <Icon aria-hidden className="size-4.5" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">{label}</p>
        <p className="truncate text-[18px] font-bold tabular-nums text-neutral-900">{value}</p>
        {children}
      </div>
    </div>
  );
}

export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-3', className)}>
      {children}
    </div>
  );
}
