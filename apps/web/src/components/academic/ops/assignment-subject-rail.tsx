'use client';

import { cn } from '@loomis/ui-web';
import { BookOpen, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

export interface AssignmentTeachingSlot {
  assignmentId: string;
  termId: string;
  classArmId: string;
  subjectId: string;
  subjectLabel: string;
  classLabel: string;
  termLabel: string;
}

interface AssignmentSubjectRailProps {
  slots: AssignmentTeachingSlot[];
  value: string;
  onChange: (assignmentId: string) => void;
  disabled?: boolean;
}

export function AssignmentSubjectRail({
  slots,
  value,
  onChange,
  disabled,
}: AssignmentSubjectRailProps) {
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return slots;
    return slots.filter(
      (slot) =>
        slot.subjectLabel.toLowerCase().includes(q) ||
        slot.classLabel.toLowerCase().includes(q) ||
        slot.termLabel.toLowerCase().includes(q),
    );
  }, [slots, query]);

  const showSearch = slots.length >= 2;

  useEffect(() => {
    if (!value) return;
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [value]);

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-8 text-center">
        <BookOpen aria-hidden className="mx-auto mb-2 size-5 text-neutral-300" />
        <p className="text-[13px] font-medium text-neutral-600">
          No subject assignments for this term. Ask admin to link you to a class first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showSearch ? (
        <label className="relative block">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find subject or class…"
            className="h-9 w-full rounded-xl border border-neutral-200/80 bg-white pl-9 pr-3 text-[12px] font-medium text-neutral-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200/50 disabled:opacity-50"
          />
        </label>
      ) : null}

      <div className="relative">
        {filtered.length > 3 ? (
        <>
          <button
            type="button"
            aria-label="Scroll subjects left"
            onClick={() => scrollBy(-240)}
            disabled={disabled}
            className="absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/80 bg-white/95 p-1.5 shadow-md backdrop-blur-sm transition hover:bg-brand-50 disabled:opacity-40 sm:flex"
          >
            <ChevronLeft aria-hidden className="size-4 text-neutral-600" />
          </button>
          <button
            type="button"
            aria-label="Scroll subjects right"
            onClick={() => scrollBy(240)}
            disabled={disabled}
            className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/80 bg-white/95 p-1.5 shadow-md backdrop-blur-sm transition hover:bg-brand-50 disabled:opacity-40 sm:flex"
          >
            <ChevronRight aria-hidden className="size-4 text-neutral-600" />
          </button>
        </>
      ) : null}

      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-white to-transparent sm:w-6"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-white to-transparent sm:w-6"
        aria-hidden
      />

      <div
        ref={scrollRef}
        className="relative z-0 flex gap-2.5 overflow-x-auto overscroll-x-contain px-0.5 pb-1 pt-0.5 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-neutral-500">
            No match for &ldquo;{query.trim()}&rdquo;
          </p>
        ) : (
          filtered.map((slot) => {
            const selected = slot.assignmentId === value;
            return (
              <button
              key={slot.assignmentId}
              ref={selected ? selectedRef : undefined}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${slot.subjectLabel} for ${slot.classLabel}, ${slot.termLabel}`}
              onClick={() => onChange(slot.assignmentId)}
              className={cn(
                'card group relative flex aspect-square w-[6.75rem] shrink-0 snap-start flex-col justify-between rounded-2xl border p-2.5 text-left transition-all duration-200',
                'cursor-pointer touch-manipulation select-none active:scale-[0.97] sm:w-[7.5rem]',
                selected
                  ? 'border-brand-400 bg-gradient-to-br from-brand-50 via-white to-brand-100/40 shadow-md ring-2 ring-brand-400/30'
                  : 'border-neutral-200/70 bg-white hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm',
              )}
            >
              <span className="line-clamp-2 text-[11px] font-extrabold leading-tight text-neutral-900">
                {slot.subjectLabel}
              </span>

              <div className="min-w-0 space-y-0.5">
                <span className="block truncate text-[10px] font-semibold text-neutral-700">
                  {slot.classLabel}
                </span>
                <span className="block truncate text-[9px] font-bold uppercase tracking-wide text-neutral-400">
                  {slot.termLabel}
                </span>
              </div>

              {selected ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-b-2xl bg-gradient-to-r from-brand-400 to-brand-600" />
              ) : null}
              </button>
            );
          })
        )}
        </div>
      </div>

      {showSearch && query.trim() ? (
        <p className="text-[10px] font-medium text-neutral-400">
          {filtered.length} of {slots.length} matches
        </p>
      ) : slots.length > 3 ? (
        <p className="text-[10px] font-medium text-neutral-400">
          {slots.length} classes · swipe to browse
        </p>
      ) : null}
    </div>
  );
}

export function AssignmentSubjectRailHeader() {
  return (
    <div className="mb-2">
      <p className={ACADEMIC_UI.sectionLabel}>Class & subject</p>
      <p className="text-[13px] font-medium text-neutral-500">
        Pick where this assignment goes — one tap per class you teach
      </p>
    </div>
  );
}
