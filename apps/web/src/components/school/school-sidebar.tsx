'use client';

import { usePathname } from 'next/navigation';
import { can, type Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';

import { useWorkflowInbox } from '@loomis/api-client';

import { AppBar } from '@/components/layout/app-bar';
import { navItemsToSearchItems } from '@/components/layout/smart-search-palette';
import { WorkspaceMenu, type WorkspaceNavItem } from '@/components/layout/workspace-menu';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import {
  SCHOOL_NAV,
  STAFF_PRIMARY_ROLE_LABELS,
  type SchoolNavItem,
} from '@/components/school/school-nav-config';

function isNavVisible(role: Role, item: SchoolNavItem): boolean {
  if (item.always) return true;
  if (!item.capabilities?.length) return false;
  return item.capabilities.some((cap: Capability) => can(role, cap));
}

function isSchoolNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/school/dashboard') return false;
  if (href === '/school/settings') return pathname.startsWith('/school/settings');
  return pathname.startsWith(`${href}/`);
}

export function SchoolSidebar() {
  return null;
}

export function SchoolTopBar() {
  const pathname = usePathname();
  const tenantId = useTenantId();
  const { session, signOut } = useAuth();
  const { data: inboxData } = useWorkflowInbox(tenantId ?? '');
  const inboxCount = inboxData?.items.length ?? 0;

  if (!session) return null;

  const roleLabel = STAFF_PRIMARY_ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ');
  const visibleNav = SCHOOL_NAV.filter((item) => isNavVisible(session.role, item));
  const workspaceItems: WorkspaceNavItem[] = visibleNav.filter(
    (item) => item.section !== 'ledger' && item.href !== '/school/settings',
  );
  const ledgerItems: WorkspaceNavItem[] = visibleNav.filter((item) => item.section === 'ledger');

  const sections: { title: string; items: WorkspaceNavItem[] }[] = [
    { title: 'Workspace', items: workspaceItems },
    { title: 'Ledger Flows', items: ledgerItems },
  ].filter((section) => section.items.length > 0);

  return (
    <AppBar
      workspace={{ label: 'School', value: 'School' }}
      searchPlaceholder="Search students, classes, staff…"
      searchAriaLabel="Search school console"
      searchItems={navItemsToSearchItems(sections)}
      roleLabel={roleLabel}
      scopeLine={tenantId ? `Tenant ${tenantId.slice(0, 8)}…` : 'School scope'}
      notificationCount={inboxCount > 0 ? inboxCount : undefined}
      workspaceMenu={
        <WorkspaceMenu
          sections={sections}
          pathname={pathname}
          isActive={isSchoolNavActive}
          settingsHref="/school/settings"
          onSignOut={() => void signOut()}
        />
      }
    />
  );
}
