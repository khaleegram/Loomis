'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../../lib/utils.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu.js';

export type SmartSearchOption = {
  value: string;
  label: string;
  keywords?: string;
};

export interface SmartSearchSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: SmartSearchOption[];
  allLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Compact toolbar chip (default) or full-width form field */
  variant?: 'chip' | 'field';
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function matchesQuery(option: SmartSearchOption, query: string): boolean {
  if (!query) return true;
  const haystack = normalize(`${option.label} ${option.keywords ?? ''}`);
  return haystack.includes(normalize(query));
}

function dedupeOptions(options: SmartSearchOption[]): SmartSearchOption[] {
  const seen = new Map<string, SmartSearchOption>();
  for (const option of options) {
    if (!seen.has(option.value)) seen.set(option.value, option);
  }
  return Array.from(seen.values());
}

export function SmartSearchSelect({
  value,
  onValueChange,
  options,
  allLabel,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  disabled = false,
  variant = 'chip',
  className,
  triggerClassName,
  contentClassName,
}: SmartSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const uniqueOptions = useMemo(() => dedupeOptions(options), [options]);

  const selected =
    value != null ? uniqueOptions.find((option) => option.value === value) : undefined;
  const displayLabel = selected?.label ?? allLabel ?? placeholder;

  const filtered = useMemo(
    () => uniqueOptions.filter((option) => matchesQuery(option, query)),
    [uniqueOptions, query],
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            variant === 'field'
              ? 'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-normal text-neutral-900 shadow-none transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50'
              : 'flex max-w-[14rem] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName,
            className,
          )}
        >
          <span className={cn('truncate text-left', !selected && 'text-neutral-400')}>{displayLabel}</span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === 'field' ? 'start' : 'end'}
        sideOffset={8}
        className={cn(
          'z-[300] overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-[0_12px_40px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.06)]',
          variant === 'field' ? 'w-[var(--radix-dropdown-menu-trigger-width)] min-w-[16rem]' : 'w-[min(22rem,calc(100vw-2rem))]',
          contentClassName,
        )}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b border-neutral-100 bg-neutral-50/90 p-2.5">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-[12px] text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/15"
              aria-label={searchPlaceholder}
            />
          </div>
        </div>

        <div className="max-h-[min(20rem,50vh)] overflow-y-auto p-1.5 [scrollbar-width:thin]">
          {allLabel ? (
            <DropdownMenuItem
              onSelect={() => {
                onValueChange(null);
                setOpen(false);
              }}
              className={cn(
                'cursor-pointer rounded-lg px-2.5 py-2 text-[12px] font-semibold text-neutral-700 focus:bg-neutral-100',
                value == null && 'bg-brand-50 text-brand-800',
              )}
            >
              <span className="flex-1 truncate">{allLabel}</span>
              {value == null ? <Check aria-hidden className="size-3.5 shrink-0 text-brand-700" /> : null}
            </DropdownMenuItem>
          ) : null}

          {filtered.map((option) => {
            const isSelected = option.value === value;
            return (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-2 text-[12px] font-medium text-neutral-700 focus:bg-neutral-100',
                  isSelected && 'bg-brand-50 text-brand-800',
                )}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {isSelected ? <Check aria-hidden className="size-3.5 shrink-0 text-brand-700" /> : null}
              </DropdownMenuItem>
            );
          })}

          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[11px] font-medium text-neutral-400">No matches found</p>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
