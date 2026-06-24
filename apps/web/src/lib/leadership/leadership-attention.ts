import type {
  AcademicTermResponse,
  WorkflowInboxItemResponse,
  WorkflowInstanceResponse,
  WorkflowType,
} from '@loomis/contracts';
import { CORE_OWNER_REFUND_THRESHOLD_MINOR, formatKobo } from '@loomis/core';

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

export interface SchoolTermPulse {
  termLabel: string;
  headline: string;
  description: string;
  href: string;
}

/** School-language term summary for the owner dashboard hero (not platform billing copy). */
export function resolveSchoolTermPulse(
  term: AcademicTermResponse | null,
  enrolledCount: number | null,
): SchoolTermPulse {
  if (!term) {
    return {
      termLabel: 'No active term',
      headline: 'Set up your academic year',
      description:
        'Open a term to enroll students, issue school fees, and run daily operations.',
      href: '/school/academic/sessions',
    };
  }

  const termLabel = term.name ?? 'This term';
  const enrolledHint =
    enrolledCount != null
      ? `${enrolledCount.toLocaleString()} students on roll`
      : 'Student enrollment in progress';

  if (term.status === 'open') {
    return {
      termLabel,
      headline: `${termLabel} is open`,
      description: `${enrolledHint}. Admissions, fee collection, and staff coverage for your school.`,
      href: '/school/academic/sessions',
    };
  }

  if (term.status === 'census_locked') {
    return {
      termLabel,
      headline: `${termLabel} · census locked`,
      description: `${enrolledHint}. School fees are live — track collections and owner approvals.`,
      href: '/school/finance/balances',
    };
  }

  if (term.status === 'closed') {
    return {
      termLabel,
      headline: `${termLabel} is closed`,
      description: 'Review promotions, outstanding balances, and prepare the next session.',
      href: '/school/academic/sessions',
    };
  }

  return {
    termLabel,
    headline: `${termLabel} in draft`,
    description: 'Open the term when you are ready to enroll students and issue fees.',
    href: '/school/academic/sessions',
  };
}

export interface OwnerSchoolSnapshot {
  enrolledCount: number;
  pendingAdmissionCount: number;
  familiesOwingCount: number;
  totalFeesOwedMinor: number;
  ownerApprovalCount: number;
  thresholdRefundCount: number;
  termLabel: string;
  isLoading: boolean;
}

export function buildOwnerSchoolStripStats(snapshot: OwnerSchoolSnapshot): AttentionStripStat[] {
  const approvalTotal = snapshot.ownerApprovalCount + snapshot.thresholdRefundCount;

  return [
    {
      label: 'Enrolled students',
      value: snapshot.isLoading ? '—' : snapshot.enrolledCount.toLocaleString(),
      hint: snapshot.termLabel,
      tone: 'ok',
    },
    {
      label: 'Pending admissions',
      value: snapshot.isLoading ? '—' : String(snapshot.pendingAdmissionCount),
      hint: snapshot.pendingAdmissionCount > 0 ? 'Awaiting your decision' : 'Pipeline clear',
      tone: snapshot.pendingAdmissionCount > 0 ? 'warn' : 'ok',
    },
    {
      label: 'School fees owed',
      value: snapshot.isLoading ? '—' : formatKobo(snapshot.totalFeesOwedMinor),
      hint:
        snapshot.familiesOwingCount > 0
          ? `${snapshot.familiesOwingCount} famil${snapshot.familiesOwingCount === 1 ? 'y' : 'ies'} owing`
          : 'Collections on track',
      tone: snapshot.totalFeesOwedMinor > 0 ? 'warn' : 'ok',
    },
    {
      label: 'Your approvals',
      value: snapshot.isLoading ? '—' : String(approvalTotal),
      hint: approvalTotal > 0 ? 'Refunds & policy sign-offs' : 'Nothing waiting on you',
      tone: approvalTotal > 0 ? 'warn' : 'ok',
    },
  ];
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
      hint: 'Configure the academic calendar to begin term setup.',
      urgency: 'normal',
      href: '/school/academic/sessions',
    };
  }

  if (term.status === 'open') {
    const days = daysUntilIsoDate(term.censusSnapshotDate);
    const countdown =
      days == null
        ? 'Billing date not set'
        : days > 0
          ? `${days} day${days === 1 ? '' : 's'} until platform fee is recorded`
          : days === 0
            ? 'Platform fee records today'
            : `Billing date was ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;

    return {
      label: 'Platform fee pending',
      hint:
        billableCount != null
          ? `${billableCount.toLocaleString()} enrolled students · ${countdown}`
          : countdown,
      urgency: days != null && days <= 7 ? 'attention' : 'normal',
      href: '/school/finance/platform-fee',
    };
  }

  if (term.status === 'census_locked') {
    return {
      label: 'Platform fee recorded',
      hint:
        billableCount != null
          ? `${billableCount.toLocaleString()} students · fee recorded for this term`
          : 'Platform fee recorded for this term',
      urgency: 'normal',
      href: '/school/finance/platform-fee',
    };
  }

  if (term.status === 'closed') {
    return {
      label: 'Term closed',
      hint: `${term.name ?? 'Term'} is closed`,
      urgency: 'normal',
      href: '/school/academic/sessions',
    };
  }

  return {
    label: 'Term in draft',
    hint: 'Open the term before platform fee billing applies.',
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
  /** When true, owner approvals link to workflow inbox (Advanced Sprint 10). */
  workflowInboxModule?: boolean;
}): AttentionTask[] {
  const tasks: AttentionTask[] = [];
  const inboxHref = '/school/workflows';
  const refundHref = input.workflowInboxModule ? inboxHref : '/school/finance/refunds';
  const approvalHref = input.workflowInboxModule ? inboxHref : '/school/staff';
  const approvalCta = input.workflowInboxModule ? 'Open inbox' : 'Review items';

  if (input.census.label === 'Platform fee pending' && input.census.urgency === 'attention') {
    tasks.push({
      id: 'term-census',
      title: 'Enrollment census due soon',
      description: input.census.hint
        .replace(/platform fee/gi, 'enrollment census')
        .replace(/billing date/gi, 'census date'),
      href: '/school/academic/sessions',
      cta: 'Review term',
      urgency: input.census.urgency,
    });
  }

  if (input.thresholdRefundCount > 0) {
    tasks.push({
      id: 'refunds-threshold',
      title: `${input.thresholdRefundCount} high-value refund${input.thresholdRefundCount === 1 ? '' : 's'}`,
      description: input.workflowInboxModule
        ? 'Refunds at or above ₦50,000 are in your workflow inbox.'
        : 'Refunds at or above ₦50,000 need your approval.',
      href: refundHref,
      cta: input.workflowInboxModule ? 'Open inbox' : 'Review refunds',
      urgency: 'attention',
    });
  }

  if (input.ownerApprovalCount > 0) {
    tasks.push({
      id: 'owner-approvals',
      title: `${input.ownerApprovalCount} item${input.ownerApprovalCount === 1 ? '' : 's'} need your sign-off`,
      description: input.workflowInboxModule
        ? 'Role changes, refunds, and fee amendments awaiting owner approval in the inbox.'
        : 'Role changes, refunds, and other owner approvals awaiting action.',
      href: approvalHref,
      cta: approvalCta,
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
  gradeCorrectionCount?: number;
  roleChangesPendingOwner: number;
  /** When true, workflow approvals link to inbox only (Advanced Sprint 9). */
  workflowInboxModule?: boolean;
}): AttentionTask[] {
  const tasks: AttentionTask[] = [];
  const inboxHref = '/school/workflows';

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
      description: input.workflowInboxModule
        ? 'Open your workflow inbox to approve refunds.'
        : 'Refund requests in your approval queue.',
      href: input.workflowInboxModule ? inboxHref : '/school/finance/refunds',
      cta: input.workflowInboxModule ? 'Open inbox' : 'Review refunds',
      urgency: 'attention',
    });
  }

  if (input.feeAmendmentCount > 0) {
    tasks.push({
      id: 'fee-amendments',
      title: `${input.feeAmendmentCount} fee amendment${input.feeAmendmentCount === 1 ? '' : 's'}`,
      description: input.workflowInboxModule
        ? 'Fee structure changes are in your workflow inbox.'
        : 'Fee structure changes proposed by finance need your approval.',
      href: input.workflowInboxModule ? inboxHref : '/school/finance',
      cta: input.workflowInboxModule ? 'Open inbox' : 'Review fees',
      urgency: 'attention',
    });
  }

  if ((input.gradeCorrectionCount ?? 0) > 0) {
    const count = input.gradeCorrectionCount ?? 0;
    tasks.push({
      id: 'grade-corrections',
      title: `${count} grade correction${count === 1 ? '' : 's'}`,
      description: 'Exam officer escalations waiting for your decision in the workflow inbox.',
      href: inboxHref,
      cta: 'Open inbox',
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

export interface PrincipalInboxBreakdown {
  refunds: number;
  feeAmendments: number;
  gradeCorrections: number;
  transfers: number;
  ownerRoleChanges: number;
  totalForPrincipal: number;
}

/** Counts workflow inbox items relevant to the Principal operations dashboard (§6.2). */
export function computePrincipalInboxBreakdown(
  items: WorkflowInboxItemResponse[],
): PrincipalInboxBreakdown {
  const forPrincipal = (type: WorkflowType) =>
    filterInboxByTypes(items, [type]).filter(
      (item) => item.activeStep.approverRole === 'principal',
    ).length;

  const refunds = forPrincipal('refund_request');
  const feeAmendments = forPrincipal('fee_structure_change');
  const gradeCorrections = forPrincipal('grade_correction');
  const transfers = forPrincipal('student_transfer_out');
  const ownerRoleChanges = filterInboxByTypes(items, ['staff_role_change']).filter(
    (item) => item.activeStep.approverRole === 'school_owner',
  ).length;

  return {
    refunds,
    feeAmendments,
    gradeCorrections,
    transfers,
    ownerRoleChanges,
    totalForPrincipal: refunds + feeAmendments + gradeCorrections + transfers,
  };
}
