'use client';

import { useMemo, useState } from 'react';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import type { AcademicTermResponse } from '@loomis/contracts';
import { CalendarRange, Plus } from 'lucide-react';
import { Skeleton } from '@loomis/ui-web';

import { AcademicEmptyState } from '@/components/academic/academic-empty-state';
import { CloseTermDialog } from '@/components/academic/close-term-dialog';
import {
  FinalizeSchoolYearButton,
  SetupSchoolYearSheet,
} from '@/components/academic/setup-school-year-sheet';
import { SchoolYearTermsGrid } from '@/components/academic/school-year-terms-grid';
import { YearStatusBadge } from '@/components/academic/term-status-badge';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { pickActiveYear, pickOpenTerm } from '@/lib/academic/academic-session-utils';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatCalendarDate, yearUserStatusLabel } from '@/lib/academic/term-labels';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function SchoolYearPage() {
  const tenantId = useTenantId();
  const canManage = useCanAny(['academic_year.manage', 'term.manage']);
  const canManageYear = useCan('academic_year.manage');
  const canManageTerm = useCan('term.manage');

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYear = useMemo(() => pickActiveYear(years), [years]);
  const draftYear = useMemo(() => years.find((y) => y.status === 'draft') ?? null, [years]);
  const displayYear = activeYear ?? draftYear;

  const termsQuery = useAcademicTerms(tenantId ?? '', displayYear?.id ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const currentTerm = useMemo(() => pickOpenTerm(terms), [terms]);

  const [setupOpen, setSetupOpen] = useState(false);
  const [closeTerm, setCloseTerm] = useState<AcademicTermResponse | null>(null);

  if (!canManage) {
    return (
      <p className="text-sm text-neutral-500">You do not have permission to manage the school year.</p>
    );
  }

  if (!tenantId) {
    return (
      <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
        No tenant context. Sign in again.
      </div>
    );
  }

  const isLoading = yearsQuery.isLoading || (displayYear ? termsQuery.isLoading : false);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Academic calendar</p>
          <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
            School year
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Set your year once. Loomis creates your terms, opens the current one, and handles platform
            billing on the right date.
          </p>
        </div>
        {canManageYear && !activeYear && !draftYear ? (
          <button type="button" onClick={() => setSetupOpen(true)} className={ACADEMIC_UI.btnPrimary}>
            <Plus aria-hidden className="size-4" />
            Start school year
          </button>
        ) : null}
      </header>

      {yearsQuery.isError ? (
        <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
          Failed to load school years.
        </div>
      ) : null}

      {isLoading ? <Skeleton className="h-48 w-full rounded-2xl" /> : null}

      {!isLoading && !displayYear ? (
        <AcademicEmptyState
          icon={CalendarRange}
          title="No school year yet"
          description="Most schools need less than a minute — name your year, pick the start and end dates, and you are ready for admissions and fees."
          action={
            canManageYear ? (
              <button type="button" onClick={() => setSetupOpen(true)} className={ACADEMIC_UI.btnPrimary}>
                Start school year
              </button>
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && draftYear && !activeYear ? (
        <div className={`rounded-2xl border p-6 ${SEMANTIC.warning.surfaceSubtle}`}>
          <p className="text-[14px] font-bold text-neutral-900">{draftYear.label} is almost ready</p>
          <p className="mt-1 text-[13px] text-neutral-600">
            One tap will create your terms and open the current one — no separate activate or open steps.
          </p>
          {canManageYear ? (
            <div className="mt-4">
              <FinalizeSchoolYearButton tenantId={tenantId} yearId={draftYear.id} yearLabel={draftYear.label} />
            </div>
          ) : null}
        </div>
      ) : null}

      {!isLoading && displayYear && (activeYear || (draftYear && terms.length > 0)) ? (
        <div className="space-y-6">
          <div className="card rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  Current school year
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
                  {displayYear.label}
                </h2>
                <p className="mt-1 text-[13px] text-neutral-500">
                  {formatCalendarDate(displayYear.startDate)} — {formatCalendarDate(displayYear.endDate)}
                </p>
              </div>
              <YearStatusBadge status={displayYear.status} />
            </div>
            {displayYear.status === 'active' ? (
              <p className="mt-4 text-[12px] text-neutral-500">
                Status: {yearUserStatusLabel(displayYear.status)}
                {currentTerm ? ` · ${currentTerm.name} is your working term` : null}
              </p>
            ) : null}
          </div>

          {terms.length > 0 ? (
            <section className="space-y-3">
              <p className={ACADEMIC_UI.sectionLabel}>Your terms</p>
              <SchoolYearTermsGrid terms={terms} currentTermId={currentTerm?.id ?? null} />
            </section>
          ) : null}

          {canManageTerm && currentTerm?.status === 'census_locked' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCloseTerm(currentTerm)}
                className={ACADEMIC_UI.btnSecondary}
              >
                End {currentTerm.name}
              </button>
              <p className="text-[12px] text-neutral-500 self-center">
                End the term after results are published. The next term opens automatically on its start date.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <SetupSchoolYearSheet
        tenantId={tenantId}
        open={setupOpen}
        onOpenChange={setSetupOpen}
      />

      {closeTerm && displayYear ? (
        <CloseTermDialog
          tenantId={tenantId}
          yearId={displayYear.id}
          term={closeTerm}
          open={Boolean(closeTerm)}
          onOpenChange={(open) => {
            if (!open) setCloseTerm(null);
          }}
        />
      ) : null}
    </div>
  );
}
