'use client';

import { usePathname } from 'next/navigation';

import { AppBar } from '@/components/layout/app-bar';
import { navItemsToSearchItems } from '@/components/layout/smart-search-palette';
import { WorkspaceMenu } from '@/components/layout/workspace-menu';
import { PARENT_NAV, STUDENT_NAV, type ParentNavItem } from '@/components/parent/parent-nav-config';
import { useAuth } from '@/lib/auth/auth-context';

function isParentNavActive(pathname: string, href: string): boolean {
  if (href === '/parent/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function filterNav(items: ParentNavItem[], role: string): ParentNavItem[] {
  return items.filter((item) => {
    if (item.always) return true;
    if (item.roles) return item.roles.includes(role);
    return true;
  });
}

export function ParentSidebar() {
  return null;
}

export function ParentTopBar() {
  const pathname = usePathname();
  const { session, signOut } = useAuth();

  if (!session) return null;

  const isStudent = session.role === 'student';
  const roleLabel = isStudent ? 'Student' : 'Parent';
  const workspaceLabel = isStudent ? 'Student' : 'Parent';
  const nav = filterNav(isStudent ? STUDENT_NAV : PARENT_NAV, session.role);
  const settingsItem = nav.find((item) => item.href === '/parent/contact');
  const mainNav = nav.filter((item) => item.href !== '/parent/contact');

  return (
    <AppBar
      workspace={{ label: workspaceLabel, value: workspaceLabel }}
      searchPlaceholder={isStudent ? 'Search results, timetable…' : 'Search children, fees, results…'}
      searchAriaLabel={isStudent ? 'Search student portal' : 'Search family portal'}
      searchItems={navItemsToSearchItems([{ title: 'Portal', items: mainNav }])}
      roleLabel={roleLabel}
      scopeLine={isStudent ? 'Your school account' : 'Linked children'}
      workspaceMenu={
        <WorkspaceMenu
          sections={[{ title: 'Portal', items: mainNav }]}
          pathname={pathname}
          isActive={isParentNavActive}
          settingsHref={settingsItem?.href}
          showSettings={Boolean(settingsItem)}
          onSignOut={() => void signOut()}
        />
      }
    />
  );
}
