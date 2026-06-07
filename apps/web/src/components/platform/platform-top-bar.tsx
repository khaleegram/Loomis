'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, LogOut, ShieldAlert, Timer } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import { useBreakGlassStore, type ActiveBreakGlassSession } from '@/lib/platform/break-glass-store';

// ── Break-glass countdown strip ────────────────────────────────────────────────

interface BreakGlassStripProps {
  session: ActiveBreakGlassSession;
  onEnd: () => void;
}

function BreakGlassStrip({ session, onEnd }: BreakGlassStripProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, session.expiresAt - Date.now()));

  const handleEnd = useCallback(() => {
    onEnd();
  }, [onEnd]);

  useEffect(() => {
    const id = setInterval(() => {
      const rem = Math.max(0, session.expiresAt - Date.now());
      setRemaining(rem);
      if (rem === 0) handleEnd();
    }, 1000);
    return () => clearInterval(id);
  }, [session.expiresAt, handleEnd]);

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
        <span className="max-w-[18rem] truncate">{session.tenantName}</span>
        <span className="opacity-50">·</span>
        <span className="opacity-80">Ticket: {session.supportTicketId}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 tabular-nums">
          <Timer aria-hidden className="size-3.5 opacity-80" />
          <span className="font-mono">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={handleEnd}
          className="rounded border border-white/40 px-2.5 py-0.5 text-[11px] font-semibold transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          End Session
        </button>
      </div>
    </div>
  );
}

// ── Platform top bar ───────────────────────────────────────────────────────────

interface PlatformTopBarProps {
  breadcrumbs?: ReactNode;
}

export function PlatformTopBar({ breadcrumbs }: PlatformTopBarProps) {
  const { session, signOut } = useAuth();
  const { session: bgSession, deactivate } = useBreakGlassStore();

  if (!session) return null;

  const roleLabel =
    session.role === 'platform_owner'
      ? 'Platform Owner'
      : session.role === 'platform_admin'
        ? 'Platform Admin'
        : session.role === 'dpo'
          ? 'Data Protection Officer'
          : session.role.replace(/_/g, ' ');

  return (
    <div className="flex shrink-0 flex-col">
      {bgSession ? <BreakGlassStrip session={bgSession} onEnd={deactivate} /> : null}
      <header
        className={cn(
          'flex h-14 shrink-0 items-center justify-between px-6',
          'border-b border-neutral-200 bg-white dark:border-forest-800 dark:bg-forest-900',
        )}
      >
        <div className="min-w-0 text-sm text-neutral-500 dark:text-neutral-400">
          {breadcrumbs ?? (
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              Platform Console
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* No-tenant context indicator */}
          <span className="hidden rounded-sm border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-500 dark:border-forest-700 dark:bg-forest-800 dark:text-neutral-400 sm:inline">
            Global
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="max-w-[10rem] truncate">{roleLabel}</span>
                <ChevronDown aria-hidden className="size-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{roleLabel}</p>
                <p className="text-xs text-muted-foreground">Platform · No tenant context</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => void signOut()}
              >
                <LogOut aria-hidden className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}
