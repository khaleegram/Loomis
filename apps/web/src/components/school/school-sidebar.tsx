'use client';

import { usePathname } from 'next/navigation';
import { workflowsInboxEnabled } from '@loomis/core';
import type { Role } from '@loomis/contracts';

import { useSchoolBranding, useWorkflowInbox } from '@loomis/api-client';

import { AppBar } from '@/components/layout/app-bar';
import { navItemsToSearchItems } from '@/components/layout/smart-search-palette';
import { SchoolAcademicSessionBar } from '@/components/school/school-academic-session-bar';
import { SchoolLogo } from '@/components/shared/school-logo';
import { WorkspaceMenu, type WorkspaceNavItem } from '@/components/layout/workspace-menu';
import { useAuth } from '@/lib/auth/auth-context';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import {
  formatRoleLabel,
  resolveSchoolNav,
  schoolNavLabel,
  type SchoolNavItem,
} from '@/components/school/school-nav-config';
import {
  DEFAULT_SCHOOL_NAV_CONTEXT,
  type SchoolNavContext,
} from '@/lib/school/school-nav-context';

function isSchoolNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/school/dashboard') return false;
  if (href === '/school/settings') return pathname.startsWith('/school/settings');
  return pathname.startsWith(`${href}/`);
}

function toWorkspaceNavItem(
  item: SchoolNavItem,
  role: Role,
  financeMode: SchoolNavContext['financeMode'],
): WorkspaceNavItem {
  return {
    label: schoolNavLabel(item, role, financeMode),
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
  const experience = useTenantExperience();
  const navContext: SchoolNavContext = {
    experienceTier: experience.experienceTier,
    financeMode: experience.financeMode,
    flags: experience.flags,
  };
  const inboxEnabled = workflowsInboxEnabled(navContext.experienceTier, navContext.flags);
  const { data: inboxData } = useWorkflowInbox(inboxEnabled ? (tenantId ?? '') : '');
  const { data: branding } = useSchoolBranding(tenantId ?? '');
  const { activeYear, activeTerm } = useSchoolAcademic();
  const inboxCount = inboxEnabled ? (inboxData?.items.length ?? 0) : 0;
  const schoolName = branding?.tenantName ?? 'School';
  const sessionScope =
    activeYear && activeTerm
      ? `${schoolName} · ${activeYear.label} · ${activeTerm.name}`
      : schoolName;

  if (!session) return null;

  const roleLabel = formatRoleLabel(session.role, navContext.financeMode);
  const visibleNav = resolveSchoolNav(session.role, navContext);
  const workspaceItems: WorkspaceNavItem[] = visibleNav
    .filter((item) => item.section !== 'ledger' && item.href !== '/school/settings')
    .map((item) => toWorkspaceNavItem(item, session.role, navContext.financeMode));
  const ledgerItems: WorkspaceNavItem[] = visibleNav
    .filter((item) => item.section === 'ledger')
    .map((item) => toWorkspaceNavItem(item, session.role, navContext.financeMode));

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
      scopeLine={sessionScope}
      sessionControl={<SchoolAcademicSessionBar />}
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

export { DEFAULT_SCHOOL_NAV_CONTEXT };
