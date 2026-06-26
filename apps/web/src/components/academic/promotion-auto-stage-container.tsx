'use client';

import { useMemo } from 'react';
import {
  useAcademicTerms,
  useClassStructure,
  useProgressions,
  useStagePromotion,
  useTermEnrollmentRoster,
} from '@loomis/api-client';
import type { AcademicYearResponse } from '@loomis/contracts';

import { PromotionAutoStagePanel } from '@/components/academic/promotion-auto-stage-panel';
import {
  buildStagingRows,
  stagingRowToDecision,
} from '@/lib/academic/promotion-staging-utils';

interface PromotionAutoStageContainerProps {
  tenantId: string;
  fromYear: AcademicYearResponse;
  toYear: AcademicYearResponse;
  hasConfirmedPromotions: boolean;
  onStaged?: () => void;
  onReviewExceptions?: () => void;
}

export function PromotionAutoStageContainer({
  tenantId,
  fromYear,
  toYear,
  hasConfirmedPromotions,
  onStaged,
  onReviewExceptions,
}: PromotionAutoStageContainerProps) {
  const termsQuery = useAcademicTerms(tenantId, fromYear.id);
  const terms = termsQuery.data?.terms ?? [];
  const latestTerm = useMemo(
    () => [...terms].sort((a, b) => b.sequence - a.sequence)[0] ?? null,
    [terms],
  );

  const rosterQuery = useTermEnrollmentRoster(tenantId, latestTerm?.id ?? '');
  const roster = useMemo(
    () =>
      (rosterQuery.data?.entries ?? []).filter(
        (e) => e.status === 'active' || e.status === 'active_billable',
      ),
    [rosterQuery.data],
  );

  const progressionsQuery = useProgressions(tenantId);
  const toStructureQuery = useClassStructure(tenantId, toYear.id);
  const stagePromotion = useStagePromotion(tenantId);

  async function handleAutoStage() {
    const rows = buildStagingRows(
      roster,
      progressionsQuery.data?.progressions ?? [],
      toStructureQuery.data?.arms ?? [],
    );
    await stagePromotion.mutateAsync({
      fromAcademicYearId: fromYear.id,
      toAcademicYearId: toYear.id,
      decisions: rows.map(stagingRowToDecision),
    });
    onStaged?.();
  }

  return (
    <PromotionAutoStagePanel
      studentCount={roster.length}
      fromYearLabel={fromYear.label}
      toYearLabel={toYear.label}
      onAutoStage={handleAutoStage}
      onReviewExceptions={onReviewExceptions ?? (() => {})}
      disabled={hasConfirmedPromotions || rosterQuery.isLoading}
      pending={stagePromotion.isPending}
    />
  );
}
