'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@loomis/ui-web';

const SETTINGS_LINKS = [
  { label: 'Appearance', href: '/school/settings/appearance' },
  { label: 'Security', href: '/school/settings/security' },
] as const;

export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex gap-1 border-b border-border"
      aria-label="Settings sections"
    >
      {SETTINGS_LINKS.map((link) => {
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
