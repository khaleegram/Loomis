'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, LogOut, ShieldAlert, Timer, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@loomis/ui-web';

import { SmartSearchPalette, type SmartSearchItem } from '@/components/layout/smart-search-palette';
import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { useAuth } from '@/lib/auth/auth-context';
import type { ActiveBreakGlassSession } from '@/lib/platform/break-glass-store';
import { useMyProfile } from '@loomis/api-client';

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
      className="flex min-h-8 shrink-0 flex-col gap-2 bg-red-600 px-4 py-2 text-xs font-medium text-white lg:h-8 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-0"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert aria-hidden className="size-3.5" />
        <span className="font-semibold uppercase tracking-wide">Break-Glass Active</span>
        <span className="opacity-50">·</span>
        <span className="max-w-[24rem] truncate">{bgSession.tenantName}</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:gap-4">
        <div className="flex items-center gap-1.5 tabular-nums">
          <Timer aria-hidden className="size-3.5 opacity-80" />
          <span className="font-mono">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <button
          type="button"
          onClick={handleEnd}
          className="rounded border border-white/40 px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:px-2.5 sm:py-0.5"
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
  icon?: ReactNode;
}

export interface AppBarProps {
  workspace: AppBarWorkspaceProps;
  searchPlaceholder: string;
  searchAriaLabel: string;
  searchItems: SmartSearchItem[];
  roleLabel: string;
  scopeLine: string;
  notificationCount?: number;
  topSlot?: ReactNode;
  workspaceMenu?: ReactNode;
}

/** V2 global app bar — workspace, search, notifications, profile. */
export function AppBar({
  workspace,
  searchPlaceholder,
  searchAriaLabel,
  searchItems,
  roleLabel,
  scopeLine,
  notificationCount = 0,
  topSlot,
  workspaceMenu,
}: AppBarProps) {
  const { session, signOut } = useAuth();
  const { data: profile } = useMyProfile();

  if (!session) return null;

  const displayName = profile?.displayName ?? session.displayName ?? roleLabel;
  const workspaceButton = (
    <button
      type="button"
      onClick={workspaceMenu ? undefined : workspace.onClick}
      className="flex max-w-[13rem] shrink-0 items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-1.5 text-[13.5px] font-semibold text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:bg-neutral-50 hover:border-black/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 active:scale-[0.98] lg:max-w-[15rem]"
    >
      {workspace.icon ?? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[10px] font-bold text-white shadow-sm shadow-brand-700/25">
          L
        </span>
      )}
      <span className="truncate">{workspace.value}</span>
      <ChevronDown aria-hidden className="size-3.5 shrink-0 text-neutral-400" />
    </button>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex flex-col border-b border-black/[0.06] bg-white">
        {topSlot}

        <div className="flex h-14 items-center gap-3 px-4 lg:gap-4 lg:px-6">
          {/* Workspace switcher */}
          {workspaceMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>{workspaceButton}</DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="max-h-[min(80vh,520px)] w-80 overflow-y-auto rounded-2xl border border-black/[0.07] bg-white p-2 shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {workspaceMenu}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            workspaceButton
          )}

        <div className="relative min-w-0 flex-1">
          <SmartSearchPalette
            items={searchItems}
            placeholder={searchPlaceholder}
            ariaLabel={searchAriaLabel}
          />
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
                <span className="size-7 shrink-0 overflow-hidden rounded-full shadow-sm shadow-brand-700/25 ring-1 ring-black/[0.06]">
                  <ProfileAvatar
                    photoStorageObjectId={profile?.photoStorageObjectId}
                    alt={displayName}
                  />
                </span>
                <span className="hidden max-w-[7rem] truncate text-[13px] font-semibold text-neutral-800 md:block">
                  {displayName}
                </span>
                <ChevronDown aria-hidden className="hidden size-3.5 text-neutral-400 md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl border border-neutral-200 bg-white p-2 shadow-md shadow-black/5">
              <DropdownMenuLabel className="rounded-lg bg-neutral-50 px-3 py-3 font-normal">
                <div className="flex items-center gap-3">
                  <span className="size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-black/[0.06]">
                    <ProfileAvatar
                      photoStorageObjectId={profile?.photoStorageObjectId}
                      alt={displayName}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">{displayName}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">{roleLabel}</p>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-400">{scopeLine}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2 bg-neutral-100" />
              <DropdownMenuItem className="cursor-pointer rounded-lg focus:bg-brand-50 focus:text-brand-700" asChild>
                <Link href="/school/settings/profile">
                  <User aria-hidden className="mr-2 size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
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
