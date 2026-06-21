'use client';

import { useDecideWorkflow } from '@loomis/api-client';
import type { WorkflowInboxItemResponse, WorkflowType } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  Button,
  Textarea,
} from '@loomis/ui-web';
import { Check, X } from 'lucide-react';
import { useState } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { refundAmountFromPayload } from '@/lib/leadership/leadership-attention';
import { formatRoleLabel } from '@/components/school/school-nav-config';
import { SEMANTIC } from '@/lib/design/surfaces';

const WORKFLOW_LABELS: Partial<Record<WorkflowType, string>> = {
  staff_role_change: 'Staff role change',
  refund_request: 'Refund request',
  fee_structure_change: 'Fee structure amendment',
  student_promotion_batch: 'Promotion batch',
};

function describeWorkflowItem(item: WorkflowInboxItemResponse): string {
  const payload = item.instance.payload ?? {};
  switch (item.instance.workflowType) {
    case 'staff_role_change': {
      const role = payload.primaryRole;
      return typeof role === 'string'
        ? `New role: ${formatRoleLabel(role)}`
        : 'Awaiting owner approval';
    }
    case 'refund_request':
      return formatKobo(refundAmountFromPayload(payload));
    case 'fee_structure_change':
      return item.instance.title ?? 'Fee amendment pending';
    default:
      return item.instance.title ?? 'Pending approval';
  }
}

function hrefForWorkflowItem(item: WorkflowInboxItemResponse): string | null {
  switch (item.instance.workflowType) {
    case 'staff_role_change':
      return item.instance.subjectId
        ? `/school/staff/${item.instance.subjectId}`
        : '/school/staff';
    case 'refund_request':
      return '/school/finance/refunds';
    case 'fee_structure_change':
      return '/school/finance';
    default:
      return null;
  }
}

interface CoreInlineWorkflowDecisionProps {
  tenantId: string;
  item: WorkflowInboxItemResponse;
  onDecided?: () => void;
  compact?: boolean;
}

/** One-tap approve/reject for Core leadership — no workflow inbox module (Sprint 5). */
export function CoreInlineWorkflowDecision({
  tenantId,
  item,
  onDecided,
  compact = false,
}: CoreInlineWorkflowDecisionProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = useDecideWorkflow(
    tenantId,
    item.instance.id,
    item.activeStep.id,
  );

  const label =
    WORKFLOW_LABELS[item.instance.workflowType] ??
    item.instance.workflowType.replace(/_/g, ' ');
  const detail = describeWorkflowItem(item);
  const href = hrefForWorkflowItem(item);

  async function submit(decision: 'approve' | 'reject') {
    setError(null);
    try {
      await decide.mutateAsync({
        decision,
        comment: comment.trim() || undefined,
      });
      setComment('');
      onDecided?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record decision');
    }
  }

  return (
    <div
      className={
        compact
          ? `rounded-xl border p-4 ${SEMANTIC.warning.surfaceSubtle}`
          : `${ACADEMIC_UI.dataPanel} p-4 sm:p-5`
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>{label}</p>
          <p className="text-[15px] font-extrabold tracking-tight text-neutral-900">{detail}</p>
          {item.instance.title && item.instance.workflowType !== 'fee_structure_change' ? (
            <p className="mt-1 text-[13px] text-neutral-500">{item.instance.title}</p>
          ) : null}
        </div>
        {href ? (
          <a href={href} className={ACADEMIC_UI.btnSecondarySm}>
            Open
          </a>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment"
          rows={2}
          className="text-sm"
        />
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={decide.isPending}
            onClick={() => void submit('approve')}
            className="gap-1.5"
          >
            <Check className="size-4" aria-hidden />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={decide.isPending}
            onClick={() => void submit('reject')}
            className="gap-1.5"
          >
            <X className="size-4" aria-hidden />
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CorePendingApprovalsProps {
  tenantId: string;
  items: WorkflowInboxItemResponse[];
  limit?: number;
  emptyMessage?: string;
}

export function CorePendingApprovals({
  tenantId,
  items,
  limit = 5,
  emptyMessage = 'No pending approvals.',
}: CorePendingApprovalsProps) {
  const visible = items.slice(0, limit);

  if (visible.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-6 text-center text-sm text-neutral-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <CoreInlineWorkflowDecision key={item.instance.id} tenantId={tenantId} item={item} compact />
      ))}
    </div>
  );
}
