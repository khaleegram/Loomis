'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { usePlatformTenants } from '@loomis/api-client';

import { useAuth } from '@/lib/auth/auth-context';
import { useBreakGlassStore } from '@/lib/platform/break-glass-store';
import {
  complianceNavForRole,
  isDpoOnlyRole,
  type ComplianceNavItem,
} from '@/components/compliance/compliance-nav-config';
import { AppBar, BreakGlassStrip } from '@/components/layout/app-bar';
import { navItemsToSearchItems } from '@/components/layout/smart-search-palette';
import { WorkspaceMenu, type WorkspaceNavItem } from '@/components/layout/workspace-menu';
import { PLATFORM_NAV, type PlatformNavItem } from '@/components/platform/platform-nav-config';

const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Platform Owner',
  platform_admin: 'Platform Admin',
  dpo: 'Data Protection Officer',
};

function isActive(pathname: string, href: string): boolean {
  if (href === '/platform/dashboard') return pathname === href;
  if (href === '/platform/compliance') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavItem = PlatformNavItem | ComplianceNavItem;

export function PlatformSidebar() {
  return null;
}

export function PlatformTopBar() {
  const pathname = usePathname();
  const { session: bgSession, deactivate } = useBreakGlassStore();
  const { session, signOut } = useAuth();
  const roleLabel = session
    ? (ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' '))
    : 'Platform';
  const dpoOnly = session ? isDpoOnlyRole(session.role) : false;
  const opsNav: NavItem[] = dpoOnly ? [] : PLATFORM_NAV;
  const complianceNav: NavItem[] = session ? complianceNavForRole(session.role) : [];

  const sections: { title: string; items: WorkspaceNavItem[] }[] = [
    { title: 'Workspace', items: opsNav },
    { title: 'Compliance', items: complianceNav },
  ].filter((section) => section.items.length > 0);

  const { data: tenantsData } = usePlatformTenants();
  const searchItems = useMemo(() => {
    const navItems = navItemsToSearchItems(sections);
    const tenantItems =
      tenantsData?.tenants.map((tenant) => ({
        id: `tenant-${tenant.id}`,
        label: tenant.name,
        href: `/platform/tenants/${tenant.id}`,
        group: 'Schools',
        keywords: `${tenant.region} ${tenant.tierCode}`,
      })) ?? [];
    return [...navItems, ...tenantItems];
  }, [sections, tenantsData?.tenants]);

  return (
    <AppBar
      workspace={{ label: 'Platform', value: 'Platform' }}
      searchPlaceholder="Search tenants, cases, approvals…"
      searchAriaLabel="Search platform console"
      searchItems={searchItems}
      roleLabel={roleLabel}
      scopeLine="Global scope"
      topSlot={bgSession ? <BreakGlassStrip session={bgSession} onEnd={deactivate} /> : undefined}
      workspaceMenu={
        <WorkspaceMenu
          sections={sections}
          pathname={pathname}
          isActive={isActive}
          settingsHref="/platform/settings"
          onSignOut={() => void signOut()}
        />
      }
    />
  );
}
