'use client';

import type { TimetableClassArmSummary } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface TimetableClassRailProps {
  classArms: TimetableClassArmSummary[];
  selectedClassArmId: string | null;
  onSelectClassArm: (classArmId: string) => void;
  classLabel: string | null;
  lessonCount?: number;
  draftCount?: number;
}

function statusMeta(status: TimetableClassArmSummary['status']) {
  switch (status) {
    case 'published':
      return { label: 'Live', dot: 'bg-emerald-500', ring: 'ring-emerald-500/30', chip: 'bg-emerald-50 text-emerald-800' };
    case 'draft':
      return { label: 'Draft', dot: 'bg-amber-500', ring: 'ring-amber-500/30', chip: 'bg-amber-50 text-amber-900' };
    default:
      return { label: 'Empty', dot: 'bg-neutral-300', ring: 'ring-neutral-300/40', chip: 'bg-neutral-100 text-neutral-500' };
  }
}

export function TimetableClassRail({
  classArms,
  selectedClassArmId,
  onSelectClassArm,
  classLabel,
  lessonCount = 0,
  draftCount = 0,
}: TimetableClassRailProps) {
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classArms;
    return classArms.filter((arm) => arm.classArmLabel.toLowerCase().includes(q));
  }, [classArms, query]);

  const showSearch = classArms.length > 8;

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedClassArmId]);

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  function handleSelect(classArmId: string) {
    onSelectClassArm(classArmId);
    requestAnimationFrame(() => {
      document.getElementById('timetable-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="relative border-t border-brand-100/50 bg-gradient-to-b from-white to-brand-50/20 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className={ACADEMIC_UI.sectionLabel}>Pick a class</p>
          {classLabel ? (
            <p className="text-[16px] font-extrabold tracking-tight text-neutral-900">
              Editing{' '}
              <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
                {classLabel}
              </span>
            </p>
          ) : (
            <p className="text-[14px] font-medium text-neutral-500">Tap a card to open the bell grid below</p>
          )}
          {classLabel ? (
            <p className="mt-0.5 text-[12px] font-semibold text-neutral-400">
              {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
              {draftCount > 0 ? ` · ${draftCount} draft` : ''}
            </p>
          ) : null}
        </div>

        {showSearch ? (
          <label className="relative block w-full sm:max-w-xs">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find class…"
              className="h-11 w-full rounded-xl border border-neutral-200/80 bg-white pl-10 pr-3 text-[13px] font-medium text-neutral-900 shadow-xs outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200/60"
            />
          </label>
        ) : null}
      </div>

      <div className="relative">
        {classArms.length > 4 ? (
          <>
            <button
              type="button"
              aria-label="Scroll classes left"
              onClick={() => scrollBy(-280)}
              className="absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/80 bg-white/95 p-2 shadow-md backdrop-blur-sm transition hover:bg-brand-50 md:flex"
            >
              <ChevronLeft aria-hidden className="size-4 text-neutral-600" />
            </button>
            <button
              type="button"
              aria-label="Scroll classes right"
              onClick={() => scrollBy(280)}
              className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/80 bg-white/95 p-2 shadow-md backdrop-blur-sm transition hover:bg-brand-50 md:flex"
            >
              <ChevronRight aria-hidden className="size-4 text-neutral-600" />
            </button>
          </>
        ) : null}

        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent sm:w-8"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-brand-50/80 to-transparent sm:w-8"
          aria-hidden
        />

        <div
          ref={scrollRef}
          className="relative z-0 flex gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-1 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-[13px] text-neutral-500">No class matches &ldquo;{query}&rdquo;</p>
          ) : (
            filtered.map((arm) => {
              const selected = arm.classArmId === selectedClassArmId;
              const meta = statusMeta(arm.status);
              return (
                <button
                  key={arm.classArmId}
                  ref={selected ? selectedRef : undefined}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Open timetable for ${arm.classArmLabel}`}
                  onClick={() => handleSelect(arm.classArmId)}
                  className={cn(
                    'card group relative flex w-[7.25rem] shrink-0 snap-start flex-col rounded-2xl border p-3 text-left transition-all duration-200',
                    'cursor-pointer touch-manipulation select-none active:scale-[0.97]',
                    'min-h-[100px] sm:w-[8.5rem]',
                    selected
                      ? cn(
                          'border-brand-400 bg-gradient-to-br from-brand-50 via-white to-brand-100/40 shadow-lg',
                          meta.ring,
                          'ring-2',
                        )
                      : 'border-neutral-200/70 bg-white hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md',
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[12px] font-extrabold leading-tight text-neutral-900">
                      {arm.classArmLabel}
                    </span>
                    <span className={cn('mt-0.5 size-2 shrink-0 rounded-full', meta.dot)} aria-hidden />
                  </div>

                  <span
                    className={cn(
                      'mt-3 text-2xl font-extrabold tabular-nums leading-none',
                      arm.lessonCount > 0 ? 'text-neutral-900' : 'text-neutral-300',
                    )}
                  >
                    {arm.lessonCount}
                  </span>

                  <span
                    className={cn(
                      'mt-2 inline-flex w-fit rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                      meta.chip,
                    )}
                  >
                    {meta.label}
                  </span>

                  {selected ? (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-brand-400 to-brand-600" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      {showSearch ? (
        <p className="mt-2 text-center text-[11px] font-medium text-neutral-400 sm:text-left">
          {filtered.length} of {classArms.length} classes · swipe on mobile
        </p>
      ) : null}
    </div>
  );
}
