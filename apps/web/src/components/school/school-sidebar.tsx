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
  const { session, signOut } = useAuth();

  if (!session) return null;

  const visibleNav = SCHOOL_NAV.filter((item) => isNavVisible(session.role, item));

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-5">
        <Link href="/school/dashboard" className="text-lg font-semibold tracking-tight text-brand-700">
          Loomis
        </Link>
        <p className="mt-1 truncate text-xs text-neutral-500 capitalize">
          {session.role.replace(/_/g, ' ')}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="School console">
        {visibleNav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/school/dashboard' && pathname.startsWith(`${item.href}/`)) ||
            (item.href === '/school/settings/security' && pathname.startsWith('/school/settings'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
