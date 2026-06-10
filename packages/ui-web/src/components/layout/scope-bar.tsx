'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ChevronDown, Shield } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export interface ScopeBarProps {
  scopeLabel: string;
  scopeValue: string;
  scopeIcon?: LucideIcon;
  statusLabel?: string;
  statusValue?: string;
  statusIcon?: LucideIcon;
  onScopeClick?: () => void;
  className?: string;
  trailing?: ReactNode;
}

export function ScopeBar({
  scopeLabel,
  scopeValue,
  scopeIcon: ScopeIcon,
  statusLabel = 'Status',
  statusValue = 'Live · Secured',
  statusIcon: StatusIcon = Shield,
  onScopeClick,
  className,
  trailing,
}: ScopeBarProps) {
  const ScopeWrapper = onScopeClick ? 'button' : 'div';

  return (
    <div
      className={cn(
        'card mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4',
        className,
      )}
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
          {scopeLabel}
        </p>
        <ScopeWrapper
          type={onScopeClick ? 'button' : undefined}
          onClick={onScopeClick}
          className={cn(
            'mt-2 flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-[13.5px] font-semibold text-neutral-800 transition-all',
            onScopeClick && 'hover:border-neutral-300 hover:bg-white',
          )}
        >
          {ScopeIcon ? (
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm">
              <ScopeIcon aria-hidden className="size-3.5" />
            </span>
          ) : null}
          <span>{scopeValue}</span>
          {onScopeClick ? <ChevronDown aria-hidden className="size-3.5 text-neutral-400" /> : null}
        </ScopeWrapper>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {trailing}
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
            {statusLabel}
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {StatusIcon ? <StatusIcon aria-hidden className="size-3.5" /> : null}
            {statusValue}
          </div>
        </div>
      </div>
    </div>
  );
}
