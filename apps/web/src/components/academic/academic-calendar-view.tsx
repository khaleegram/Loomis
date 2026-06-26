'use client';

import Link from 'next/link';

import { AcademicEmptyState } from '@/components/academic/academic-empty-state';
import type { CalendarEvent } from '@/lib/academic/academic-metrics';
import { daysUntil } from '@/lib/academic/academic-lifecycle-utils';
import { formatCalendarDate } from '@/lib/academic/term-labels';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { cn } from '@loomis/ui-web';
import { CalendarDays, Trash2 } from 'lucide-react';

const CATEGORY_STYLES: Record<
  CalendarEvent['category'],
  { dot: string; badge: string; label: string; bar: string }
> = {
  term: {
    dot: 'bg-brand-600',
    badge: 'bg-brand-50 text-brand-800 border-brand-100',
    label: 'Term',
    bar: 'from-brand-400 to-brand-600',
  },
  enrollment: {
    dot: 'bg-accent-teal-500',
    badge: 'bg-accent-teal-50 text-accent-teal-800 border-accent-teal-100',
    label: 'Enrollment',
    bar: 'from-accent-teal-400 to-accent-teal-600',
  },
  census: {
    dot: 'bg-gold-500',
    badge: 'bg-gold-50 text-gold-800 border-gold-100',
    label: 'Census',
    bar: 'from-gold-400 to-gold-600',
  },
  exam: {
    dot: 'bg-accent-purple-500',
    badge: 'bg-accent-purple-50 text-accent-purple-800 border-accent-purple-100',
    label: 'Exams',
    bar: 'from-accent-purple-400 to-accent-purple-600',
  },
  custom: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-100',
    label: 'School',
    bar: 'from-rose-400 to-rose-600',
  },
};

interface AcademicCalendarViewProps {
  events: CalendarEvent[];
  termName?: string;
  emptyMessage?: string;
  /** When provided, school-added events show a delete button wired to this. */
  onDeleteEvent?: (eventDbId: string) => void;
  deletingEventId?: string | null;
}

/** Horizontal milestone strip + vertical timeline. */
export function AcademicCalendarView({
  events,
  termName,
  emptyMessage = 'Configure term dates in Sessions to populate the calendar.',
  onDeleteEvent,
  deletingEventId,
}: AcademicCalendarViewProps) {
  if (events.length === 0) {
    return (
      <AcademicEmptyState
        icon={CalendarDays}
        title="No calendar events yet"
        description={emptyMessage}
        action={
          <Link href="/school/academic/sessions" className={ACADEMIC_UI.btnSecondarySm}>
            Configure in Sessions
          </Link>
        }
      />
    );
  }

  const termStart = events[0]?.date;
  const termEnd = events[events.length - 1]?.date;

  return (
    <div className="space-y-8">
      {/* Horizontal milestone rail */}
      <div className="card overflow-hidden rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Term arc
            </p>
            <p className="text-[15px] font-bold text-neutral-900">{termName ?? 'Academic term'}</p>
          </div>
          {termStart && termEnd ? (
            <p className="text-[11px] text-neutral-400">
              {formatCalendarDate(termStart)} → {formatCalendarDate(termEnd)}
            </p>
          ) : null}
        </div>

        <div className="relative mt-2">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-neutral-100" />
          <ol className="relative flex justify-between gap-1 overflow-x-auto pb-1">
            {events.map((event) => {
              const styles = CATEGORY_STYLES[event.category];
              const delta = daysUntil(event.date);
              const [, , day] = event.date.split('-');
              const isToday = delta === 0;

              return (
                <li
                  key={event.id}
                  className="relative flex min-w-[72px] flex-col items-center px-1"
                  title={formatCalendarDate(event.date)}
                >
                  {isToday ? (
                    <span
                      className="absolute left-1/2 top-0 size-10 -translate-x-1/2 animate-ping rounded-xl bg-brand-400/25"
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={cn(
                      'relative z-10 flex size-10 flex-col items-center justify-center rounded-xl border bg-white shadow-sm transition-all',
                      isToday
                        ? 'border-brand-400 ring-2 ring-brand-300 ring-offset-2'
                        : 'border-white',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute inset-x-1 top-0 h-0.5 rounded-full bg-gradient-to-r',
                        styles.bar,
                      )}
                    />
                    <span className="text-[13px] font-bold tabular-nums text-neutral-900">{day}</span>
                  </div>
                  <p className="mt-2 max-w-[72px] truncate text-center text-[9px] font-semibold text-neutral-500">
                    {event.label.split(' ')[0]}
                  </p>
                  {isToday ? (
                    <p className="text-[8px] font-bold uppercase text-brand-700">Today</p>
                  ) : delta != null && delta >= 0 && delta <= 30 ? (
                    <p className="text-[8px] font-bold uppercase text-neutral-400">{delta}d</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Detailed timeline */}
      {events.map((event, index) => {
        const styles = CATEGORY_STYLES[event.category];
        const isLast = index === events.length - 1;
        const delta = daysUntil(event.date);
        const isToday = delta === 0;

        return (
          <div key={event.id} className="relative pl-8">
            {!isLast ? (
              <div className="absolute bottom-0 left-[11px] top-6 w-px bg-neutral-100" aria-hidden />
            ) : null}
            <span
              className={cn(
                'absolute left-0 top-1 flex size-6 items-center justify-center rounded-full ring-4 ring-white',
                styles.dot,
                isToday && 'ring-brand-200',
              )}
            />
            <div
              className={cn(
                'card mb-4 rounded-xl p-4 last:mb-0 transition-all',
                isToday && 'border-brand-200 bg-brand-50/30 ring-1 ring-brand-100',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-neutral-900">{event.label}</p>
                    {isToday ? (
                      <span className="rounded-full bg-brand-500 px-1.5 py-px text-[8px] font-bold uppercase text-neutral-900">
                        Today
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[13px] text-neutral-500">{formatCalendarDate(event.date)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      styles.badge,
                    )}
                  >
                    {styles.label}
                  </span>
                  {onDeleteEvent && event.eventDbId ? (
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(event.eventDbId as string)}
                      disabled={deletingEventId === event.eventDbId}
                      aria-label={`Delete ${event.label}`}
                      className="rounded-lg p-1 text-neutral-300 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 aria-hidden className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
              {event.description ? (
                <p className="mt-2 text-[12px] text-neutral-400">{event.description}</p>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-3">
        {(Object.keys(CATEGORY_STYLES) as CalendarEvent['category'][]).map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500">
            <span className={cn('size-2 rounded-full', CATEGORY_STYLES[key].dot)} aria-hidden />
            {CATEGORY_STYLES[key].label}
          </span>
        ))}
      </div>
    </div>
  );
}
