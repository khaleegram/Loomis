'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAcademicTerms, useAcademicYears, usePromotions } from '@loomis/api-client';
import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import { CalendarRange, Plus } from 'lucide-react';
import { Skeleton } from '@loomis/ui-web';

import { ActivateYearDialog } from '@/components/academic/activate-year-dialog';
import {
  AcademicCommandDeck,
  AcademicCommandDeckSkeleton,
} from '@/components/academic/academic-command-deck';
import { AcademicEmptyState } from '@/components/academic/academic-empty-state';
import { CloseTermDialog } from '@/components/academic/close-term-dialog';
import { CreateYearSheet } from '@/components/academic/create-year-sheet';
import { TermConfigPanel } from '@/components/academic/term-config-panel';
import { TermStatusBadge, YearStatusBadge } from '@/components/academic/term-status-badge';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import {
  computeAcademicMetrics,
  pickActiveYear,
  pickOpenTerm,
} from '@/lib/academic/academic-metrics';
import { termLifecycleProgress } from '@/lib/academic/academic-lifecycle-utils';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatCalendarDate } from '@/lib/academic/term-labels';
import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { cn } from '@loomis/ui-web';

export default function AcademicSessionsPage() {
  const tenantId = useTenantId();
  const canManageYear = useCan('academic_year.manage');
  const canManageTerm = useCan('term.manage');
  const canView = useCanAny(['academic_year.manage', 'term.manage', 'census.lock']);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];

  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activateYear, setActivateYear] = useState<AcademicYearResponse | null>(null);
  const [closeTerm, setCloseTerm] = useState<AcademicTermResponse | null>(null);

  const activeYearId = selectedYearId ?? pickActiveYear(years)?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId ?? '', activeYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const activeTermId = selectedTermId ?? pickOpenTerm(terms)?.id ?? null;
  const activeYear = years.find((y) => y.id === activeYearId) ?? null;
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;

  const promotionsQuery = usePromotions(tenantId ?? '', activeYearId ?? '');
  const metrics = useMemo(
    () => computeAcademicMetrics(years, terms, promotionsQuery.data?.records ?? []),
    [years, terms, promotionsQuery.data?.records],
  );

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [years],
  );

  if (!canView) {
    return <p className="text-sm text-neutral-500">You do not have permission to manage academic sessions.</p>;
  }

  if (!tenantId) {
    return (
      <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
        No tenant context. Sign in again.
      </div>
    );
  }

  const isLoading = yearsQuery.isLoading || termsQuery.isLoading;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Term studio</p>
          <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
            Session lifecycle
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Shape the academic calendar — configure dates, open the term, and close when ready.
          </p>
        </div>
        {canManageYear ? (
          <button type="button" onClick={() => setCreateOpen(true)} className={ACADEMIC_UI.btnPrimary}>
            <Plus aria-hidden className="size-4" />
            Create academic year
          </button>
        ) : null}
      </header>

      {isLoading ? <AcademicCommandDeckSkeleton /> : null}

      {!isLoading && activeYear && activeTerm ? (
        <AcademicCommandDeck
          metrics={metrics}
          terms={terms}
          focusTerm={activeTerm}
          yearId={activeYear.id}
        />
      ) : null}

      {yearsQuery.isError ? (
        <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
          Failed to load academic years.
        </div>
      ) : null}

      {!yearsQuery.isLoading && years.length === 0 ? (
        <AcademicEmptyState
          icon={CalendarRange}
          title="No academic years yet"
          description="Create your first academic year to begin configuring terms and opening the session lifecycle."
          action={
            canManageYear ? (
              <button type="button" onClick={() => setCreateOpen(true)} className={ACADEMIC_UI.btnPrimary}>
                Create academic year
              </button>
            ) : undefined
          }
        />
      ) : null}

      {termsQuery.isError ? (
        <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
          Failed to load terms for this year. If you recently deployed platform billing, run API
          migration 0047 on the database, then refresh.
        </div>
      ) : null}

      {!yearsQuery.isLoading && years.length > 0 && activeYear ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Year & term picker sidebar */}
          <aside className="space-y-4 lg:col-span-4">
            <div className="card rounded-2xl p-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Academic years
              </p>
              <div className="space-y-2">
                {sortedYears.map((year) => {
                  const isActive = year.id === activeYearId;
                  return (
                    <button
                      key={year.id}
                      type="button"
                      onClick={() => {
                        setSelectedYearId(year.id);
                        setSelectedTermId(null);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition',
                        isActive
                          ? 'border-brand-300 bg-brand-50/70'
                          : 'border-neutral-100 hover:border-brand-200 hover:bg-neutral-50',
                      )}
                    >
                      <div>
                        <p className="text-[13px] font-bold text-neutral-900">{year.label}</p>
                        <p className="text-[10px] text-neutral-400">
                          {formatCalendarDate(year.startDate)} — {formatCalendarDate(year.endDate)}
                        </p>
                      </div>
                      <YearStatusBadge status={year.status} />
                    </button>
                  );
                })}
              </div>
              {canManageYear && activeYear.status === 'draft' ? (
                <button
                  type="button"
                  onClick={() => setActivateYear(activeYear)}
                  className={`mt-3 w-full ${ACADEMIC_UI.btnSecondary}`}
                >
                  Activate {activeYear.label}
                </button>
              ) : null}
            </div>

            {terms.length > 0 ? (
              <div className="card rounded-2xl p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                  Terms in {activeYear.label}
                </p>
                <div className="space-y-2">
                  {terms.map((term) => {
                    const isActive = term.id === activeTermId;
                    const pct = termLifecycleProgress(term.status);
                    return (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => setSelectedTermId(term.id)}
                        className={cn(
                          'w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5',
                          isActive
                            ? 'border-brand-300 bg-white shadow-sm'
                            : 'border-neutral-100 bg-neutral-50/50 hover:border-brand-200',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-bold text-neutral-900">{term.name}</p>
                          <TermStatusBadge status={term.status} />
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: BRONZE.gradients.g1 }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.warning.surfaceSubtle}`}>
                {activeYear.status === 'draft'
                  ? 'Activate this year to create term placeholders.'
                  : 'No terms found.'}
              </div>
            )}
          </aside>

          {/* Term studio main panel */}
          <div className="space-y-4 lg:col-span-8">
            {termsQuery.isLoading ? <Skeleton className="h-96 w-full rounded-2xl" /> : null}

            {activeTerm ? (
              <>
                <TermConfigPanel tenantId={tenantId} yearId={activeYear.id} term={activeTerm} />
                <div className="flex flex-wrap gap-2">
                  {activeTerm.status === 'census_locked' && canManageTerm ? (
                    <button
                      type="button"
                      onClick={() => setCloseTerm(activeTerm)}
                      className={ACADEMIC_UI.btnSecondary}
                    >
                      Close term
                    </button>
                  ) : null}
                </div>
              </>
            ) : terms.length > 0 ? (
              <AcademicEmptyState
                compact
                icon={CalendarRange}
                title="Select a term"
                description="Choose a term from the sidebar to configure dates, enrollment windows, and exam periods."
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <CreateYearSheet
        tenantId={tenantId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setSelectedYearId(id)}
      />

      {activateYear ? (
        <ActivateYearDialog
          tenantId={tenantId}
          year={activateYear}
          open={Boolean(activateYear)}
          onOpenChange={(open) => {
            if (!open) setActivateYear(null);
          }}
        />
      ) : null}

      {closeTerm && activeYear ? (
        <CloseTermDialog
          tenantId={tenantId}
          yearId={activeYear.id}
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
