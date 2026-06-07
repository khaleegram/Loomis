'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, Separator } from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import { regionalNavForRole } from '@/components/regional/regional-nav-config';

const ROLE_LABELS: Record<string, string> = {
  regional_manager: 'Regional Manager',
  regional_subordinate: 'Regional Subordinate',
};

export function RegionalSidebar() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (!session) return null;

  const navItems = regionalNavForRole(session.role);
  const roleLabel = ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ');

  return (
    <aside
      className={cn(
        'flex w-60 shrink-0 flex-col',
        'border-r border-neutral-200 dark:border-forest-800',
        'bg-neutral-100 dark:bg-forest-950',
      )}
    >
      <div className="border-b border-neutral-200 px-5 py-5 dark:border-forest-800">
        <Link
          href="/regional/dashboard"
          className="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <span className="font-serif text-lg font-semibold tracking-tight text-brand-700 dark:text-gold-400">
            Loomis
          </span>
          <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Regional
          </span>
        </Link>
        <p className="mt-1.5 text-xs text-neutral-500">{roleLabel}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="Regional console navigation">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/regional/dashboard' && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400',
                active
                  ? 'border-gold-400 bg-gold-50 text-gold-700 dark:border-gold-400 dark:bg-forest-800 dark:text-gold-300'
                  : 'border-transparent text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-forest-800 dark:hover:text-neutral-100',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-neutral-200 dark:bg-forest-800" />

      <div className="p-4">
        <p className="text-[10px] uppercase tracking-widest text-neutral-400">Territory</p>
        <p className="mt-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Nigeria · Read-only analytics
        </p>
      </div>
    </aside>
  );
}
