'use client';

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
} from '@loomis/ui-web';
import { Check, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SURFACES } from '@/lib/design/surfaces';

export function SmartFieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <p className={ACADEMIC_UI.sectionLabel}>
      {children}
      {optional ? <span className="font-medium normal-case text-neutral-300"> (optional)</span> : null}
    </p>
  );
}

export function FormContextCard({
  badge,
  title,
  subtitle,
  children,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-brand-100/50 shadow-sm"
      style={{ background: SURFACES.hero }}
    >
      <div className="px-4 py-4">
        {badge ? (
          <span className="mb-2 inline-block rounded-full bg-brand-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800">
            {badge}
          </span>
        ) : null}
        <p className="text-lg font-extrabold tracking-tight text-neutral-900">{title}</p>
        {subtitle ? <p className="mt-1 text-[13px] font-medium text-neutral-600">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
}

export function ChipOptionPicker<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-xl border px-3 py-2 text-[12px] font-semibold transition duration-200',
              selected
                ? 'border-brand-400 bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-200/60'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-200 hover:bg-brand-50/40',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface CardOption {
  id: string;
  label: string;
  hint?: string;
}

export function CardOptionPicker({
  options,
  value,
  onChange,
  disabled,
  searchPlaceholder = 'Search…',
  emptyMessage = 'Nothing to show',
  showSearchMin = 6,
}: {
  options: CardOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  showSearchMin?: number;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        (option.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [options, search]);

  if (options.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 text-center">
        <p className="text-[13px] font-medium text-neutral-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.length >= showSearchMin ? (
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={search}
            disabled={disabled}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 text-[13px] outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50"
          />
        </div>
      ) : null}

      <div className="max-h-[min(16rem,38vh)] space-y-2 overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-[13px] text-neutral-500">
            No matches
          </p>
        ) : (
          filtered.map((option) => {
            const selected = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(option.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition duration-200',
                  selected
                    ? 'border-brand-400 bg-brand-50/80 shadow-sm ring-1 ring-brand-200/60'
                    : 'border-neutral-200/80 bg-white hover:border-brand-200 hover:bg-brand-50/30',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-neutral-900">
                    {option.label}
                  </span>
                  {option.hint ? (
                    <span className="mt-0.5 block truncate text-[12px] font-medium text-neutral-500">
                      {option.hint}
                    </span>
                  ) : null}
                </span>
                {selected ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check aria-hidden className="size-3.5" />
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SmartFormFooter({
  formId,
  cancelLabel = 'Cancel',
  submitLabel,
  pending,
  disabled,
  onCancel,
}: {
  formId?: string;
  cancelLabel?: string;
  submitLabel: string;
  pending?: boolean;
  disabled?: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-row gap-2 border-t border-neutral-100 bg-neutral-50/50 px-6 py-4">
      <button
        type="button"
        onClick={onCancel}
        className={cn(ACADEMIC_UI.btnSecondary, 'h-11 flex-1 justify-center rounded-xl')}
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        form={formId}
        disabled={disabled || pending}
        className={cn(ACADEMIC_UI.btnPrimary, 'h-11 flex-1 justify-center rounded-xl shadow-sm')}
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}

export function SmartFormHeader({
  eyebrow,
  title,
  description,
  surface = 'plain',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Use `sheet` or `dialog` inside Radix Sheet/Dialog for a11y (required Title). */
  surface?: 'plain' | 'sheet' | 'dialog';
}) {
  const headerClass = 'space-y-1 border-b border-neutral-100 px-6 pb-5 pt-6 text-left';
  const titleClass = 'text-lg font-extrabold tracking-tight text-neutral-900';
  const descriptionClass = 'text-[13px] leading-relaxed text-neutral-500';

  const eyebrowNode = eyebrow ? <p className={ACADEMIC_UI.sectionLabel}>{eyebrow}</p> : null;

  if (surface === 'sheet') {
    return (
      <SheetHeader className={headerClass}>
        {eyebrowNode}
        <SheetTitle className={titleClass}>{title}</SheetTitle>
        {description ? (
          <SheetDescription className={descriptionClass}>{description}</SheetDescription>
        ) : null}
      </SheetHeader>
    );
  }

  if (surface === 'dialog') {
    return (
      <DialogHeader className={headerClass}>
        {eyebrowNode}
        <DialogTitle className={titleClass}>{title}</DialogTitle>
        {description ? (
          <DialogDescription className={descriptionClass}>{description}</DialogDescription>
        ) : null}
      </DialogHeader>
    );
  }

  return (
    <div className={headerClass}>
      {eyebrowNode}
      <h2 className={titleClass}>{title}</h2>
      {description ? <p className={descriptionClass}>{description}</p> : null}
    </div>
  );
}

export const smartInputClass =
  'h-11 rounded-xl border-neutral-200 bg-white text-[13px] font-medium outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50';

export function SmartHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">{children}</p>;
}

export function FormSubmitError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800"
    >
      {message}
    </p>
  );
}
