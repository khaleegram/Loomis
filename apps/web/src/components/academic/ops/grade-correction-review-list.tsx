'use client';

import { useDecideWorkflow, useWorkflowInbox } from '@loomis/api-client';
import type { WorkflowInboxItemResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Skeleton, Textarea } from '@loomis/ui-web';
import { Gavel } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  WorkflowStatusBadge,
  WorkflowStepStatusBadge,
} from '@/components/academic/ops/workflow-status-badges';
import {
  FormSubmitError,
  SmartFormPanel,
  SmartFormPanelHeader,
  SmartFormSection,
} from '@/components/shared/smart-form';
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
    gradebookEntryId?: string;
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
    <SmartFormPanel
      header={
        <SmartFormPanelHeader
          icon={Gavel}
          title={item.instance.title ?? 'Grade correction'}
          subtitle={`Step ${item.activeStep.sequence} · ${item.activeStep.approverRole.replace(/_/g, ' ')}`}
          badge={
            <div className="flex flex-wrap gap-2">
              <WorkflowStatusBadge status={item.instance.status} />
              <WorkflowStepStatusBadge status={item.activeStep.status} />
            </div>
          }
        />
      }
      footer={
        <div className="flex flex-wrap gap-2 px-5 py-4">
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
            Return
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
      }
    >
      {payload.reason ? (
        <p className="text-[13px] text-neutral-700">
          <span className="font-semibold text-neutral-900">Reason: </span>
          {payload.reason}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-[13px] sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Proposed CA</dt>
          <dd className="mt-0.5 font-mono tabular-nums font-semibold text-neutral-900">
            {payload.continuousAssessmentScore ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">Proposed exam</dt>
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

      <SmartFormSection title="Decision comment" description="Optional — recorded in the workflow audit log.">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Explain your decision for the requester"
          rows={2}
          className="min-h-[72px] resize-y text-[13px]"
        />
      </SmartFormSection>

      <FormSubmitError message={error} />
    </SmartFormPanel>
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
      <Alert>
        <AlertDescription>No grade correction requests awaiting your action.</AlertDescription>
      </Alert>
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
