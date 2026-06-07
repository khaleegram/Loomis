'use client';

import { ChevronDown, LogOut } from 'lucide-react';
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
import type { ReactNode } from 'react';

import { useAuth } from '@/lib/auth/auth-context';

interface RegionalTopBarProps {
  breadcrumbs?: ReactNode;
}

export function RegionalTopBar({ breadcrumbs }: RegionalTopBarProps) {
  const { session, signOut } = useAuth();

  if (!session) return null;

  const roleLabel =
    session.role === 'regional_manager' ? 'Regional Manager' : 'Regional Subordinate';

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center justify-between px-6',
        'border-b border-neutral-200 bg-white dark:border-forest-800 dark:bg-forest-900',
      )}
    >
      <div className="min-w-0 text-sm text-neutral-500 dark:text-neutral-400">
        {breadcrumbs ?? (
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            Regional Console
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-sm border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-brand-700 dark:border-forest-700 dark:bg-forest-800 dark:text-mint-400 sm:inline">
          Partner
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
              <p className="text-xs text-muted-foreground">Regional · Referral network</p>
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
  );
}
