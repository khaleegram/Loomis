'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import {
  useAcademicTerms,
  useClassStructure,
  useProgressions,
  useStagePromotion,
  useTermEnrollmentRoster,
} from '@loomis/api-client';
import { RefreshCw, Save, Users } from 'lucide-react';
import { Skeleton } from '@loomis/ui-web';

import { AcademicEmptyState, AcademicSectionHeader } from '@/components/academic/academic-empty-state';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  buildStagingRows,
  stagingRowToDecision,
  validateStagingRows,
  type StagingRowState,
} from '@/lib/academic/promotion-staging-utils';
import { classLevelName } from '@/lib/academic/promotion-labels';
import { studentDisplayName } from '@/lib/student/student-labels';
import { SEMANTIC } from '@/lib/design/surfaces';
import { cn } from '@loomis/ui-web';

interface PromotionStagingPanelProps {
  tenantId: string;
  fromYear: AcademicYearResponse;
  toYear: AcademicYearResponse;
  hasConfirmedPromotions: boolean;
  onStaged?: () => void;
}

const OUTCOME_OPTIONS: { value: StagingRowState['outcome']; label: string }[] = [
  { value: 'promoted', label: 'Promote' },
  { value: 'held_back', label: 'Hold back' },
  { value: 'graduated', label: 'Graduate' },
];

export function PromotionStagingPanel({
  tenantId,
  fromYear,
  toYear,
  hasConfirmedPromotions,
  onStaged,
}: PromotionStagingPanelProps) {
  const termsQuery = useAcademicTerms(tenantId, fromYear.id);
  const terms = termsQuery.data?.terms ?? [];
  const sortedTerms = useMemo(
    () => [...terms].sort((a, b) => b.sequence - a.sequence),
    [terms],
  );
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const activeTermId = selectedTermId ?? sortedTerms[0]?.id ?? null;

  const rosterQuery = useTermEnrollmentRoster(tenantId, activeTermId ?? '');
  const roster = rosterQuery.data?.entries ?? [];

  const fromStructureQuery = useClassStructure(tenantId, fromYear.id);
  const toStructureQuery = useClassStructure(tenantId, toYear.id);
  const levels = fromStructureQuery.data?.levels ?? toStructureQuery.data?.levels ?? [];

  const progressionsQuery = useProgressions(tenantId);
  const progressions = progressionsQuery.data?.progressions ?? [];
  const destinationArms = toStructureQuery.data?.arms ?? [];

  const [rows, setRows] = useState<StagingRowState[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stagePromotion = useStagePromotion(tenantId);

  useEffect(() => {
    if (roster.length === 0) {
      setRows([]);
      return;
    }
    setRows(buildStagingRows(roster, progressions, destinationArms));
  }, [roster, progressions, destinationArms]);

  const isLoading =
    termsQuery.isLoading ||
    rosterQuery.isLoading ||
    progressionsQuery.isLoading ||
    toStructureQuery.isLoading;

  const disabled = hasConfirmedPromotions || stagePromotion.isPending;

  function updateRow(studentId: string, patch: Partial<StagingRowState>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const next = { ...row, ...patch };

        if (patch.outcome === 'held_back') {
          next.toClassLevelId = row.fromClassLevelId;
          next.toClassArmId = row.fromClassArmId;
          next.heldBackReason = row.heldBackReason;
        } else if (patch.outcome === 'graduated') {
          next.toClassLevelId = null;
          next.toClassArmId = null;
          next.heldBackReason = '';
        } else if (patch.outcome === 'promoted') {
          const progression = progressions.find((p) => p.fromClassLevelId === row.fromClassLevelId);
          const toLevelId = progression?.toClassLevelId ?? row.toClassLevelId;
          const defaultArm = toLevelId
            ? destinationArms.find((a) => a.classLevelId === toLevelId)
            : undefined;
          next.toClassLevelId = toLevelId;
          next.toClassArmId = defaultArm?.id ?? row.toClassArmId;
          next.heldBackReason = '';
        }

        if (patch.toClassLevelId && patch.toClassLevelId !== row.toClassLevelId) {
          const arm = destinationArms.find((a) => a.classLevelId === patch.toClassLevelId);
          next.toClassArmId = arm?.id ?? null;
        }

        return next;
      }),
    );
  }

  function applyProgressionDefaults() {
    setRows(buildStagingRows(roster, progressions, destinationArms));
  }

  async function handleSubmit() {
    setSubmitError(null);
    const validationError = validateStagingRows(rows);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    try {
      await stagePromotion.mutateAsync({
        fromAcademicYearId: fromYear.id,
        toAcademicYearId: toYear.id,
        decisions: rows.map(stagingRowToDecision),
      });
      onStaged?.();
    } catch (err) {
      setSubmitError(academicErrorMessage(err));
    }
  }

  if (hasConfirmedPromotions) {
    return (
      <div className={`card rounded-2xl p-5 ${SEMANTIC.warning.surfaceSubtle}`}>
        <p className="text-[13px] font-medium text-neutral-800">
          Promotions for {fromYear.label} have been confirmed. Staging is locked.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <AcademicSectionHeader
        label="Stage promotions"
        title="Build the year-end list"
        description="Load enrolled students, apply the progression map, override held-backs with reasons, then submit for Principal review."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyProgressionDefaults}
              disabled={disabled || rows.length === 0}
              className={ACADEMIC_UI.btnSecondarySm}
            >
              <RefreshCw aria-hidden className="size-3.5" />
              Reset to progression map
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || rows.length === 0}
              className={ACADEMIC_UI.btnPrimarySm}
            >
              <Save aria-hidden className="size-3.5" />
              {stagePromotion.isPending ? 'Staging…' : 'Stage promotion list'}
            </button>
          </div>
        }
      />

      {sortedTerms.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-semibold text-neutral-500">Source term</span>
          {sortedTerms.map((term: AcademicTermResponse) => (
            <button
              key={term.id}
              type="button"
              onClick={() => setSelectedTermId(term.id)}
              className={
                term.id === activeTermId ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive
              }
            >
              {term.name}
            </button>
          ))}
        </div>
      ) : null}

      {submitError ? (
        <div className={`rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>{submitError}</div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : roster.length === 0 ? (
        <AcademicEmptyState
          icon={Users}
          title="No enrolled students"
          description="Select a term with active enrollments, or enroll students before staging promotions."
        />
      ) : (
        <div className={ACADEMIC_UI.dataPanel}>
          <div className="overflow-x-auto">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className={`sticky top-0 z-10 ${ACADEMIC_UI.tableHeader}`}>
                <tr>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Student
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Current class
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Outcome
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const entry = roster.find((e) => e.studentId === row.studentId);
                  const armOptions = destinationArms.filter(
                    (a) => a.classLevelId === row.toClassLevelId,
                  );

                  return (
                    <tr
                      key={row.studentId}
                      className={cn(
                        'border-t border-neutral-100',
                        index % 2 === 1 && 'bg-neutral-50/40',
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {entry
                          ? studentDisplayName(entry.firstName, entry.lastName)
                          : 'Student'}
                        <p className="text-[10px] font-normal text-neutral-400">
                          {entry?.admissionNo}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {entry
                          ? `${entry.classLevelName} · ${entry.classArmName}`
                          : classLevelName(levels, row.fromClassLevelId)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={row.outcome}
                          disabled={disabled}
                          onChange={(e) =>
                            updateRow(row.studentId, {
                              outcome: e.target.value as StagingRowState['outcome'],
                            })
                          }
                          className="h-9 w-full min-w-[120px] rounded-lg border border-neutral-200 bg-white px-2 text-[12px] text-neutral-800"
                        >
                          {OUTCOME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {row.outcome === 'graduated' ? (
                          <span className="text-[12px] text-neutral-400">Leaving school</span>
                        ) : row.outcome === 'held_back' ? (
                          <span className="text-[12px] text-gold-800">Same class next year</span>
                        ) : (
                          <select
                            value={row.toClassArmId ?? ''}
                            disabled={disabled || armOptions.length === 0}
                            onChange={(e) => {
                              const arm = destinationArms.find((a) => a.id === e.target.value);
                              updateRow(row.studentId, {
                                toClassArmId: e.target.value || null,
                                toClassLevelId: arm?.classLevelId ?? row.toClassLevelId,
                              });
                            }}
                            className="h-9 w-full min-w-[140px] rounded-lg border border-neutral-200 bg-white px-2 text-[12px]"
                          >
                            <option value="">Select arm…</option>
                            {armOptions.map((arm) => (
                              <option key={arm.id} value={arm.id}>
                                {classLevelName(levels, arm.classLevelId)} · {arm.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.outcome === 'held_back' ? (
                          <input
                            type="text"
                            value={row.heldBackReason}
                            disabled={disabled}
                            placeholder="Required reason…"
                            onChange={(e) =>
                              updateRow(row.studentId, { heldBackReason: e.target.value })
                            }
                            className="h-9 w-full min-w-[160px] rounded-lg border border-gold-200 bg-gold-50/30 px-2 text-[12px]"
                          />
                        ) : (
                          <span className="text-[12px] text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
          <div className="border-t border-neutral-100 px-4 py-3 text-[11px] text-neutral-500">
            {rows.length} student{rows.length === 1 ? '' : 's'} · destination{' '}
            <span className="font-semibold text-neutral-700">{toYear.label}</span>
          </div>
        </div>
      )}
    </section>
  );
}
