'use client';

import type { LucideIcon } from 'lucide-react';
import { Bell, Megaphone, MessageCircle } from 'lucide-react';

import { COMMS_UI } from '@/lib/comms/comms-ui';
import { cn } from '@loomis/ui-web';

export type CommsSection = 'announcements' | 'parents' | 'notifications';

export interface CommsNavItem {
  id: CommsSection;
  label: string;
  icon: LucideIcon;
  show: boolean;
  badge?: number;
}

interface CommsNavProps {
  items: CommsNavItem[];
  active: CommsSection;
  onChange: (id: CommsSection) => void;
  layout?: 'sidebar' | 'tabs';
}

export function CommsNav({ items, active, onChange, layout = 'sidebar' }: CommsNavProps) {
  const visible = items.filter((item) => item.show);

  if (visible.length === 0) return null;

  const navClass =
    layout === 'sidebar'
      ? 'flex flex-col gap-1'
      : 'flex gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1';

  return (
    <nav className={navClass} aria-label="Communication sections">
      {visible.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              layout === 'sidebar' ? COMMS_UI.navItem : 'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold',
              isActive
                ? layout === 'sidebar'
                  ? COMMS_UI.navItemActive
                  : 'bg-brand-500 text-neutral-900 shadow-sm ring-1 ring-brand-400/30'
                : layout === 'sidebar'
                  ? COMMS_UI.navItemInactive
                  : 'text-neutral-600 hover:bg-brand-50',
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {item.badge ? (
              <span className="ml-auto rounded-full bg-brand-600 px-1.5 py-px text-[10px] font-bold text-white">
                {item.badge}
              </span>
            ) : isActive && layout === 'sidebar' ? (
              <span className="ml-auto size-1.5 rounded-full bg-brand-500" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

export const COMMS_NAV_ITEMS = {
  announcements: { id: 'announcements' as const, label: 'Announce', icon: Megaphone },
  parents: { id: 'parents' as const, label: 'Parents', icon: MessageCircle },
  notifications: { id: 'notifications' as const, label: 'Inbox', icon: Bell },
};
