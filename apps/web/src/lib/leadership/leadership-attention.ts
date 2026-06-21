import type {
  AcademicTermResponse,
  WorkflowInboxItemResponse,
  WorkflowInstanceResponse,
  WorkflowType,
} from '@loomis/contracts';
import { CORE_OWNER_REFUND_THRESHOLD_MINOR } from '@loomis/core';

/** Re-export for UI consumers importing from leadership-attention. */
export { CORE_OWNER_REFUND_THRESHOLD_MINOR };

export type AttentionUrgency = 'normal' | 'attention' | 'ready';

export interface AttentionStripStat {
  label: string;
  value: string;
  hint: string;
  tone?: 'ok' | 'warn' | 'neutral';
}

export interface AttentionTask {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  urgency: AttentionUrgency;
}

export function refundAmountFromPayload(payload: Record<string, unknown>): number {
  const raw = payload.amountMinor ?? payload.amount_minor;
  return typeof raw === 'number' ? raw : 0;
}

export function filterInboxByTypes(
  items: WorkflowInboxItemResponse[],
  types: WorkflowType[],
): WorkflowInboxItemResponse[] {
  return items.filter((item) => types.includes(item.instance.workflowType));
}

export function countInboxForRole(
  items: WorkflowInboxItemResponse[],
  approverRole: 'school_owner' | 'principal',
): number {
  return items.filter((item) => item.activeStep.approverRole === approverRole).length;
}

export function countOwnerThresholdRefunds(items: WorkflowInboxItemResponse[]): number {
  return items.filter((item) => {
    if (item.instance.workflowType !== 'refund_request') return false;
    if (item.activeStep.approverRole !== 'school_owner') return false;
    return (
      refundAmountFromPayload(item.instance.payload as Record<string, unknown>) >=
      CORE_OWNER_REFUND_THRESHOLD_MINOR
    );
  }).length;
}

export function countRoleChangesPendingOwner(
  initiated: WorkflowInstanceResponse[],
): number {
  return initiated.filter(
    (instance) =>
      instance.workflowType === 'staff_role_change' && instance.status === 'pending',
  ).length;
}

export interface CensusAttention {
  label: string;
  hint: string;
  urgency: AttentionUrgency;
  href: string;
}

export function resolveCensusAttention(
  term: AcademicTermResponse | null,
  yearId: string | null,
  billableCount: number | null,
): CensusAttention {
  if (!term || !yearId) {
    return {
      label: 'No open term',
      hint: 'Configure the academic calendar to begin census tracking.',
      urgency: 'normal',
      href: '/school/academic/sessions',
    };
  }

  if (term.status === 'open') {
    const days = daysUntilIsoDate(term.censusLockDate);
    const countdown =
      days == null
        ? 'Census lock date not set'
        : days > 0
          ? `${days} day${days === 1 ? '' : 's'} until census lock`
          : days === 0
            ? 'Census lock due today'
            : `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} past census date`;

    return {
      label: 'Census lock due',
      hint:
        billableCount != null
          ? `${billableCount.toLocaleString()} billable students · ${countdown}`
          : countdown,
      urgency: days != null && days <= 7 ? 'attention' : 'ready',
      href: `/school/academic/census-lock?termId=${term.id}&yearId=${yearId}`,
    };
  }

  if (term.status === 'census_locked') {
    return {
      label: 'Census locked',
      hint:
        billableCount != null
          ? `${billableCount.toLocaleString()} students attested · PSF obligations created`
          : 'Enrollment attested for this term',
      urgency: 'normal',
      href: '/school/academic/sessions',
    };
  }

  if (term.status === 'closed') {
    return {
      label: 'Term closed',
      hint: `${term.name ?? 'Term'} is closed — census complete`,
      urgency: 'normal',
      href: '/school/academic/sessions',
    };
  }

  return {
    label: 'Term in draft',
    hint: 'Open the term before census lock is available.',
    urgency: 'normal',
    href: '/school/academic/sessions',
  };
}

function daysUntilIsoDate(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const [y, m, d] = dateIso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export interface PsfSummary {
  total: number;
  pending: number;
  settled: number;
  outstandingMinor: number;
}

export function summarizePsfObligations(
  obligations: Array<{ status?: string; amountMinor?: number }>,
): PsfSummary {
  let pending = 0;
  let settled = 0;
  let outstandingMinor = 0;

  for (const row of obligations) {
    const status = row.status ?? 'pending';
    if (status === 'settled' || status === 'waived') {
      settled += 1;
    } else {
      pending += 1;
      outstandingMinor += row.amountMinor ?? 0;
    }
  }

  return {
    total: obligations.length,
    pending,
    settled,
    outstandingMinor,
  };
}

export function buildOwnerAttentionTasks(input: {
  census: CensusAttention;
  ownerApprovalCount: number;
  thresholdRefundCount: number;
  pendingAdmissionCount: number;
}): AttentionTask[] {
  const tasks: AttentionTask[] = [];

  if (input.census.label === 'Census lock due') {
    tasks.push({
      id: 'census',
      title: input.census.label,
      description: input.census.hint,
      href: input.census.href,
      cta: 'Review census',
      urgency: input.census.urgency,
    });
  }

  if (input.thresholdRefundCount > 0) {
    tasks.push({
      id: 'refunds-threshold',
      title: `${input.thresholdRefundCount} high-value refund${input.thresholdRefundCount === 1 ? '' : 's'}`,
      description: 'Refunds at or above ₦50,000 need your approval.',
      href: '/school/finance/refunds',
      cta: 'Review refunds',
      urgency: 'attention',
    });
  }

  if (input.ownerApprovalCount > 0) {
    tasks.push({
      id: 'owner-approvals',
      title: `${input.ownerApprovalCount} item${input.ownerApprovalCount === 1 ? '' : 's'} need your sign-off`,
      description: 'Role changes, refunds, and other owner approvals awaiting action.',
      href: '/school/staff',
      cta: 'Review items',
      urgency: 'attention',
    });
  }

  if (input.pendingAdmissionCount > 0) {
    tasks.push({
      id: 'admissions',
      title: `${input.pendingAdmissionCount} pending admission${input.pendingAdmissionCount === 1 ? '' : 's'}`,
      description: 'Applications awaiting school decision.',
      href: '/school/students/admissions',
      cta: 'Open admissions',
      urgency: 'attention',
    });
  }

  return tasks;
}

export function buildPrincipalAttentionTasks(input: {
  pendingAdmissionCount: number;
  principalRefundCount: number;
  feeAmendmentCount: number;
  roleChangesPendingOwner: number;
}): AttentionTask[] {
  const tasks: AttentionTask[] = [];

  if (input.pendingAdmissionCount > 0) {
    tasks.push({
      id: 'admissions',
      title: `${input.pendingAdmissionCount} admission${input.pendingAdmissionCount === 1 ? '' : 's'} to review`,
      description: 'New applicants waiting for principal approval.',
      href: '/school/students/admissions',
      cta: 'Review admissions',
      urgency: 'attention',
    });
  }

  if (input.principalRefundCount > 0) {
    tasks.push({
      id: 'refunds',
      title: `${input.principalRefundCount} refund${input.principalRefundCount === 1 ? '' : 's'} awaiting you`,
      description: 'Refund requests in your approval queue.',
      href: '/school/finance/refunds',
      cta: 'Review refunds',
      urgency: 'attention',
    });
  }

  if (input.feeAmendmentCount > 0) {
    tasks.push({
      id: 'fee-amendments',
      title: `${input.feeAmendmentCount} fee amendment${input.feeAmendmentCount === 1 ? '' : 's'}`,
      description: 'Fee structure changes proposed by finance need your approval.',
      href: '/school/finance',
      cta: 'Review fees',
      urgency: 'attention',
    });
  }

  if (input.roleChangesPendingOwner > 0) {
    tasks.push({
      id: 'role-changes',
      title: `${input.roleChangesPendingOwner} role change${input.roleChangesPendingOwner === 1 ? '' : 's'} with owner`,
      description: 'Your staff role requests are waiting for the school owner to finalize.',
      href: '/school/staff',
      cta: 'View staff',
      urgency: 'normal',
    });
  }

  return tasks;
}
