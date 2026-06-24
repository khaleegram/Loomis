'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@loomis/ui-web';

import { useCan } from '@/lib/auth/use-capability';

const SETTINGS_LINKS = [
  { label: 'Profile', href: '/school/settings/profile' },
  { label: 'Appearance', href: '/school/settings/appearance' },
  { label: 'Security', href: '/school/settings/security' },
  {
    label: 'Fee reminders',
    href: '/school/settings/finance-reminders',
    capability: 'finance.balances.view' as const,
  },
  { label: 'Audit log', href: '/school/settings/audit', capability: 'audit.view' as const },
  { label: 'Experience', href: '/school/settings/experience', ownerOnly: true },
] as const;

export function SettingsSubNav() {
  const pathname = usePathname();
  const isOwner = useCan('census.lock');
  const canAudit = useCan('audit.view');
  const canFinance = useCan('finance.balances.view');

  return (
    <nav
      className={cn(
        'mb-6 flex w-full gap-1 overflow-x-auto border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      )}
      aria-label="Settings sections"
    >
      {SETTINGS_LINKS.filter((link) => {
        if ('ownerOnly' in link && link.ownerOnly && !isOwner) return false;
        if ('capability' in link && link.capability === 'audit.view' && !canAudit) return false;
        if ('capability' in link && link.capability === 'finance.balances.view' && !canFinance)
          return false;
        return true;
      }).map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
