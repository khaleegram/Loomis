'use client';

import type { LucideIcon } from 'lucide-react';
import { LogOut, Settings } from 'lucide-react';

import { cn } from '@loomis/ui-web';

export interface WorkspaceNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function WorkspaceMenuItem({ item, active }: { item: WorkspaceNavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <a
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-[13.5px] font-semibold transition-all duration-200',
        active
          ? 'bg-brand-600 text-white shadow-[0_4px_12px_rgba(153,121,77,0.28)]'
          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          active
            ? 'bg-white/15 text-white'
            : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200/50 group-hover:text-neutral-700',
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="truncate">{item.label}</span>
      {active ? (
        <span
          className="ml-auto size-1.5 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(153,121,77,0.65)]"
          aria-hidden
        />
      ) : null}
    </a>
  );
}

export function WorkspaceMenuSection({
  title,
  items,
  pathname,
  isActive,
}: {
  title: string;
  items: WorkspaceNavItem[];
  pathname: string;
  isActive: (pathname: string, href: string) => boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="px-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400/80">{title}</p>
      <nav className="space-y-0.5" aria-label={`${title} navigation`}>
        {items.map((item) => (
          <WorkspaceMenuItem key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
    </div>
  );
}

export function WorkspaceMenu({
  sections,
  pathname,
  isActive,
  onSignOut,
  settingsHref,
  settingsActive,
  showSettings = true,
}: {
  sections: { title: string; items: WorkspaceNavItem[] }[];
  pathname: string;
  isActive: (pathname: string, href: string) => boolean;
  onSignOut: () => void;
  settingsHref?: string;
  settingsActive?: boolean;
  showSettings?: boolean;
}) {
  return (
    <div className="space-y-4 p-1">
      <div className="space-y-4">
        {sections.map((section) => (
          <WorkspaceMenuSection
            key={section.title}
            title={section.title}
            items={section.items}
            pathname={pathname}
            isActive={isActive}
          />
        ))}
      </div>

      <div className="border-t border-neutral-100 pt-2.5">
        {showSettings && settingsHref ? (
          <WorkspaceMenuItem
            item={{ label: 'Settings', href: settingsHref, icon: Settings }}
            active={settingsActive ?? isActive(pathname, settingsHref)}
          />
        ) : null}
        <button
          type="button"
          onClick={onSignOut}
          className="group mt-0.5 flex w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-[13.5px] font-semibold text-neutral-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 transition-colors group-hover:bg-red-100 group-hover:text-red-500">
            <LogOut aria-hidden className="size-4" />
          </span>
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
