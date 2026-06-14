'use client';

import { cn } from '@loomis/ui-web';
import { BookOpen, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface GradebookSubjectSlot {
  subjectId: string;
  subjectLabel: string;
  examConfigId: string;
  configured: boolean;
}

interface GradebookSubjectRailProps {
  slots: GradebookSubjectSlot[];
  value: string | null;
  onChange: (subjectId: string) => void;
  disabled?: boolean;
}

export function GradebookSubjectRail({
  slots,
  value,
  onChange,
  disabled,
}: GradebookSubjectRailProps) {
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return slots;
    return slots.filter((slot) => slot.subjectLabel.toLowerCase().includes(q));
  }, [slots, query]);

  const showSearch = slots.length >= 3;

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
          No exam configuration for your subjects in this class. Ask the exam officer to link grading schemes.
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
            placeholder="Search subjects…"
            className="h-9 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-[13px] text-neutral-800 outline-none transition-colors focus:border-brand-300"
          />
        </label>
      ) : null}

      <div className="relative">
        {filtered.length > 2 ? (
          <>
            <button
              type="button"
              aria-label="Scroll subjects left"
              className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-1 shadow-sm sm:inline-flex"
              onClick={() => scrollBy(-180)}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll subjects right"
              className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-neutral-200 bg-white p-1 shadow-sm sm:inline-flex"
              onClick={() => scrollBy(180)}
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </>
        ) : null}

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filtered.map((slot) => {
            const selected = slot.subjectId === value;
            return (
              <button
                key={slot.subjectId}
                ref={selected ? selectedRef : undefined}
                type="button"
                disabled={disabled}
                onClick={() => onChange(slot.subjectId)}
                className={cn(
                  'flex min-w-[108px] shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-3 text-center transition-all duration-200',
                  selected
                    ? 'border-brand-300 bg-brand-50 shadow-sm ring-1 ring-brand-200/60'
                    : 'border-neutral-200 bg-white hover:border-brand-200 hover:bg-brand-50/40',
                  disabled && 'opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl text-[11px] font-bold uppercase',
                    selected ? 'bg-brand-500 text-neutral-900' : 'bg-neutral-100 text-neutral-600',
                  )}
                >
                  {slot.subjectLabel.slice(0, 3)}
                </span>
                <span className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-neutral-800">
                  {slot.subjectLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
