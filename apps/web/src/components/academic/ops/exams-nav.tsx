'use client';

import type { LucideIcon } from 'lucide-react';
import { Layers, ShieldAlert, Upload } from 'lucide-react';

import { cn } from '@loomis/ui-web';

export type ExamsSection = 'schemes' | 'corrections' | 'publish';

export interface ExamsNavItem {
  id: ExamsSection;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface ExamsNavProps {
  items: ExamsNavItem[];
  active: ExamsSection;
  onChange: (id: ExamsSection) => void;
}

export function ExamsNav({ items, active, onChange }: ExamsNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1"
      aria-label="Exam sections"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold',
              isActive
                ? 'bg-brand-500 text-neutral-900 shadow-sm ring-1 ring-brand-400/30'
                : 'text-neutral-600 hover:bg-brand-50',
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span>{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-brand-600 px-1.5 py-px text-[10px] font-bold text-white">
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export const EXAMS_NAV_ITEMS = {
  schemes: { id: 'schemes' as const, label: 'Grading', icon: Layers },
  corrections: { id: 'corrections' as const, label: 'Corrections', icon: ShieldAlert },
  publish: { id: 'publish' as const, label: 'Publish', icon: Upload },
};
