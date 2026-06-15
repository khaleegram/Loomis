'use client';

import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Layers, ShieldAlert } from 'lucide-react';

import { EXAMS_UI } from '@/lib/academic/exams-ui';
import { cn } from '@loomis/ui-web';

export type ExamsSection = 'schemes' | 'corrections';

export interface ExamsNavItem {
  id: ExamsSection;
  label: string;
  icon: LucideIcon;
  show: boolean;
  badge?: number;
}

interface ExamsNavProps {
  items: ExamsNavItem[];
  active: ExamsSection;
  onChange: (id: ExamsSection) => void;
  layout?: 'sidebar' | 'tabs';
}

export function ExamsNav({ items, active, onChange, layout = 'sidebar' }: ExamsNavProps) {
  const visible = items.filter((item) => item.show);
  if (visible.length === 0) return null;

  const navClass =
    layout === 'sidebar'
      ? 'flex flex-col gap-1'
      : 'flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1';

  return (
    <nav className={navClass} aria-label="Exam sections">
      {visible.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              layout === 'sidebar' ? EXAMS_UI.navItem : 'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold',
              isActive
                ? layout === 'sidebar'
                  ? EXAMS_UI.navItemActive
                  : 'bg-brand-500 text-neutral-900 shadow-sm ring-1 ring-brand-400/30'
                : layout === 'sidebar'
                  ? EXAMS_UI.navItemInactive
                  : 'text-neutral-600 hover:bg-brand-50',
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.badge ? (
              <span className="ml-auto rounded-full bg-brand-600 px-1.5 py-px text-[10px] font-bold text-white">
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
  schemes: { id: 'schemes' as const, label: 'Grading schemes', icon: Layers },
  corrections: { id: 'corrections' as const, label: 'Corrections', icon: ShieldAlert },
  publish: { label: 'Publish', icon: ClipboardList },
};
