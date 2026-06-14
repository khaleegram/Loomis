'use client';

import {
  useCreateExamConfig,
  useExamConfigs,
  useGradingSchemes,
} from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';

const SUBJECT_IDS = [
  '019c0000-0000-7000-8000-000000000001',
  '019c0000-0000-7000-8000-000000000002',
  '019c0000-0000-7000-8000-000000000003',
  '019c0000-0000-7000-8000-000000000004',
  '019c0000-0000-7000-8000-000000000005',
  '019c0000-0000-7000-8000-000000000006',
];

interface ExamConfigSetupPanelProps {
  tenantId: string;
}

export function ExamConfigSetupPanel({ tenantId }: ExamConfigSetupPanelProps) {
  const ctx = useAcademicOpsContext(tenantId);
  const schemesQuery = useGradingSchemes(tenantId);
  const configsQuery = useExamConfigs(tenantId, ctx.termId ?? '');
  const createConfig = useCreateExamConfig(tenantId, ctx.termId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const defaultScheme = schemesQuery.data?.schemes.find((s) => s.isDefault) ?? schemesQuery.data?.schemes[0];
  const configs = configsQuery.data?.configs ?? [];
  const arms = classArmOptions(ctx.arms, ctx.levels);

  const rows = useMemo(() => {
    if (!ctx.termId) return [];
    return arms.flatMap((arm) =>
      SUBJECT_IDS.map((subjectId) => {
        const existing = configs.find(
          (config) => config.classArmId === arm.id && config.subjectId === subjectId,
        );
        return {
          armId: arm.id,
          armLabel: arm.label,
          subjectId,
          subjectLabel: formatSubjectLabel(subjectId),
          configured: Boolean(existing),
          configId: existing?.id ?? null,
        };
      }),
    );
  }, [arms, configs, ctx.termId]);

  const missingCount = rows.filter((row) => !row.configured).length;
  const configuredCount = rows.length - missingCount;

  async function applyDefaultToMissing() {
    if (!ctx.termId || !defaultScheme) return;
    setError(null);
    setProgress(null);
    const missing = rows.filter((row) => !row.configured);
    try {
      for (let i = 0; i < missing.length; i++) {
        const row = missing[i]!;
        setProgress(`${i + 1}/${missing.length} — ${row.armLabel} · ${row.subjectLabel}`);
        await createConfig.mutateAsync({
          termId: ctx.termId,
          classArmId: row.armId,
          subjectId: row.subjectId,
          gradingSchemeId: defaultScheme.id,
          title: `${row.armLabel} ${row.subjectLabel}`,
        });
      }
      setProgress(null);
    } catch (err) {
      setError(academicErrorMessage(err));
      setProgress(null);
    }
  }

  if (!ctx.termId) {
    return (
      <Alert>
        <AlertDescription>Select an academic year and term to configure exam setups.</AlertDescription>
      </Alert>
    );
  }

  if (schemesQuery.isLoading || configsQuery.isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (!defaultScheme) {
    return (
      <Alert>
        <AlertDescription>Create a grading scheme first, then link it to class subjects here.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <AcademicScopePicker
        years={ctx.sortedYears}
        terms={ctx.terms}
        classArmOptions={arms}
        yearId={ctx.yearId}
        termId={ctx.termId}
        classArmId={ctx.classArmId}
        onYearChange={(id) => {
          ctx.setYearId(id);
          ctx.setTermId(null);
        }}
        onTermChange={ctx.setTermId}
        onClassArmChange={ctx.setClassArmId}
        selectedClassMeta={`${configuredCount}/${rows.length} subject slots configured`}
      />

      <div className={`${ACADEMIC_UI.dataPanel} p-5`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Exam configuration</p>
            <p className="mt-1 text-[14px] font-semibold text-neutral-900">
              Link <span className="text-brand-700">{defaultScheme.name}</span> to class subjects
            </p>
            <p className="mt-1 text-[12px] text-neutral-500">
              {missingCount > 0
                ? `${missingCount} slots still need an exam config before teachers can enter grades.`
                : 'All class × subject slots are configured for this term.'}
            </p>
          </div>
          {missingCount > 0 ? (
            <button
              type="button"
              className={ACADEMIC_UI.btnPrimary}
              disabled={createConfig.isPending}
              onClick={() => void applyDefaultToMissing()}
            >
              {createConfig.isPending ? 'Applying…' : `Apply scheme to ${missingCount} missing`}
            </button>
          ) : null}
        </div>

        {progress ? <p className="mt-3 text-[12px] text-neutral-500">{progress}</p> : null}
        {error ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-brand-100/40">
          <table className="min-w-full text-left text-[12px]">
            <thead className={`sticky top-0 ${ACADEMIC_UI.tableHeader}`}>
              <tr>
                <th className="px-4 py-2 font-bold uppercase tracking-[0.12em] text-neutral-500">Class</th>
                <th className="px-4 py-2 font-bold uppercase tracking-[0.12em] text-neutral-500">Subject</th>
                <th className="px-4 py-2 font-bold uppercase tracking-[0.12em] text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((row) => !ctx.classArmId || row.armId === ctx.classArmId)
                .map((row) => (
                  <tr key={`${row.armId}:${row.subjectId}`} className="border-t border-brand-50/80">
                    <td className="px-4 py-2 font-medium text-neutral-800">{row.armLabel}</td>
                    <td className="px-4 py-2 text-neutral-700">{row.subjectLabel}</td>
                    <td className="px-4 py-2">
                      {row.configured ? (
                        <span className="rounded-full bg-accent-green-50 px-2 py-0.5 text-[10px] font-bold text-accent-green-700">
                          Ready
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Missing
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
