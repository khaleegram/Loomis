'use client';

import { useMemo, useState } from 'react';
import { useAcademicTerms, useAcademicYears } from '@loomis/api-client';
import type { AcademicTermResponse } from '@loomis/contracts';
import Link from 'next/link';
import { CalendarRange, Plus, Sparkles } from 'lucide-react';
import { Skeleton, cn } from '@loomis/ui-web';

import { AcademicEmptyState } from '@/components/academic/academic-empty-state';
import { CloseTermDialog } from '@/components/academic/close-term-dialog';
import { SetupSchoolYearSheet } from '@/components/academic/setup-school-year-sheet';
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
          <Link href="/school/academic/setup" className={ACADEMIC_UI.btnPrimary}>
            <Plus aria-hidden className="size-4" />
            Setup guide
          </Link>
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
          description="Use the setup guide to name your year, create terms, and open the current one — all in one flow."
          action={
            canManageYear ? (
              <Link href="/school/academic/setup" className={ACADEMIC_UI.btnPrimary}>
                Open setup guide
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && draftYear && !activeYear ? (
        <div className={`rounded-2xl border p-6 ${SEMANTIC.warning.surfaceSubtle}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[14px] font-bold text-neutral-900">{draftYear.label} needs its terms</p>
              <p className="mt-1 text-[13px] text-neutral-600">
                Open the setup guide and tap one button to create terms and go live.
              </p>
            </div>
            {canManageYear ? (
              <Link
                href="/school/academic/setup"
                className={cn(ACADEMIC_UI.btnPrimary, 'shrink-0 justify-center')}
              >
                <Sparkles aria-hidden className="size-4" />
                Finish in setup guide
              </Link>
            ) : null}
          </div>
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
