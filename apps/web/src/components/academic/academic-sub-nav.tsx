'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  GraduationCap,
  LayoutGrid,
  Layers,
  Settings2,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCanAny } from '@/lib/auth/use-capability';
import { cn } from '@loomis/ui-web';

const ACADEMIC_LINKS: {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  capabilities?: Parameters<typeof useCanAny>[0];
}[] = [
  {
    label: 'Overview',
    href: '/school/academic',
    icon: LayoutGrid,
    exact: true,
    capabilities: [
      'academic_year.manage',
      'term.manage',
      'census.lock',
      'student.promote',
      'student.graduate',
    ],
  },
  {
    label: 'School year',
    href: '/school/academic/sessions',
    icon: Settings2,
    capabilities: ['academic_year.manage', 'term.manage', 'census.lock'],
  },
  {
    label: 'Structure',
    href: '/school/academic/structure',
    icon: Layers,
    capabilities: ['class_structure.manage'],
  },
  {
    label: 'Calendar',
    href: '/school/academic/calendar',
    icon: CalendarDays,
    capabilities: ['academic_year.manage', 'term.manage', 'census.lock', 'gradebook.read'],
  },
  {
    label: 'Promotions',
    href: '/school/academic/promotions',
    icon: Users,
    capabilities: ['student.promote'],
  },
  {
    label: 'Graduation',
    href: '/school/academic/graduation',
    icon: GraduationCap,
    capabilities: ['student.graduate'],
  },
];

function NavLink({
  link,
  pathname,
}: {
  link: (typeof ACADEMIC_LINKS)[number];
  pathname: string;
}) {
  const allowed = useCanAny(link.capabilities ?? []);
  if (!allowed) return null;

  const active = link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`);
  const Icon = link.icon;

  return (
    <Link
      href={link.href}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold transition-all duration-200 min-h-[44px] sm:min-h-0',
        active ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        aria-hidden
        className={cn('size-3.5 transition-colors', active ? 'text-neutral-900' : 'text-neutral-400')}
      />
      {link.label}
    </Link>
  );
}

export function AcademicSubNav() {
  const pathname = usePathname();

  return (
    <nav className={ACADEMIC_UI.subNavShell} aria-label="Academic sections">
      {ACADEMIC_LINKS.map((link) => (
        <NavLink key={link.href} link={link} pathname={pathname} />
      ))}
    </nav>
  );
}
