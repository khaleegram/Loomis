'use client';

import { useGradebookEntries, usePublishResults } from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';

interface ExamsPublishPanelProps {
  tenantId: string;
}

export function ExamsPublishPanel({ tenantId }: ExamsPublishPanelProps) {
  const ctx = useAcademicOpsContext(tenantId);
  const [error, setError] = useState<string | null>(null);

  const arms = classArmOptions(ctx.arms, ctx.levels);
  const classLabel = arms.find((arm) => arm.id === ctx.classArmId)?.label ?? null;

  const gradebookFilters =
    ctx.termId && ctx.classArmId ? { termId: ctx.termId, classArmId: ctx.classArmId } : null;
  const entriesQuery = useGradebookEntries(tenantId, gradebookFilters);
  const entries = entriesQuery.data?.entries ?? [];

  const preflight = useMemo(() => {
    const pending = entries.filter((e) => e.status === 'correction_pending').length;
    const drafts = entries.filter((e) => e.status === 'draft').length;
    return {
      total: entries.length,
      pending,
      drafts,
      ready: entries.length > 0 && pending === 0 && drafts === 0,
    };
  }, [entries]);

  const publish = usePublishResults({
    tenantId,
    termId: ctx.termId ?? '',
    classArmId: ctx.classArmId ?? '',
  });

  const blockedReason = useMemo(() => {
    if (!ctx.termId || !ctx.classArmId) return null;
    if (entriesQuery.isLoading) return null;
    if (preflight.total === 0) return 'No scores for this class yet.';
    if (preflight.pending > 0) {
      return `${preflight.pending} correction(s) waiting — check the Corrections tab first.`;
    }
    if (preflight.drafts > 0) {
      return `${preflight.drafts} score(s) still in draft — teachers must submit and lock the gradebook.`;
    }
    return null;
  }, [ctx.termId, ctx.classArmId, entriesQuery.isLoading, preflight]);

  async function handlePublish() {
    if (!ctx.termId || !ctx.classArmId) return;
    setError(null);
    try {
      await publish.mutateAsync({
        termId: ctx.termId,
        classArmId: ctx.classArmId,
      });
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <AcademicScopePicker
        classArmOptions={arms}
        classArmId={ctx.classArmId}
        onClassArmChange={ctx.setClassArmId}
        selectedClassMeta={
          ctx.classArmId && !entriesQuery.isLoading
            ? `${preflight.total} entries · ${classLabel ?? 'Class'}`
            : undefined
        }
      />

      {!ctx.termId || !ctx.classArmId ? (
        <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
          <p className="text-[15px] font-semibold text-neutral-800">Select a class</p>
          <p className="mt-2 text-[13px] text-neutral-500">Choose the class you want to publish.</p>
        </div>
      ) : entriesQuery.isLoading ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : (
        <div className={`${ACADEMIC_UI.dataPanel} px-4 py-4 sm:px-5`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[15px] font-bold text-neutral-900">{classLabel ?? 'Selected class'}</p>
              {blockedReason ? (
                <p className="mt-1 text-[13px] text-amber-800">{blockedReason}</p>
              ) : (
                <p className="mt-1 text-[13px] text-accent-green-700">Ready — results will go live immediately.</p>
              )}
            </div>
            <button
              type="button"
              className={`${ACADEMIC_UI.btnPrimary} w-full sm:w-auto`}
              disabled={!preflight.ready || publish.isSubmitting}
              onClick={() => void handlePublish()}
            >
              {publish.isSubmitting ? 'Publishing…' : 'Publish results'}
            </button>
          </div>
          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}
    </div>
  );
}
