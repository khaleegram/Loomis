'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import { PARENT_NAV, STUDENT_NAV, type ParentNavItem } from '@/components/parent/parent-nav-config';

export function ParentSidebar() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (!session) return null;

  const isStudent = session.role === 'student';
  const nav = isStudent ? STUDENT_NAV : PARENT_NAV;

  const visibleNav = nav.filter((item) => {
    if (item.always) return true;
    if (item.roles) return item.roles.includes(session.role);
    return true;
  });

  const roleLabel = isStudent ? 'Student' : 'Parent';

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-5">
        <Link href="/parent/dashboard" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-brand-600 dark:bg-mint-400/20">
            <span className="font-serif text-sm font-bold text-white dark:text-mint-400">L</span>
          </div>
          <div>
            <p className="font-serif text-lg font-semibold tracking-tight text-brand-700 dark:text-mint-400">Loomis</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{isStudent ? 'Student' : 'Parent'}</p>
          </div>
        </Link>
        <p className="mt-2 text-xs text-muted-foreground">{roleLabel}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="Portal navigation">
        {visibleNav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md border-l-[3px] px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-mint-400 dark:bg-forest-800 dark:text-mint-400'
                  : 'border-transparent text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-forest-800 dark:hover:text-neutral-100',
              )}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
