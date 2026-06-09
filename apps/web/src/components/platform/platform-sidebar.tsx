'use client';

import { usePathname } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';

import { useAuth } from '@/lib/auth/auth-context';
import { useBreakGlassStore } from '@/lib/platform/break-glass-store';
import {
  complianceNavForRole,
  isDpoOnlyRole,
  type ComplianceNavItem,
} from '@/components/compliance/compliance-nav-config';
import { AppBar, BreakGlassStrip } from '@/components/layout/app-bar';
import { cn } from '@loomis/ui-web';
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

function PlatformMenuItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <a
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-[13.5px] font-semibold transition-all duration-200',
        active
          ? 'bg-brand-600 text-white shadow-[0_4px_12px_rgba(153,121,77,0.28)]'
          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950',
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          active ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200/50 group-hover:text-neutral-700',
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="truncate">{item.label}</span>
      {active ? <span className="ml-auto size-1.5 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(153,121,77,0.65)]" aria-hidden /> : null}
    </a>
  );
}

function PlatformMenuSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="px-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400/80">
        {title}
      </p>
      <nav className="space-y-0.5" aria-label={`${title} navigation`}>
        {items.map((item) => (
          <PlatformMenuItem key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
    </div>
  );
}

function PlatformWorkspaceMenu({
  roleLabel,
  pathname,
  opsNav,
  complianceNav,
  onSignOut,
}: {
  roleLabel: string;
  pathname: string;
  opsNav: NavItem[];
  complianceNav: NavItem[];
  onSignOut: () => void;
}) {
  return (
    <div className="space-y-4 p-1">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-950 via-stone-950 to-neutral-900 p-4 text-white border border-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black shadow-lg shadow-brand-700/30">
            L
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight">Platform Console</p>
            <p className="truncate text-xs text-white/60">{roleLabel}</p>
            <p className="text-[10px] text-white/45 font-medium">Global scope</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-semibold text-white/80">
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5 border border-white/[0.03] shadow-sm">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
            Live network
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] px-2.5 py-1.5 border border-white/[0.03] shadow-sm">
            <span className="size-1.5 rounded-full bg-brand-400 shadow-[0_0_6px_rgba(153,121,77,0.55)]" />
            Secure ops
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <PlatformMenuSection title="Workspace" items={opsNav} pathname={pathname} />
        <PlatformMenuSection title="Compliance" items={complianceNav} pathname={pathname} />
      </div>

      <div className="border-t border-neutral-100 pt-2.5">
        <PlatformMenuItem
          item={{ label: 'Settings', href: '/platform/settings', icon: Settings }}
          active={pathname.startsWith('/platform/settings')}
        />
        <button
          type="button"
          onClick={onSignOut}
          className="group mt-0.5 flex w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-[13.5px] font-semibold text-neutral-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 transition-colors group-hover:bg-red-100 group-hover:text-red-500">
            <LogOut aria-hidden className="size-4" />
          </span>
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
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

  return (
    <AppBar
      workspace={{ label: 'Platform', value: 'Platform' }}
      searchPlaceholder="Search tenants, cases, approvals…"
      searchAriaLabel="Search platform console"
      roleLabel={roleLabel}
      scopeLine="Global scope"
      topSlot={
        bgSession ? <BreakGlassStrip session={bgSession} onEnd={deactivate} /> : undefined
      }
      workspaceMenu={
        <PlatformWorkspaceMenu
          roleLabel={roleLabel}
          pathname={pathname}
          opsNav={opsNav}
          complianceNav={complianceNav}
          onSignOut={() => void signOut()}
        />
      }
    />
  );
}
