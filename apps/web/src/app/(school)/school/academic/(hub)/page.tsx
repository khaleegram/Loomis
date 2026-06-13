'use client';

import { useMemo } from 'react';
import {
  useAcademicTerms,
  useAcademicYears,
  usePromotions,
} from '@loomis/api-client';

import { AcademicBentoGrid } from '@/components/academic/academic-bento-grid';
import {
  AcademicCommandDeck,
  AcademicCommandDeckSkeleton,
} from '@/components/academic/academic-command-deck';
import { AcademicSectionHeader } from '@/components/academic/academic-empty-state';
import { AcademicUpcomingStrip } from '@/components/academic/academic-upcoming-strip';
import { AcademicYearEndPanel } from '@/components/academic/academic-year-end-panel';
import { useCanAny } from '@/lib/auth/use-capability';
import {
  buildTermCalendarEvents,
  computeAcademicMetrics,
  pickActiveYear,
  pickOpenTerm,
} from '@/lib/academic/academic-metrics';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AcademicHubPage() {
  const tenantId = useTenantId();
  const canView = useCanAny([
    'academic_year.manage',
    'term.manage',
    'census.lock',
    'student.promote',
    'student.graduate',
  ]);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYear = useMemo(() => pickActiveYear(years), [years]);

  const termsQuery = useAcademicTerms(tenantId ?? '', activeYear?.id ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const focusTerm = useMemo(() => pickOpenTerm(terms), [terms]);

  const promotionsQuery = usePromotions(tenantId ?? '', activeYear?.id ?? '');
  const promotions = promotionsQuery.data?.records ?? [];

  const metrics = useMemo(
    () => computeAcademicMetrics(years, terms, promotions),
    [years, terms, promotions],
  );

  const calendarEvents = useMemo(
    () => (focusTerm ? buildTermCalendarEvents(focusTerm) : []),
    [focusTerm],
  );

  const isLoading = yearsQuery.isLoading || termsQuery.isLoading;

  if (!tenantId) {
    return <p className="text-sm font-medium text-red-600">No tenant context. Sign in again.</p>;
  }

  if (!canView) {
    return (
      <p className="text-sm text-neutral-500">You do not have permission to view academic operations.</p>
    );
  }

  return (
    <div className="space-y-8">
      {isLoading ? (
        <AcademicCommandDeckSkeleton />
      ) : (
        <AcademicCommandDeck
          metrics={metrics}
          terms={terms}
          focusTerm={focusTerm}
          yearId={activeYear?.id ?? null}
        />
      )}

      <AcademicSectionHeader
        label="Workflow modules"
        title="Everything in one place"
        description="Jump into sessions, census, calendar, promotions, or graduation — each tile reflects live status from your active year."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <AcademicBentoGrid
            metrics={metrics}
            yearId={activeYear?.id ?? null}
            termId={focusTerm?.id ?? null}
          />
        </div>

        <aside className="space-y-4 xl:col-span-4">
          <AcademicUpcomingStrip events={calendarEvents} termName={focusTerm?.name} />
          <AcademicYearEndPanel metrics={metrics} />
        </aside>
      </div>
    </div>
  );
}
