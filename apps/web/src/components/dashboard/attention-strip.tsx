'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';
import type { AttentionStripStat } from '@/lib/leadership/leadership-attention';

const DEFAULT_GRADIENTS = [
  SURFACES.kpi.g1,
  SURFACES.kpi.g2,
  SURFACES.kpi.g3,
  SURFACES.kpi.g4,
] as const;

export interface AttentionStripItem extends AttentionStripStat {
  icon: LucideIcon;
  gradient?: string;
}

interface AttentionStripProps {
  items: AttentionStripItem[];
  className?: string;
}

/** KPI strip for Core leadership homes — pattern from workflow-inbox-hero / admin-officer dashboard. */
export function AttentionStrip({ items, className }: AttentionStripProps) {
  return (
    <div
      className={cn(
        'relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4',
        className,
      )}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const gradient = item.gradient ?? DEFAULT_GRADIENTS[index % DEFAULT_GRADIENTS.length];
        return (
          <div key={item.label} className="card overflow-hidden rounded-xl p-4 sm:p-5">
            <span
              className="mb-3 flex size-8 items-center justify-center rounded-xl text-white shadow-sm sm:size-9"
              style={{ background: gradient }}
            >
              <Icon aria-hidden className="size-3.5 sm:size-4" />
            </span>
            <p className={ACADEMIC_UI.sectionLabel}>{item.label}</p>
            <p
              className="mt-1 line-clamp-2 tabular-nums leading-none text-foreground"
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.35rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
              }}
            >
              {item.value}
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] font-medium text-muted-foreground">
              {item.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}
