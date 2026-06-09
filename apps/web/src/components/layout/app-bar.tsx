'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Bell, ChevronDown, LogOut, ShieldAlert, Timer } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  cn,
} from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import type { ActiveBreakGlassSession } from '@/lib/platform/break-glass-store';

export function BreakGlassStrip({
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

export interface AppBarWorkspaceProps {
  label: string;
  value: string;
  onClick?: () => void;
}

export interface AppBarProps {
  workspace: AppBarWorkspaceProps;
  searchPlaceholder: string;
  searchAriaLabel: string;
  roleLabel: string;
  scopeLine: string;
  notificationCount?: number;
  topSlot?: ReactNode;
  workspaceMenu?: ReactNode;
}

function roleInitials(role: string): string {
  return role
    .split('_')
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

/** V2 global app bar — workspace, search, notifications, profile. */
export function AppBar({
  workspace,
  searchPlaceholder,
  searchAriaLabel,
  roleLabel,
  scopeLine,
  notificationCount = 0,
  topSlot,
  workspaceMenu,
}: AppBarProps) {
  const { session, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const scrollEl = document.querySelector('[data-scroll-content]');
    if (!scrollEl) return;
    const handleScroll = () => setScrolled(scrollEl.scrollTop > 10);
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  if (!session) return null;

  const initials = roleInitials(session.role);
  const workspaceButton = (
    <button
      type="button"
      onClick={workspaceMenu ? undefined : workspace.onClick}
      className="flex max-w-[13rem] shrink-0 items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-1.5 text-[13.5px] font-semibold text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-neutral-50 hover:border-black/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 active:scale-[0.98] lg:max-w-[15rem]"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[10px] font-bold text-white shadow-sm shadow-brand-700/25">
        L
      </span>
      <span className="truncate">{workspace.value}</span>
      <ChevronDown aria-hidden className="size-3.5 shrink-0 text-neutral-400" />
    </button>
  );

  return (
    <>
      <div
        className={cn(
          'fixed inset-x-0 top-0 z-50 flex flex-col transition-all duration-200',
          scrolled
            ? 'border-b border-black/[0.07] bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_4px_16px_rgba(15,23,42,0.05)]'
            : 'border-b border-black/[0.04] bg-white',
        )}
      >
        {topSlot}

        <div className="flex h-14 items-center gap-3 px-4 lg:gap-4 lg:px-6">
          {/* Workspace switcher */}
          {workspaceMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>{workspaceButton}</DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="w-80 rounded-2xl border border-black/[0.07] bg-white p-2 shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)]">
                {workspaceMenu}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            workspaceButton
          )}

        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <div
            className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-neutral-50 px-3.5 py-1.5 transition-all duration-150 focus-within:border-brand-600/30 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(153,121,77,0.10),0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <svg aria-hidden className="size-4 shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1116.65 2a7.5 7.5 0 010 14.65z" />
            </svg>
            <Input
              type="search"
              placeholder={searchPlaceholder}
              className="h-auto flex-1 border-0 bg-transparent p-0 text-[13.5px] shadow-none placeholder:text-neutral-400 focus-visible:ring-0"
              aria-label={searchAriaLabel}
            />
            <kbd
              className="hidden shrink-0 rounded-md border border-black/[0.08] bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 shadow-[0_1px_1px_rgba(0,0,0,0.04)] lg:block"
            >
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-neutral-50 hover:text-neutral-800 active:scale-[0.97]"
            aria-label="Notifications"
          >
            <Bell aria-hidden className="size-[18px]" />
            {notificationCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            ) : null}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white px-2.5 py-1 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 active:scale-[0.98]"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[10px] font-bold text-white shadow-sm shadow-brand-700/25">
                  {initials.charAt(0) || '?'}
                </span>
                <span className="hidden max-w-[7rem] truncate text-[13px] font-semibold text-neutral-800 md:block">
                  {roleLabel}
                </span>
                <ChevronDown aria-hidden className="hidden size-3.5 text-neutral-400 md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl border border-neutral-200 bg-white p-2 shadow-md shadow-black/5">
              <DropdownMenuLabel className="rounded-lg bg-neutral-50 px-3 py-3 font-normal">
                <p className="text-sm font-semibold text-neutral-900">{roleLabel}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{scopeLine}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2 bg-neutral-100" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600"
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
      <div aria-hidden className={cn('shrink-0', topSlot ? 'h-[88px]' : 'h-14')} />
    </>
  );
}
