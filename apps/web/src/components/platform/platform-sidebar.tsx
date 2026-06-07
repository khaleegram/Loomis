'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  Settings,
  ShieldAlert,
  Timer,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Separator,
  cn,
} from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import { useBreakGlassStore, type ActiveBreakGlassSession } from '@/lib/platform/break-glass-store';
import {
  complianceNavForRole,
  isDpoOnlyRole,
  type ComplianceNavItem,
} from '@/components/compliance/compliance-nav-config';
import { PLATFORM_NAV, type PlatformNavItem } from '@/components/platform/platform-nav-config';

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Platform Owner',
  platform_admin: 'Platform Admin',
  dpo: 'Data Protection Officer',
};

/** Icon bg tints per nav section — blue for ops, purple for compliance. */
const OPS_ICON_BG = '#EEF4FF';
const OPS_ICON_COLOR = '#5B93FF';
const COMP_ICON_BG = '#F3F0FF';
const COMP_ICON_COLOR = '#A594F9';

function initials(role: string): string {
  return role
    .split('_')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/platform/dashboard') return pathname === href;
  if (href === '/platform/compliance') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ── Nav Item ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  item: PlatformNavItem | ComplianceNavItem;
  active: boolean;
  iconBg: string;
  iconColor: string;
}

function NavItem({ item, active, iconBg, iconColor }: NavItemProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B93FF]',
        active
          ? 'bg-gradient-to-r from-[#EEF4FF] to-[#F5F0FF] text-[#5B93FF]'
          : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#1E293B]',
      )}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150"
        style={{
          backgroundColor: active ? iconBg : 'transparent',
          color: active ? iconColor : '#94A3B8',
        }}
      >
        <Icon className="size-[15px]" aria-hidden />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function PlatformSidebar() {
  const pathname = usePathname();
  const { session, signOut } = useAuth();

  if (!session) return null;

  const roleLabel = ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ');
  const dpoOnly = isDpoOnlyRole(session.role);
  const opsNav = dpoOnly ? [] : PLATFORM_NAV;
  const complianceNav = complianceNavForRole(session.role);

  return (
    <aside className="relative flex w-[248px] shrink-0 flex-col overflow-hidden bg-white">
      {/* Gradient top-accent bar */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #5B93FF 0%, #A594F9 100%)' }}
      />

      {/* Logo + user identity */}
      <div className="mt-[3px] px-4 pt-5 pb-4">
        <Link
          href="/platform/dashboard"
          className="mb-5 flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B93FF]"
        >
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #5B93FF, #A594F9)' }}
          >
            L
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1E293B]">Loomis</p>
            <p className="text-[10px] font-medium text-[#94A3B8]">Platform Console</p>
          </div>
        </Link>

        {/* User avatar row */}
        <div className="flex items-center gap-2.5 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #A594F9, #5B93FF)' }}
          >
            {initials(session.role)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#1E293B]">{roleLabel}</p>
            <p className="text-[10px] text-[#94A3B8]">Global scope</p>
          </div>
        </div>
      </div>

      <Separator className="mx-4 w-auto bg-[#F1F5F9]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Platform console navigation">
        {opsNav.length > 0 ? (
          <div className="mb-4">
            <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#CBD5E1]">
              Operations
            </p>
            <div className="space-y-0.5">
              {opsNav.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  iconBg={OPS_ICON_BG}
                  iconColor={OPS_ICON_COLOR}
                />
              ))}
            </div>
          </div>
        ) : null}

        {complianceNav.length > 0 ? (
          <div>
            <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#CBD5E1]">
              Compliance
            </p>
            <div className="space-y-0.5">
              {complianceNav.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  iconBg={COMP_ICON_BG}
                  iconColor={COMP_ICON_COLOR}
                />
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      <Separator className="mx-4 w-auto bg-[#F1F5F9]" />

      {/* Bottom actions */}
      <div className="px-3 py-3 space-y-0.5">
        <Link
          href="/platform/settings"
          className={cn(
            'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-[#475569] transition-colors',
            'hover:bg-[#F8FAFC] hover:text-[#1E293B]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B93FF]',
            pathname.startsWith('/platform/settings') &&
              'bg-gradient-to-r from-[#EEF4FF] to-[#F5F0FF] text-[#5B93FF]',
          )}
        >
          <span
            className={cn(
              'flex size-7 items-center justify-center rounded-lg',
              pathname.startsWith('/platform/settings')
                ? 'bg-[#EEF4FF] text-[#5B93FF]'
                : 'text-[#94A3B8]',
            )}
          >
            <Settings className="size-[15px]" aria-hidden />
          </span>
          Settings
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-[#475569] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B93FF]"
        >
          <span className="flex size-7 items-center justify-center rounded-lg text-[#94A3B8] group-hover:text-[#DC2626]">
            <LogOut className="size-[15px]" aria-hidden />
          </span>
          Log out
        </button>
      </div>
    </aside>
  );
}

// ── Break-glass strip ─────────────────────────────────────────────────────────

function BreakGlassStrip({
  session: bgSession,
  onEnd,
}: {
  session: ActiveBreakGlassSession;
  onEnd: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, bgSession.expiresAt - Date.now()));

  const handleEnd = useCallback(() => onEnd(), [onEnd]);

  useEffect(() => {
    const id = setInterval(() => {
      const rem = Math.max(0, bgSession.expiresAt - Date.now());
      setRemaining(rem);
      if (rem === 0) handleEnd();
    }, 1000);
    return () => clearInterval(id);
  }, [bgSession.expiresAt, handleEnd]);

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex h-8 shrink-0 items-center justify-between bg-red-600 px-6 text-xs font-medium text-white"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert aria-hidden className="size-3.5" />
        <span className="font-semibold uppercase tracking-wide">Break-Glass Active</span>
        <span className="opacity-50">·</span>
        <span className="max-w-[24rem] truncate">{bgSession.tenantName}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 tabular-nums">
          <Timer aria-hidden className="size-3.5 opacity-80" />
          <span className="font-mono">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <button
          type="button"
          onClick={handleEnd}
          className="rounded border border-white/40 px-2.5 py-0.5 text-[11px] font-semibold transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          End Session
        </button>
      </div>
    </div>
  );
}

// ── Island App Bar ────────────────────────────────────────────────────────────

/** Derive a human-readable page title from the current pathname. */
function usePageTitle(): string {
  const pathname = usePathname();

  const allItems = [
    ...PLATFORM_NAV,
    { label: 'Compliance Posture', href: '/platform/compliance' },
    { label: 'DSAR Queue', href: '/platform/compliance/dsar' },
    { label: 'Breach Records', href: '/platform/compliance/breaches' },
    { label: 'Retention & Consent', href: '/platform/compliance/retention' },
    { label: 'Audit Log', href: '/platform/compliance/audit' },
    { label: 'Settings', href: '/platform/settings' },
    { label: 'Tenant Detail', href: '/platform/tenants/' },
  ];

  // Longest matching href wins
  const match = allItems
    .filter((item) => pathname === item.href || pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return match?.label ?? 'Platform Console';
}

export function PlatformTopBar() {
  const { session, signOut } = useAuth();
  const { session: bgSession, deactivate } = useBreakGlassStore();
  const pageTitle = usePageTitle();

  if (!session) return null;

  const roleLabel = ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ');

  return (
    <div className="flex shrink-0 flex-col">
      {bgSession ? <BreakGlassStrip session={bgSession} onEnd={deactivate} /> : null}

      {/* Island row — floats on the page bg with no bar background */}
      <div className="flex items-center gap-3 px-5 py-4">

        {/* Island 1 — Page title */}
        <div className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-[#E2E8F0]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">
              Platform
            </p>
            <p className="text-sm font-bold text-[#1E293B] leading-tight">{pageTitle}</p>
          </div>
        </div>

        {/* Island 2 — Search (grows to fill center) */}
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5 shadow-sm ring-1 ring-[#E2E8F0]">
            <Search aria-hidden className="size-4 shrink-0 text-[#94A3B8]" />
            <Input
              type="search"
              placeholder="Search tenants, cases, approvals…"
              className="h-auto flex-1 border-0 bg-transparent p-0 text-sm shadow-none placeholder:text-[#94A3B8] focus-visible:ring-0"
              aria-label="Search platform console"
            />
            <kbd className="hidden shrink-0 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[10px] text-[#94A3B8] sm:block">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Island 3 — Actions + profile */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-white px-2 py-1.5 shadow-sm ring-1 ring-[#E2E8F0]">
          {/* Notification bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative size-9 rounded-xl text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B]"
            aria-label="Notifications"
          >
            <Bell aria-hidden className="size-[18px]" />
            {/* Unread indicator dot */}
            <span
              aria-hidden
              className="absolute right-2 top-2 size-1.5 rounded-full bg-[#5B93FF]"
            />
          </Button>

          <div aria-hidden className="h-5 w-px bg-[#E2E8F0]" />

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B93FF]"
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #A594F9, #5B93FF)' }}
                >
                  {initials(session.role)}
                </span>
                <span className="hidden max-w-[8rem] truncate text-xs font-semibold text-[#1E293B] sm:block">
                  {roleLabel}
                </span>
                <ChevronDown aria-hidden className="hidden size-3.5 text-[#94A3B8] sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl">
              <DropdownMenuLabel className="rounded-xl bg-[#F8FAFC] px-3 py-2.5 font-normal">
                <p className="text-sm font-semibold text-[#1E293B]">{roleLabel}</p>
                <p className="mt-0.5 text-xs text-[#64748B]">Platform · Global scope</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem
                className="cursor-pointer rounded-xl text-[#DC2626] focus:bg-[#FEF2F2] focus:text-[#DC2626]"
                onClick={() => void signOut()}
              >
                <LogOut aria-hidden className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
