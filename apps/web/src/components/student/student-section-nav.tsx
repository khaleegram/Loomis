'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, GraduationCap, type LucideIcon } from 'lucide-react';
import { cn } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCanAny } from '@/lib/auth/use-capability';

const STUDENT_LINKS: {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}[] = [
  { label: 'Registry', href: '/school/students', icon: GraduationCap, exact: true },
  { label: 'Admissions', href: '/school/students/admissions', icon: ClipboardList },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudentSectionNav() {
  const pathname = usePathname();
  const canView = useCanAny(['admissions.manage', 'admissions.approve', 'student.promote']);

  if (!canView) return null;

  return (
    <nav className={ACADEMIC_UI.subNavShell} aria-label="Student sections">
      {STUDENT_LINKS.map((link) => {
        const active = isActive(pathname, link.href, link.exact);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 min-h-[44px] sm:min-h-0',
              active ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon
              aria-hidden
              className={cn('size-3.5', active ? 'text-neutral-900' : 'text-neutral-400')}
            />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
