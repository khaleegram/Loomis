'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { can, type Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';
import { Button, cn } from '@loomis/ui-web';

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

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-5">
        <Link
          href="/school/dashboard"
          className="font-serif text-lg font-semibold tracking-tight text-brand-700 dark:text-mint-400"
        >
          Loomis
        </Link>
        <p className="mt-1 truncate text-xs text-muted-foreground capitalize">
          {session.role.replace(/_/g, ' ')}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="School console">
        {visibleNav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/school/dashboard' && pathname.startsWith(`${item.href}/`)) ||
            (item.href === '/school/settings' && pathname.startsWith('/school/settings'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 lg:hidden">
        <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
          <Link href="/school/settings">Settings</Link>
        </Button>
      </div>
    </aside>
  );
}
