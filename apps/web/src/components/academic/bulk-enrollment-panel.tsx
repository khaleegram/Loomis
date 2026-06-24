'use client';

import { useMemo, useState } from 'react';
import type {
  AcademicTermResponse,
  AcademicYearResponse,
  ClassLevelResponse,
  PromotionRecordResponse,
  StudentResponse,
} from '@loomis/contracts';
import { queryKeys, useAcademicTerms, useApiClient } from '@loomis/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';

import { AcademicSectionHeader } from '@/components/academic/academic-empty-state';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { classLevelName } from '@/lib/academic/promotion-labels';
import { SEMANTIC } from '@/lib/design/surfaces';

interface BulkEnrollmentPanelProps {
  tenantId: string;
  toYear: AcademicYearResponse;
  confirmedRecords: PromotionRecordResponse[];
  levels: ClassLevelResponse[];
  studentNames: Record<string, string>;
  students: StudentResponse[];
}

export function BulkEnrollmentPanel({
  tenantId,
  toYear,
  confirmedRecords,
  levels,
  studentNames,
  students,
}: BulkEnrollmentPanelProps) {
  const termsQuery = useAcademicTerms(tenantId, toYear.id);
  const terms = termsQuery.data?.terms ?? [];
  const openTerm = useMemo(
    () => terms.find((t: AcademicTermResponse) => t.status === 'open') ?? null,
    [terms],
  );

  const enrollable = useMemo(
    () =>
      confirmedRecords.filter(
        (r) =>
          r.outcome !== 'graduated' &&
          r.toClassArmId != null &&
          students.some((s) => s.id === r.studentId && s.status === 'enrolled'),
      ),
    [confirmedRecords, students],
  );

  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useApiClient();
  const queryClient = useQueryClient();

  const bulkEnroll = useMutation({
    mutationFn: async () => {
      if (!openTerm) throw new Error('No open term in the destination year.');
      let ok = 0;
      let failed = 0;

      for (const record of enrollable) {
        try {
          await client.post(
            `/tenants/${tenantId}/students/${record.studentId}/enrollments`,
            { termId: openTerm.id, classArmId: record.toClassArmId! },
            { idempotencyKey: crypto.randomUUID() },
          );
          ok += 1;
        } catch {
          failed += 1;
        }
      }

      return { ok, failed };
    },
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.students.all(tenantId) });
    },
    onError: (err) => setError(academicErrorMessage(err)),
  });

  if (enrollable.length === 0) return null;

  return (
    <section className="space-y-4">
      <AcademicSectionHeader
        label="Next term enrollment"
        title="Enroll confirmed promotions"
        description={`Place promoted and held-back students into ${toYear.label} when its term is open.`}
      />

      {!openTerm ? (
        <div className={`card rounded-2xl p-4 text-[13px] ${SEMANTIC.warning.surfaceSubtle}`}>
          Open a term in {toYear.label} before bulk-enrolling students.
        </div>
      ) : (
        <>
          <div className={ACADEMIC_UI.dataPanel}>
            <ul className="divide-y divide-neutral-100">
              {enrollable.slice(0, 8).map((record) => (
                <li key={record.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
                  <span className="font-medium text-neutral-900">
                    {studentNames[record.studentId] ?? 'Student'}
                  </span>
                  <span className="text-neutral-500">
                    → {classLevelName(levels, record.toClassLevelId)}
                  </span>
                </li>
              ))}
            </ul>
            {enrollable.length > 8 ? (
              <p className="border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
                +{enrollable.length - 8} more students
              </p>
            ) : null}
          </div>

          {error ? (
            <div className={`rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>{error}</div>
          ) : null}

          {result ? (
            <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-sm text-brand-900">
              Enrolled {result.ok} student{result.ok === 1 ? '' : 's'}
              {result.failed > 0 ? ` · ${result.failed} failed (may already be enrolled)` : ''}.
            </div>
          ) : null}

          <button
            type="button"
            disabled={bulkEnroll.isPending}
            onClick={() => {
              setError(null);
              setResult(null);
              bulkEnroll.mutate();
            }}
            className={ACADEMIC_UI.btnPrimary}
          >
            <GraduationCap aria-hidden className="size-4" />
            {bulkEnroll.isPending
              ? 'Enrolling…'
              : `Enroll ${enrollable.length} in ${openTerm.name}`}
          </button>
        </>
      )}
    </section>
  );
}
