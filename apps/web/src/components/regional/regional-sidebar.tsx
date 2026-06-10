'use client';

import { usePathname } from 'next/navigation';

import { AppBar } from '@/components/layout/app-bar';
import { navItemsToSearchItems } from '@/components/layout/smart-search-palette';
import { WorkspaceMenu } from '@/components/layout/workspace-menu';
import { regionalNavForRole } from '@/components/regional/regional-nav-config';
import { useAuth } from '@/lib/auth/auth-context';

const ROLE_LABELS: Record<string, string> = {
  regional_manager: 'Regional Manager',
  regional_subordinate: 'Regional Officer',
};

function isRegionalNavActive(pathname: string, href: string): boolean {
  if (href === '/regional/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function RegionalSidebar() {
  return null;
}

export function RegionalTopBar() {
  const pathname = usePathname();
  const { session, signOut } = useAuth();

  if (!session) return null;

  const roleLabel = ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ');
  const navItems = regionalNavForRole(session.role);

  return (
    <AppBar
      workspace={{ label: 'Regional', value: 'Regional' }}
      searchPlaceholder="Search schools, territories, earnings…"
      searchAriaLabel="Search regional console"
      searchItems={navItemsToSearchItems([{ title: 'Workspace', items: navItems }])}
      roleLabel={roleLabel}
      scopeLine="Nigeria · Referral network"
      workspaceMenu={
        <WorkspaceMenu
          sections={[{ title: 'Workspace', items: navItems }]}
          pathname={pathname}
          isActive={isRegionalNavActive}
          showSettings={false}
          onSignOut={() => void signOut()}
        />
      }
    />
  );
}
