'use client';

import { useDecideWorkflow, useWorkflowInbox } from '@loomis/api-client';
import type { WorkflowInboxItemResponse } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Textarea,
} from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import {
  WorkflowStatusBadge,
  WorkflowStepStatusBadge,
} from '@/components/academic/ops/workflow-status-badges';
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
    <Card className="shadow-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{item.instance.title ?? 'Grade correction'}</CardTitle>
          <CardDescription className="mt-1">
            Step {item.activeStep.sequence} · {item.activeStep.approverRole.replace(/_/g, ' ')}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <WorkflowStatusBadge status={item.instance.status} />
          <WorkflowStepStatusBadge status={item.activeStep.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {payload.reason ? (
          <p className="text-sm">
            <span className="font-medium">Reason: </span>
            {payload.reason}
          </p>
        ) : null}
        <dl className="grid grid-cols-2 gap-3 rounded-sm border bg-muted/30 p-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Proposed CA</dt>
            <dd className="font-mono tabular-nums">{payload.continuousAssessmentScore ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Proposed exam</dt>
            <dd className="font-mono tabular-nums">{payload.examScore ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total</dt>
            <dd className="font-mono tabular-nums">{payload.totalScore ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Grade</dt>
            <dd className="font-mono">{payload.grade ?? '—'}</dd>
          </div>
        </dl>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment for the decision log"
          rows={2}
        />

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button disabled={decide.isSubmitting} onClick={() => void submit('approve')}>
            Approve
          </Button>
          <Button variant="outline" disabled={decide.isSubmitting} onClick={() => void submit('return')}>
            Return
          </Button>
          <Button variant="destructive" disabled={decide.isSubmitting} onClick={() => void submit('reject')}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
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
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
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
