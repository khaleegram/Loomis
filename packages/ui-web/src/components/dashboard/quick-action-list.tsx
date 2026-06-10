'use client';

import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
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

export interface QuickActionItem {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  accent?: MetricAccent;
}

export interface QuickActionListProps {
  title?: string;
  actions: QuickActionItem[];
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}

export function QuickActionList({
  title = 'Quick Actions',
  actions,
  viewAllHref,
  viewAllLabel = 'View all actions',
  className,
}: QuickActionListProps) {
  return (
    <div
      className={cn(
        'card flex flex-col rounded-2xl p-5',
        className,
      )}
    >
      <p className="mb-4 text-[15px] font-semibold text-neutral-900">{title}</p>
      <ul className="flex flex-1 flex-col gap-0.5">
        {actions.map((item) => {
          const Icon = item.icon;
          const accent = item.accent ?? 'blue';
          return (
            <li key={item.href + item.label}>
              <a
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-neutral-50"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: ACCENT_GRADIENT[accent] }}
                >
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-neutral-800">{item.label}</p>
                  {item.description ? (
                    <p className="text-xs text-neutral-500">{item.description}</p>
                  ) : null}
                </div>
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-600"
                />
              </a>
            </li>
          );
        })}
      </ul>
      {viewAllHref ? (
        <a
          href={viewAllHref}
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-neutral-600 hover:text-neutral-900"
        >
          {viewAllLabel}
          <ArrowRight aria-hidden className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}
