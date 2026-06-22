'use client';

import { useDecideWorkflow } from '@loomis/api-client';
import type { WorkflowInboxItemResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Textarea, cn } from '@loomis/ui-web';
import { useState } from 'react';

import {
  WorkflowStatusBadge,
  WorkflowStepStatusBadge,
} from '@/components/academic/ops/workflow-status-badges';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { formatRoleLabel } from '@/components/school/school-nav-config';
import { formatWorkflowTypeLabel } from '@/lib/workflow/workflow-labels';
import { summarizeWorkflowPayload } from '@/lib/workflow/workflow-payload-summary';

interface WorkflowInboxItemCardProps {
  tenantId: string;
  item: WorkflowInboxItemResponse;
}

export function WorkflowInboxItemCard({ tenantId, item }: WorkflowInboxItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = useDecideWorkflow(tenantId, item.instance.id, item.activeStep.id);
  const payloadLines = summarizeWorkflowPayload(item);

  async function submit(decision: 'approve' | 'reject' | 'return') {
    setError(null);
    try {
      await decide.mutateAsync({
        decision,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setComment('');
      setExpanded(false);
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  return (
    <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
      <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className={ACADEMIC_UI.sectionLabel}>{formatWorkflowTypeLabel(item.instance.workflowType)}</p>
          <p className="mt-1 text-[15px] font-semibold text-neutral-900">
            {item.instance.title ?? 'Approval request'}
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Step {item.activeStep.sequence} · {formatRoleLabel(item.activeStep.approverRole)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <WorkflowStatusBadge status={item.instance.status} />
          <WorkflowStepStatusBadge status={item.activeStep.status} />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {payloadLines.length > 0 ? (
          <ul className="mb-4 space-y-1 rounded-lg bg-muted/30 px-3 py-2.5 text-[13px] text-neutral-700">
            {payloadLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {!expanded ? (
          <button type="button" className={ACADEMIC_UI.btnPrimarySm} onClick={() => setExpanded(true)}>
            Review & decide
          </button>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment for the decision log"
              rows={2}
              className="min-h-[44px] resize-y"
            />
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                className={cn(ACADEMIC_UI.btnPrimary, 'justify-center sm:min-w-[120px]')}
                disabled={decide.isPending}
                onClick={() => void submit('approve')}
              >
                Approve
              </button>
              <button
                type="button"
                className={cn(ACADEMIC_UI.btnSecondary, 'justify-center sm:min-w-[120px]')}
                disabled={decide.isPending}
                onClick={() => void submit('return')}
              >
                Return
              </button>
              <button
                type="button"
                className="inline-flex h-9 min-h-[44px] items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-4 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 sm:min-w-[120px]"
                disabled={decide.isPending}
                onClick={() => void submit('reject')}
              >
                Reject
              </button>
              <button
                type="button"
                className={ACADEMIC_UI.btnSecondary}
                disabled={decide.isPending}
                onClick={() => setExpanded(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
