'use client';

import { useMemo, useState } from 'react';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import { Skeleton } from '@loomis/ui-web';

import { AcademicCalendarView } from '@/components/academic/academic-calendar-view';
import { AcademicUpcomingStrip } from '@/components/academic/academic-upcoming-strip';
import { useCanAny } from '@/lib/auth/use-capability';
import {
  buildTermCalendarEvents,
  pickActiveYear,
  pickOpenTerm,
} from '@/lib/academic/academic-metrics';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AcademicCalendarPage() {
  const tenantId = useTenantId();
  const canView = useCanAny(['academic_year.manage', 'term.manage', 'census.lock', 'gradebook.read']);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYear = useMemo(() => pickActiveYear(years), [years]);

  const termsQuery = useAcademicTerms(tenantId ?? '', activeYear?.id ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const defaultTerm = useMemo(() => pickOpenTerm(terms), [terms]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const selectedTerm = useMemo(() => {
    if (selectedTermId) {
      return terms.find((t) => t.id === selectedTermId) ?? defaultTerm;
    }
    return defaultTerm;
  }, [selectedTermId, terms, defaultTerm]);

  const events = useMemo(
    () => (selectedTerm ? buildTermCalendarEvents(selectedTerm) : []),
    [selectedTerm],
  );

  if (!tenantId) {
    return (
      <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
        No tenant context. Sign in again.
      </div>
    );
  }

  if (!canView) {
    return <p className="text-sm text-neutral-500">You do not have permission to view the academic calendar.</p>;
  }

  const isLoading = yearsQuery.isLoading || termsQuery.isLoading;

  return (
    <div className="space-y-8">
      <header>
        <p className={ACADEMIC_UI.sectionLabel}>Academic calendar</p>
        <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
          Key dates
        </h1>
        <p className={ACADEMIC_UI.pageDesc}>
          Read-only view of enrollment windows, exams, and census dates for the selected term.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {!selectedTerm ? (
            <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.warning.surfaceSubtle}`}>
              No term is available yet. Configure and open a term in Sessions to populate the calendar.
            </div>
          ) : null}

          {terms.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-1">
              {terms.map((term) => {
                const isActive = term.id === selectedTerm?.id;
                return (
                  <button
                    key={term.id}
                    type="button"
                    onClick={() => setSelectedTermId(term.id)}
                    className={isActive ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive}
                  >
                    {term.name}
                  </button>
                );
              })}
            </div>
          ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <AcademicCalendarView
            events={events}
            termName={selectedTerm?.name}
            emptyMessage="Set term start/end dates, enrollment window, census lock, and exam dates in Sessions."
          />
        </div>
        <aside className="lg:col-span-4">
          <AcademicUpcomingStrip events={events} termName={selectedTerm?.name} />
        </aside>
      </div>
        </>
      )}
    </div>
  );
}
