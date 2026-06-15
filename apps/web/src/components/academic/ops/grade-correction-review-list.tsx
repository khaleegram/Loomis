'use client';

import { useDecideWorkflow, useWorkflowInbox } from '@loomis/api-client';
import type { WorkflowInboxItemResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Skeleton, Textarea } from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { FormSubmitError } from '@/components/shared/smart-form';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';

interface GradeCorrectionReviewListProps {
  tenantId: string;
}

function CorrectionCard({
  tenantId,
  item,
}: {
  tenantId: string;
  item: WorkflowInboxItemResponse;
}) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = useDecideWorkflow(tenantId, item.instance.id, item.activeStep.id);

  const payload = item.instance.payload as {
    continuousAssessmentScore?: number;
    examScore?: number;
    totalScore?: number;
    grade?: string;
    reason?: string;
  };

  async function submit(decision: 'approve' | 'reject' | 'return') {
    setError(null);
    try {
      await decide.mutateAsync({
        decision,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setComment('');
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  return (
    <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
      <div className="border-b border-brand-50/80 px-4 py-3 sm:px-5">
        <p className="text-[15px] font-bold text-neutral-900">Score change request</p>
        {payload.reason ? (
          <p className="mt-1 text-[13px] text-neutral-600">{payload.reason}</p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 px-4 py-4 text-[13px] sm:grid-cols-4 sm:px-5">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">CA</dt>
          <dd className="mt-0.5 font-mono tabular-nums font-semibold text-neutral-900">
            {payload.continuousAssessmentScore ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Exam</dt>
          <dd className="mt-0.5 font-mono tabular-nums font-semibold text-neutral-900">
            {payload.examScore ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Total</dt>
          <dd className="mt-0.5 font-mono tabular-nums font-semibold text-neutral-900">
            {payload.totalScore ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Grade</dt>
          <dd className="mt-0.5 font-mono font-semibold text-neutral-900">{payload.grade ?? '—'}</dd>
        </div>
      </dl>

      <div className="border-t border-brand-50/80 px-4 py-3 sm:px-5">
        <label className="text-[12px] font-semibold text-neutral-700">Note (optional)</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a note for the teacher"
          rows={2}
          className="mt-1.5 min-h-[64px] resize-y text-[13px]"
        />
      </div>

      <FormSubmitError message={error} />

      <div className="flex flex-wrap gap-2 border-t border-brand-50/80 px-4 py-3 sm:px-5">
        <button
          type="button"
          className={ACADEMIC_UI.btnPrimary}
          disabled={decide.isSubmitting}
          onClick={() => void submit('approve')}
        >
          Approve
        </button>
        <button
          type="button"
          className={ACADEMIC_UI.btnSecondary}
          disabled={decide.isSubmitting}
          onClick={() => void submit('return')}
        >
          Send back
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-[13px] font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          disabled={decide.isSubmitting}
          onClick={() => void submit('reject')}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export function GradeCorrectionReviewList({ tenantId }: GradeCorrectionReviewListProps) {
  const inboxQuery = useWorkflowInbox(tenantId);
  const items = inboxQuery.data?.items ?? [];

  const corrections = useMemo(
    () => items.filter((item) => item.instance.workflowType === 'grade_correction'),
    [items],
  );

  if (inboxQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (inboxQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(inboxQuery.error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (corrections.length === 0) {
    return (
      <div className={`${ACADEMIC_UI.dataPanel} p-8 text-center`}>
        <p className="text-[15px] font-semibold text-neutral-900">No corrections waiting</p>
        <p className="mt-1 text-[13px] text-neutral-500">
          When a teacher requests a score change, it shows up here for your review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {corrections.map((item) => (
        <CorrectionCard key={item.instance.id} tenantId={tenantId} item={item} />
      ))}
    </div>
  );
}
