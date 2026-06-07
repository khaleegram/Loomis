'use client';

import type { ReactNode } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@loomis/ui-web';

import { useAuth } from '@/lib/auth/auth-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const ROLE_LABELS: Record<string, string> = {
  school_owner: 'School Owner',
  principal: 'Principal',
  admin_officer: 'Admin Officer',
  accountant: 'Accountant',
  cashier: 'Cashier',
  exam_officer: 'Exam Officer',
  deputy_exam_officer: 'Deputy Exam Officer',
  timetable_officer: 'Timetable Officer',
  teacher: 'Teacher',
  class_teacher: 'Class Teacher',
};

interface ConsoleTopBarProps {
  breadcrumbs?: ReactNode;
}

export function ConsoleTopBar({ breadcrumbs }: ConsoleTopBarProps) {
  const { session, signOut } = useAuth();
  const tenantId = useTenantId();

  if (!session) return null;

  const roleLabel = ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ');

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
        {breadcrumbs ?? <span className="font-medium text-foreground capitalize">{roleLabel} Console</span>}
        {tenantId ? (
          <>
            <span className="text-neutral-300 dark:text-neutral-700" aria-hidden>·</span>
            <span className="hidden rounded-full bg-muted px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
              {tenantId.slice(0, 8)}…
            </span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <span className="max-w-[10rem] truncate capitalize">{roleLabel}</span>
              <ChevronDown aria-hidden className="size-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium capitalize">{roleLabel}</p>
              <p className="text-xs text-muted-foreground">Signed in</p>
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
