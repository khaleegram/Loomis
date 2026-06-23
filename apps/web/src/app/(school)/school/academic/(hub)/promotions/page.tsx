'use client';

import { useMemo, useState } from 'react';
import {
  useAcademicYears,
  useClassLevels,
  useClassStructure,
  useConfirmPromotion,
  usePromotions,
  useStudents,
} from '@loomis/api-client';
import type { AcademicYearResponse } from '@loomis/contracts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@loomis/ui-web';
import { AlertTriangle, Check } from 'lucide-react';

import { BulkEnrollmentPanel } from '@/components/academic/bulk-enrollment-panel';
import { GraduationCertificatesPanel } from '@/components/academic/graduation-certificates-panel';
import { PromotionStagingPanel } from '@/components/academic/promotion-staging-panel';
import { PromotionReviewTable } from '@/components/academic/promotion-review-table';
import { AcademicSectionHeader } from '@/components/academic/academic-empty-state';
import { AcademicYearBridge } from '@/components/academic/academic-year-bridge';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { pickActiveYear } from '@/lib/academic/academic-metrics';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC } from '@/lib/design/surfaces';
import { studentDisplayName } from '@/lib/student/student-labels';
import { useCan } from '@/lib/auth/use-capability';
import { useCanConfirmPromotions } from '@/lib/auth/use-can-confirm-promotions';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';
import { cn } from '@loomis/ui-web';

function pickNextYear(years: AcademicYearResponse[], fromYear: AcademicYearResponse | null) {
  if (!fromYear) return null;
  const candidates = years.filter(
    (y) => y.id !== fromYear.id && y.status !== 'closed' && y.startDate >= fromYear.startDate,
  );
  return candidates.sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
}

type PromotionsTab = 'stage' | 'review';

export default function AcademicPromotionsPage() {
  const tenantId = useTenantId();
  const canPromote = useCan('student.promote');
  const canConfirm = useCanConfirmPromotions();
  const { isAdvanced, flags } = useTenantExperience();
  const [tab, setTab] = useState<PromotionsTab>('stage');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const fromYear = useMemo(() => pickActiveYear(years), [years]);
  const toYear = useMemo(() => pickNextYear(years, fromYear), [years, fromYear]);

  const promotionsQuery = usePromotions(tenantId ?? '', fromYear?.id ?? '');
  const promotions = promotionsQuery.data?.records ?? [];
  const proposed = promotions.filter((p) => p.status === 'proposed');
  const confirmed = promotions.filter((p) => p.status === 'confirmed');
  const proposedHeldBack = proposed.filter((p) => p.outcome === 'held_back');
  const confirmedGraduates = confirmed.filter((p) => p.outcome === 'graduated');
  const hasConfirmed = confirmed.length > 0;

  const structureQuery = useClassStructure(tenantId ?? '', fromYear?.id ?? '');
  const levelsQuery = useClassLevels(tenantId ?? '');
  const levels = levelsQuery.data?.levels ?? structureQuery.data?.levels ?? [];

  const studentsQuery = useStudents(tenantId ?? '', { status: 'enrolled' });
  const students = studentsQuery.data?.students ?? [];
  const studentNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const student of students) {
      map[student.id] = studentDisplayName(student.firstName, student.lastName);
    }
    return map;
  }, [students]);

  const confirmPromotion = useConfirmPromotion(tenantId ?? '');

  async function handleConfirm() {
    if (!fromYear) return;
    setConfirmError(null);
    try {
      await confirmPromotion.mutateAsync({ fromAcademicYearId: fromYear.id });
      setConfirmOpen(false);
      setTab('review');
    } catch (err) {
      setConfirmError(academicErrorMessage(err));
    }
  }

  if (!tenantId) {
    return <p className="text-sm text-red-600">No tenant context.</p>;
  }

  if (!canPromote) {
    return <p className="text-sm text-neutral-500">You do not have permission to manage promotions.</p>;
  }

  const isLoading = yearsQuery.isLoading || promotionsQuery.isLoading;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Year-end promotions</p>
          <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
            Stage & confirm
          </h1>
          <p className={ACADEMIC_UI.pageDesc}>
            Admin Officers build the promotion list from enrolled students. Principals review and
            confirm — segregation of duties is enforced.
          </p>
        </div>
        {canConfirm && proposed.length > 0 ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={confirmPromotion.isPending}
            className={ACADEMIC_UI.btnPrimary}
          >
            <Check aria-hidden className="size-4" />
            {confirmPromotion.isPending ? 'Confirming…' : 'Confirm promotions'}
          </button>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('stage')}
          className={cn(tab === 'stage' ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive)}
        >
          Stage list
        </button>
        <button
          type="button"
          onClick={() => setTab('review')}
          className={cn(tab === 'review' ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive)}
        >
          Review
          {proposed.length > 0 ? (
            <span className="ml-1.5 rounded-full bg-gold-500 px-1.5 py-px text-[9px] font-bold text-neutral-900">
              {proposed.length}
            </span>
          ) : null}
        </button>
      </div>

      <AcademicYearBridge fromLabel={fromYear?.label ?? null} toLabel={toYear?.label ?? null} />

      {isAdvanced && flags.workflowsInbox && proposedHeldBack.length > 0 ? (
        <div className={`card rounded-2xl p-5 ${SEMANTIC.warning.surfaceSubtle}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-700" />
            <div className="space-y-1 text-[13px] text-neutral-700">
              <p className="font-semibold text-neutral-900">
                {proposedHeldBack.length} held-back student
                {proposedHeldBack.length === 1 ? '' : 's'} need School Owner approval
              </p>
              <p>
                Confirm promotions is blocked until held-back overrides are approved in the{' '}
                <a href="/school/workflows/inbox" className="font-medium text-brand-700 underline">
                  workflow inbox
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!isAdvanced && proposedHeldBack.length > 0 ? (
        <div className={`card rounded-2xl p-5 ${SEMANTIC.warning.surfaceSubtle}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-700" />
            <div className="space-y-1 text-[13px] text-neutral-700">
              <p className="font-semibold text-neutral-900">
                {proposedHeldBack.length} held-back student
                {proposedHeldBack.length === 1 ? '' : 's'} on this staging list
              </p>
              <p>
                On Core tier the Principal confirms held-back promotions directly — document the
                override reason when confirming promotions.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!toYear ? (
        <div className={`card rounded-2xl p-5 ${SEMANTIC.warning.surfaceSubtle}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-700" />
            <p className="text-[13px] text-neutral-600">
              Create and activate the next academic year before staging promotions.
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'stage' && fromYear && toYear ? (
        <PromotionStagingPanel
          tenantId={tenantId}
          fromYear={fromYear}
          toYear={toYear}
          hasConfirmedPromotions={hasConfirmed}
          onStaged={() => setTab('review')}
        />
      ) : null}

      {tab === 'review' ? (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {proposed.length > 0 ? (
                <section className="space-y-3">
                  <AcademicSectionHeader
                    label="Awaiting confirmation"
                    title={`${proposed.length} record${proposed.length === 1 ? '' : 's'} need Principal review`}
                    description={
                      canConfirm
                        ? 'Review held-back overrides before confirming — this action is permanent.'
                        : 'Awaiting Principal confirmation.'
                    }
                  />
                  <PromotionReviewTable
                    records={proposed}
                    levels={levels}
                    studentNames={studentNames}
                  />
                </section>
              ) : null}

              {confirmed.length > 0 ? (
                <section className="space-y-3">
                  <AcademicSectionHeader
                    label="Confirmed"
                    title={`${confirmed.length} promotion record${confirmed.length === 1 ? '' : 's'}`}
                  />
                  <PromotionReviewTable
                    records={confirmed}
                    levels={levels}
                    studentNames={studentNames}
                  />
                </section>
              ) : null}

              {proposed.length === 0 && confirmed.length === 0 ? (
                <PromotionReviewTable
                  records={[]}
                  levels={levels}
                  emptyMessage="No promotion list staged yet. Use the Stage tab to build the list from enrolled students."
                />
              ) : null}
            </>
          )}

          {toYear && confirmed.length > 0 ? (
            <BulkEnrollmentPanel
              tenantId={tenantId}
              toYear={toYear}
              confirmedRecords={confirmed}
              levels={levels}
              studentNames={studentNames}
              students={students}
            />
          ) : null}

          {fromYear && confirmedGraduates.length > 0 ? (
            <section className="space-y-3">
              <AcademicSectionHeader
                label="Graduation"
                title="Leaving certificates"
                description="Download PDF certificates for confirmed graduates."
              />
              <GraduationCertificatesPanel
                tenantId={tenantId}
                academicYearId={fromYear.id}
                records={confirmedGraduates}
                studentNames={studentNames}
              />
            </section>
          ) : null}
        </>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm promotion list?</DialogTitle>
            <DialogDescription>
              This permanently confirms {proposed.length} promotion record
              {proposed.length === 1 ? '' : 's'} for {fromYear?.label}. Students can be enrolled
              in the next term afterward.
            </DialogDescription>
          </DialogHeader>
          {confirmError ? (
            <div className={`rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>
              {confirmError}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-end">
            <button type="button" onClick={() => setConfirmOpen(false)} className={ACADEMIC_UI.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmPromotion.isPending}
              className={ACADEMIC_UI.btnPrimary}
            >
              {confirmPromotion.isPending ? 'Confirming…' : 'Confirm promotions'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
