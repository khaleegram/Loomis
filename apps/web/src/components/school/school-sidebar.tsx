'use client';

import { usePathname } from 'next/navigation';
import { can, type Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';

import { useSchoolBranding, useWorkflowInbox } from '@loomis/api-client';

import { AppBar } from '@/components/layout/app-bar';
import { navItemsToSearchItems } from '@/components/layout/smart-search-palette';
import { SchoolLogo } from '@/components/shared/school-logo';
import { WorkspaceMenu, type WorkspaceNavItem } from '@/components/layout/workspace-menu';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import {
  SCHOOL_NAV,
  STAFF_PRIMARY_ROLE_LABELS,
  schoolNavLabel,
  type SchoolNavItem,
} from '@/components/school/school-nav-config';

function isNavVisible(role: Role, item: SchoolNavItem): boolean {
  if (item.hideForRoles?.includes(role)) return false;
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

function toWorkspaceNavItem(item: SchoolNavItem, role: Role): WorkspaceNavItem {
  return {
    label: schoolNavLabel(item, role),
    href: item.href,
    icon: item.icon,
  };
}

export function SchoolSidebar() {
  return null;
}

export function SchoolTopBar() {
  const pathname = usePathname();
  const tenantId = useTenantId();
  const { session, signOut } = useAuth();
  const { data: inboxData } = useWorkflowInbox(tenantId ?? '');
  const { data: branding } = useSchoolBranding(tenantId ?? '');
  const inboxCount = inboxData?.items.length ?? 0;
  const schoolName = branding?.tenantName ?? 'School';

  if (!session) return null;

  const roleLabel = STAFF_PRIMARY_ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ');
  const visibleNav = SCHOOL_NAV.filter((item) => isNavVisible(session.role, item));
  const workspaceItems: WorkspaceNavItem[] = visibleNav
    .filter((item) => item.section !== 'ledger' && item.href !== '/school/settings')
    .map((item) => toWorkspaceNavItem(item, session.role));
  const ledgerItems: WorkspaceNavItem[] = visibleNav
    .filter((item) => item.section === 'ledger')
    .map((item) => toWorkspaceNavItem(item, session.role));

  const sections: { title: string; items: WorkspaceNavItem[] }[] = [
    { title: 'Workspace', items: workspaceItems },
    { title: 'Ledger Flows', items: ledgerItems },
  ].filter((section) => section.items.length > 0);

  return (
    <AppBar
      workspace={{
        label: 'School',
        value: schoolName,
        icon: (
          <SchoolLogo
            schoolName={schoolName}
            logoStorageObjectId={branding?.branding.logoStorageObjectId}
            size="xs"
          />
        ),
      }}
      searchPlaceholder="Search students, classes, staff…"
      searchAriaLabel="Search school console"
      searchItems={navItemsToSearchItems(sections)}
      roleLabel={roleLabel}
      scopeLine={schoolName}
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
