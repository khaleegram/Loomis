'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can, type Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import { SCHOOL_NAV, type SchoolNavItem } from '@/components/school/school-nav-config';

function isNavVisible(role: Role, item: SchoolNavItem): boolean {
  if (item.always) return true;
  if (!item.capabilities?.length) return false;
  return item.capabilities.some((cap: Capability) => can(role, cap));
}

export function SchoolSidebar() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (!session) return null;

  const visibleNav = SCHOOL_NAV.filter((item) => isNavVisible(session.role, item));
  const roleLabel = session.role.replace(/_/g, ' ');

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link
          href="/school/dashboard"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded-sm"
        >
          <div className="flex size-8 items-center justify-center rounded-md bg-brand-600 dark:bg-mint-400/20">
            <span className="font-serif text-sm font-bold text-white dark:text-mint-400">L</span>
          </div>
          <div>
            <p className="font-serif text-lg font-semibold tracking-tight text-brand-700 dark:text-mint-400">
              Loomis
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-500">
              School
            </p>
          </div>
        </Link>
        <p className="mt-2 text-xs text-muted-foreground capitalize">{roleLabel}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="School console">
        {visibleNav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/school/dashboard' && pathname.startsWith(`${item.href}/`)) ||
            (item.href === '/school/settings' && pathname.startsWith('/school/settings'));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
                active
                  ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-mint-400 dark:bg-forest-800 dark:text-mint-400'
                  : 'border-transparent text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-forest-800 dark:hover:text-neutral-100',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
          Tenant
        </p>
        <p className="mt-1 px-3 text-xs font-mono text-neutral-500 dark:text-neutral-400 truncate">
          {session.tenantId?.slice(0, 8) ?? '—'}…
        </p>
      </div>
    </aside>
  );
}
