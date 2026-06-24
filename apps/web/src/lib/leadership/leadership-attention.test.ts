import { describe, expect, it } from 'vitest';

import {
  buildOwnerAttentionTasks,
  buildPrincipalAttentionTasks,
  computePrincipalInboxBreakdown,
  countOwnerThresholdRefunds,
  CORE_OWNER_REFUND_THRESHOLD_MINOR,
  refundAmountFromPayload,
  resolveCensusAttention,
  summarizePsfObligations,
} from '@/lib/leadership/leadership-attention';
import type { WorkflowInboxItemResponse } from '@loomis/contracts';

function inboxItem(
  workflowType: WorkflowInboxItemResponse['instance']['workflowType'],
  approverRole: WorkflowInboxItemResponse['activeStep']['approverRole'],
  payload: Record<string, unknown> = {},
): WorkflowInboxItemResponse {
  return {
    instance: {
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: '00000000-0000-4000-8000-000000000002',
      workflowType,
      status: 'pending',
      requestedById: '00000000-0000-4000-8000-000000000003',
      requestedByRole: 'principal',
      subjectType: null,
      subjectId: null,
      title: null,
      payload,
      currentStepSequence: 1,
      completedAt: null,
      createdAt: '2026-06-21T00:00:00.000Z',
      updatedAt: '2026-06-21T00:00:00.000Z',
    },
    activeStep: {
      id: '00000000-0000-4000-8000-000000000004',
      sequence: 1,
      approverRole,
      status: 'active',
      timeoutHours: 48,
      escalatesToRole: null,
      dueAt: null,
      activatedAt: '2026-06-21T00:00:00.000Z',
      completedAt: null,
      escalatedAt: null,
    },
  };
}

describe('leadership attention Sprint 4', () => {
  it('counts owner threshold refunds from payload amountMinor', () => {
    const below = inboxItem('refund_request', 'school_owner', {
      amountMinor: CORE_OWNER_REFUND_THRESHOLD_MINOR - 1,
    });
    const above = inboxItem('refund_request', 'school_owner', {
      amountMinor: CORE_OWNER_REFUND_THRESHOLD_MINOR,
    });
    expect(countOwnerThresholdRefunds([below, above])).toBe(1);
    expect(refundAmountFromPayload({ amount_minor: 100 })).toBe(100);
  });

  it('builds owner tasks without workflow inbox links', () => {
    const tasks = buildOwnerAttentionTasks({
      census: resolveCensusAttention(
        {
          id: 't1',
          academicYearId: 'y1',
          name: 'First Term',
          status: 'open',
          censusSnapshotDate: '2026-07-01',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          enrollmentWindowOpenDate: '2026-01-01',
          enrollmentWindowCloseDate: '2026-06-01',
          examStartDate: null,
          examEndDate: null,
          snapshotCreatedAt: null,
          adjustmentWindowEndsAt: null,
          systemBillableCount: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        'y1',
        120,
      ),
      ownerApprovalCount: 2,
      thresholdRefundCount: 1,
      pendingAdmissionCount: 3,
    });

    expect(tasks.some((task) => task.href.includes('/school/workflows'))).toBe(false);
    expect(tasks.some((task) => task.id === 'census')).toBe(true);
    expect(tasks.some((task) => task.href === '/school/finance/refunds')).toBe(true);
  });

  it('builds principal tasks for admissions and refunds', () => {
    const tasks = buildPrincipalAttentionTasks({
      pendingAdmissionCount: 2,
      principalRefundCount: 1,
      feeAmendmentCount: 1,
      roleChangesPendingOwner: 1,
    });

    expect(tasks.map((task) => task.id)).toEqual([
      'admissions',
      'refunds',
      'fee-amendments',
      'role-changes',
    ]);
    expect(tasks.every((task) => !task.href.includes('/school/workflows'))).toBe(true);
  });

  it('routes principal workflow tasks to inbox when Advanced module is on', () => {
    const tasks = buildPrincipalAttentionTasks({
      pendingAdmissionCount: 0,
      principalRefundCount: 1,
      feeAmendmentCount: 1,
      gradeCorrectionCount: 2,
      roleChangesPendingOwner: 0,
      workflowInboxModule: true,
    });

    expect(tasks.map((task) => task.id)).toEqual(['refunds', 'fee-amendments', 'grade-corrections']);
    expect(tasks.every((task) => task.href === '/school/workflows')).toBe(true);
  });

  it('routes owner workflow tasks to inbox when Advanced module is on', () => {
    const tasks = buildOwnerAttentionTasks({
      census: resolveCensusAttention(null, null, null),
      ownerApprovalCount: 2,
      thresholdRefundCount: 1,
      pendingAdmissionCount: 0,
      workflowInboxModule: true,
    });

    expect(tasks.map((task) => task.id)).toEqual(['refunds-threshold', 'owner-approvals']);
    expect(tasks.every((task) => task.href === '/school/workflows')).toBe(true);
  });

  it('computes principal inbox breakdown by workflow type', () => {
    const items = [
      inboxItem('refund_request', 'principal'),
      inboxItem('fee_structure_change', 'principal'),
      inboxItem('grade_correction', 'principal'),
      inboxItem('student_transfer_out', 'principal'),
      inboxItem('staff_role_change', 'school_owner'),
    ];
    expect(computePrincipalInboxBreakdown(items)).toEqual({
      refunds: 1,
      feeAmendments: 1,
      gradeCorrections: 1,
      transfers: 1,
      ownerRoleChanges: 1,
      totalForPrincipal: 4,
    });
  });

  it('summarizes PSF obligations', () => {
    expect(
      summarizePsfObligations([
        { status: 'pending', amountMinor: 500_000 },
        { status: 'settled', amountMinor: 500_000 },
        { status: 'partially_settled', amountMinor: 250_000 },
      ]),
    ).toEqual({
      total: 3,
      pending: 2,
      settled: 1,
      outstandingMinor: 750_000,
    });
  });
});
