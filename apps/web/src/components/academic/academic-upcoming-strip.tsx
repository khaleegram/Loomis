'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';

import { AcademicEmptyState } from '@/components/academic/academic-empty-state';
import type { CalendarEvent } from '@/lib/academic/academic-metrics';
import { daysUntil } from '@/lib/academic/academic-lifecycle-utils';
import { formatCalendarDate } from '@/lib/academic/term-labels';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { cn } from '@loomis/ui-web';

const CATEGORY_DOT: Record<CalendarEvent['category'], string> = {
  term: 'bg-brand-600',
  enrollment: 'bg-accent-teal-500',
  census: 'bg-gold-500',
  exam: 'bg-accent-purple-500',
  custom: 'bg-rose-500',
};

interface AcademicUpcomingStripProps {
  events: CalendarEvent[];
  termName?: string;
}

export function AcademicUpcomingStrip({ events, termName }: AcademicUpcomingStripProps) {
  const upcoming = events.slice(0, 5);

  return (
    <div className="card flex h-full flex-col rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100/80">
            <CalendarClock aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Upcoming
            </p>
            <p className="text-[13px] font-bold text-neutral-900">{termName ?? 'Term dates'}</p>
          </div>
        </div>
        <Link
          href="/school/academic/calendar"
          className="text-[11px] font-semibold text-brand-700 transition hover:text-brand-800 hover:underline"
        >
          Full calendar
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <AcademicEmptyState
          compact
          icon={CalendarClock}
          title="No milestones yet"
          description="Configure term dates in Sessions to see milestones here."
          action={
            <Link href="/school/academic/sessions" className={ACADEMIC_UI.btnSecondarySm}>
              Go to Sessions
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {upcoming.map((event) => {
            const delta = daysUntil(event.date);
            const monthLabel = new Date(event.date).toLocaleDateString('en-NG', { month: 'short' });
            const [, , day] = event.date.split('-');
            const isToday = delta === 0;
            const isTomorrow = delta === 1;

            return (
              <li
                key={event.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200',
                  isToday &&
                    'border-brand-300 bg-brand-50/60 shadow-sm ring-1 ring-brand-200/50',
                  isTomorrow && !isToday && 'border-gold-200 bg-gold-50/40',
                  !isToday && !isTomorrow && 'border-neutral-100 bg-neutral-50/50 hover:border-brand-100 hover:bg-brand-50/30',
                )}
              >
                <div
                  className={cn(
                    'flex min-w-[44px] flex-col items-center rounded-lg px-2 py-1 shadow-xs',
                    isToday ? 'bg-brand-500 text-neutral-900' : 'bg-white',
                  )}
                >
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase',
                      isToday ? 'text-neutral-800/70' : 'text-neutral-400',
                    )}
                  >
                    {monthLabel}
                  </span>
                  <span
                    className={cn(
                      'tabular-nums leading-none',
                      isToday ? 'text-neutral-900' : 'text-neutral-900',
                    )}
                    style={{ fontSize: '1.125rem', fontWeight: 800 }}
                  >
                    {day}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('size-1.5 shrink-0 rounded-full', CATEGORY_DOT[event.category])} />
                    <p className="truncate text-[12px] font-semibold text-neutral-800">{event.label}</p>
                    {isToday ? (
                      <span className="shrink-0 rounded-full bg-brand-600 px-1.5 py-px text-[8px] font-bold uppercase text-neutral-900">
                        Today
                      </span>
                    ) : isTomorrow ? (
                      <span className="shrink-0 rounded-full bg-gold-100 px-1.5 py-px text-[8px] font-bold uppercase text-gold-800">
                        Tomorrow
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    {delta != null && delta >= 0
                      ? delta === 0
                        ? 'Happening today'
                        : `In ${delta} day${delta === 1 ? '' : 's'}`
                      : formatCalendarDate(event.date)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {upcoming.length > 0 ? (
        <Link href="/school/academic/sessions" className={`mt-4 inline-flex w-fit ${ACADEMIC_UI.btnSecondarySm}`}>
          Edit term dates
        </Link>
      ) : null}
    </div>
  );
}
