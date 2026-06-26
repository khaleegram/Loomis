'use client';

import type { AcademicTermResponse } from '@loomis/contracts';
import { CalendarDays, CheckCircle2, Clock } from 'lucide-react';

import { TermStatusBadge } from '@/components/academic/term-status-badge';
import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import { formatCalendarDate, termUserStatusLabel } from '@/lib/academic/term-labels';
import { cn } from '@loomis/ui-web';

interface SchoolYearTermsGridProps {
  terms: AcademicTermResponse[];
  currentTermId: string | null;
}

function termIcon(term: AcademicTermResponse, isCurrent: boolean) {
  if (term.status === 'closed') {
    return <CheckCircle2 aria-hidden className="size-5 text-emerald-600" />;
  }
  if (isCurrent || term.status === 'open' || term.status === 'census_locked') {
    return <CalendarDays aria-hidden className="size-5 text-brand-700" />;
  }
  return <Clock aria-hidden className="size-5 text-neutral-400" />;
}

export function SchoolYearTermsGrid({ terms, currentTermId }: SchoolYearTermsGridProps) {
  const sorted = [...terms].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((term) => {
        const isCurrent =
          term.id === currentTermId ||
          term.status === 'open' ||
          term.status === 'census_locked';
        const userStatus = termUserStatusLabel(term.status, isCurrent);

        return (
          <article
            key={term.id}
            className={cn(
              'relative overflow-hidden rounded-2xl border p-5 transition',
              isCurrent
                ? 'border-brand-300 bg-gradient-to-br from-brand-50/80 to-white shadow-sm ring-1 ring-brand-200/50'
                : 'border-neutral-100 bg-white',
            )}
          >
            {isCurrent ? (
              <div
                className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full opacity-20 blur-xl"
                style={{ background: BRONZE.gradients.g1 }}
              />
            ) : null}

            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl',
                    isCurrent ? 'bg-brand-100' : 'bg-neutral-50',
                  )}
                >
                  {termIcon(term, isCurrent)}
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                    Term {term.sequence}
                  </p>
                  <h3 className="text-[15px] font-bold text-neutral-900">{term.name}</h3>
                </div>
              </div>
              <TermStatusBadge status={term.status} userLabel={userStatus} />
            </div>

            <dl className="relative mt-4 space-y-2 text-[12px]">
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Runs</dt>
                <dd className="font-semibold text-neutral-800">
                  {formatCalendarDate(term.startDate)} — {formatCalendarDate(term.endDate)}
                </dd>
              </div>
              {term.censusSnapshotDate ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Platform billing</dt>
                  <dd className="font-medium text-neutral-700">
                    {formatCalendarDate(term.censusSnapshotDate)}
                    <span className="ml-1 text-neutral-400">(automatic)</span>
                  </dd>
                </div>
              ) : null}
            </dl>

            {isCurrent && term.status === 'open' ? (
              <p className="relative mt-4 rounded-xl border border-brand-100/60 bg-brand-50/40 px-3 py-2 text-[11px] text-neutral-600">
                This term is live — enroll students, take attendance, and run your school as usual.
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
