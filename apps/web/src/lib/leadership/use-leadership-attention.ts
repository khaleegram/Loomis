'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useAdmissions,
  useCensusPreview,
  usePsfObligations,
  useWorkflowInbox,
  useWorkflowMine,
} from '@loomis/api-client';
import { formatKobo } from '@loomis/core';
import { useMemo } from 'react';

import {
  buildOwnerAttentionTasks,
  buildPrincipalAttentionTasks,
  computePrincipalInboxBreakdown,
  countInboxForRole,
  countOwnerThresholdRefunds,
  countRoleChangesPendingOwner,
  filterInboxByTypes,
  resolveCensusAttention,
  summarizePsfObligations,
  type AttentionStripStat,
  type AttentionTask,
  type CensusAttention,
  type PrincipalInboxBreakdown,
  type PsfSummary,
} from '@/lib/leadership/leadership-attention';

interface PsfObligationRow {
  status?: string;
  amountMinor?: number;
}

export function useLeadershipAttention(
  tenantId: string,
  role: 'school_owner' | 'principal',
  options?: { workflowInboxModule?: boolean },
) {
  const admissionsQuery = useAdmissions(tenantId);
  const inboxQuery = useWorkflowInbox(tenantId);
  const mineQuery = useWorkflowMine(tenantId);
  const yearsQuery = useAcademicYears(tenantId);
  const psfQuery = usePsfObligations(tenantId);

  const activeYear = useMemo(
    () => yearsQuery.data?.academicYears?.find((year) => year.status === 'active'),
    [yearsQuery.data],
  );
  const termsQuery = useAcademicTerms(tenantId, activeYear?.id ?? '');
  const focusTerm = useMemo(() => {
    const terms = termsQuery.data?.terms ?? [];
    return terms.find((term) => term.status === 'open') ?? terms.find((term) => term.status === 'census_locked') ?? terms[0] ?? null;
  }, [termsQuery.data]);

  const censusPreviewQuery = useCensusPreview(
    tenantId,
    focusTerm?.status === 'open' ? (focusTerm.id ?? '') : '',
  );

  const inboxItems = inboxQuery.data?.items ?? [];
  const initiated = mineQuery.data?.instances ?? [];
  const admissions = admissionsQuery.data?.admissions ?? [];
  const pendingAdmissionCount = admissions.filter((row) => row.status === 'pending').length;

  const obligations =
    ((psfQuery.data as { obligations?: PsfObligationRow[] } | undefined)?.obligations ??
      []) as PsfObligationRow[];

  const psfSummary: PsfSummary = useMemo(
    () => summarizePsfObligations(obligations),
    [obligations],
  );

  const census: CensusAttention = useMemo(
    () =>
      resolveCensusAttention(
        focusTerm,
        activeYear?.id ?? null,
        censusPreviewQuery.data?.systemBillableCount ?? null,
      ),
    [activeYear?.id, censusPreviewQuery.data?.systemBillableCount, focusTerm],
  );

  const ownerApprovalCount = countInboxForRole(inboxItems, 'school_owner');
  const principalRefundCount = filterInboxByTypes(inboxItems, ['refund_request']).filter(
    (item) => item.activeStep.approverRole === 'principal',
  ).length;
  const feeAmendmentCount = filterInboxByTypes(inboxItems, ['fee_structure_change']).filter(
    (item) => item.activeStep.approverRole === 'principal',
  ).length;
  const gradeCorrectionCount = filterInboxByTypes(inboxItems, ['grade_correction']).filter(
    (item) => item.activeStep.approverRole === 'principal',
  ).length;
  const thresholdRefundCount = countOwnerThresholdRefunds(inboxItems);
  const roleChangesPendingOwner = countRoleChangesPendingOwner(initiated);
  const inboxBreakdown: PrincipalInboxBreakdown = useMemo(
    () => computePrincipalInboxBreakdown(inboxItems),
    [inboxItems],
  );
  const workflowInboxModule = options?.workflowInboxModule ?? false;

  const isLoading =
    admissionsQuery.isLoading ||
    inboxQuery.isLoading ||
    mineQuery.isLoading ||
    yearsQuery.isLoading ||
    termsQuery.isLoading ||
    psfQuery.isLoading ||
    (focusTerm?.status === 'open' && censusPreviewQuery.isLoading);

  const ownerStats: AttentionStripStat[] = useMemo(() => {
    if (workflowInboxModule) {
      return [
        {
          label: 'Census',
          value: isLoading ? '—' : census.label,
          hint: census.hint,
          tone:
            census.urgency === 'attention' ? 'warn' : census.urgency === 'ready' ? 'ok' : 'neutral',
        },
        {
          label: 'PSF settled',
          value: isLoading ? '—' : String(psfSummary.settled),
          hint:
            psfSummary.total > 0
              ? `${psfSummary.pending} still pending`
              : 'Created at census lock',
          tone: psfSummary.pending > 0 ? 'warn' : 'ok',
        },
        {
          label: 'Workflow inbox',
          value: isLoading ? '—' : String(ownerApprovalCount),
          hint: ownerApprovalCount > 0 ? 'Awaiting owner sign-off' : 'Queue clear',
          tone: ownerApprovalCount > 0 ? 'warn' : 'ok',
        },
        {
          label: 'PSF outstanding',
          value: isLoading ? '—' : formatKobo(psfSummary.outstandingMinor),
          hint: psfSummary.outstandingMinor > 0 ? 'Unsettled obligations' : 'All settled',
          tone: psfSummary.outstandingMinor > 0 ? 'warn' : 'ok',
        },
      ];
    }

    return [
      {
        label: 'Census',
        value: isLoading ? '—' : census.label,
        hint: census.hint,
        tone: census.urgency === 'attention' ? 'warn' : census.urgency === 'ready' ? 'ok' : 'neutral',
      },
      {
        label: 'PSF obligations',
        value: isLoading ? '—' : String(psfSummary.total),
        hint:
          psfSummary.pending > 0
            ? `${psfSummary.pending} pending settlement`
            : psfSummary.total > 0
              ? 'All settled'
              : 'Created at census lock',
        tone: psfSummary.pending > 0 ? 'warn' : 'ok',
      },
      {
        label: 'Your approvals',
        value: isLoading ? '—' : String(ownerApprovalCount),
        hint: ownerApprovalCount > 0 ? 'Awaiting owner sign-off' : 'Queue clear',
        tone: ownerApprovalCount > 0 ? 'warn' : 'ok',
      },
      {
        label: 'High-value refunds',
        value: isLoading ? '—' : String(thresholdRefundCount),
        hint: thresholdRefundCount > 0 ? 'At or above ₦50,000' : 'None pending',
        tone: thresholdRefundCount > 0 ? 'warn' : 'ok',
      },
    ];
  }, [
    census,
    isLoading,
    ownerApprovalCount,
    psfSummary,
    thresholdRefundCount,
    workflowInboxModule,
  ]);

  const principalStats: AttentionStripStat[] = useMemo(() => {
    if (workflowInboxModule) {
      return [
        {
          label: 'Inbox total',
          value: isLoading ? '—' : String(inboxBreakdown.totalForPrincipal),
          hint: inboxBreakdown.totalForPrincipal > 0 ? 'Needs your decision' : 'Queue clear',
          tone: inboxBreakdown.totalForPrincipal > 0 ? 'warn' : 'ok',
        },
        {
          label: 'Refunds',
          value: isLoading ? '—' : String(inboxBreakdown.refunds),
          hint: inboxBreakdown.refunds > 0 ? 'Awaiting principal' : 'None pending',
          tone: inboxBreakdown.refunds > 0 ? 'warn' : 'ok',
        },
        {
          label: 'Fee amendments',
          value: isLoading ? '—' : String(inboxBreakdown.feeAmendments),
          hint: inboxBreakdown.feeAmendments > 0 ? 'Finance proposals' : 'None pending',
          tone: inboxBreakdown.feeAmendments > 0 ? 'warn' : 'ok',
        },
        {
          label: 'Grade fixes',
          value: isLoading ? '—' : String(inboxBreakdown.gradeCorrections),
          hint: inboxBreakdown.gradeCorrections > 0 ? 'Exam escalations' : 'None pending',
          tone: inboxBreakdown.gradeCorrections > 0 ? 'warn' : 'ok',
        },
      ];
    }

    return [
      {
        label: 'Admissions',
        value: isLoading ? '—' : String(pendingAdmissionCount),
        hint: pendingAdmissionCount > 0 ? 'Awaiting your review' : 'Pipeline clear',
        tone: pendingAdmissionCount > 0 ? 'warn' : 'ok',
      },
      {
        label: 'Refunds',
        value: isLoading ? '—' : String(principalRefundCount),
        hint: principalRefundCount > 0 ? 'Needs principal approval' : 'None pending',
        tone: principalRefundCount > 0 ? 'warn' : 'ok',
      },
      {
        label: 'Fee amendments',
        value: isLoading ? '—' : String(feeAmendmentCount),
        hint: feeAmendmentCount > 0 ? 'Finance proposals' : 'None pending',
        tone: feeAmendmentCount > 0 ? 'warn' : 'ok',
      },
      {
        label: 'Role changes',
        value: isLoading ? '—' : String(roleChangesPendingOwner),
        hint:
          roleChangesPendingOwner > 0
            ? 'Waiting on school owner'
            : 'No requests in flight',
        tone: roleChangesPendingOwner > 0 ? 'neutral' : 'ok',
      },
    ];
  }, [
    feeAmendmentCount,
    inboxBreakdown.feeAmendments,
    inboxBreakdown.gradeCorrections,
    inboxBreakdown.refunds,
    inboxBreakdown.totalForPrincipal,
    isLoading,
    pendingAdmissionCount,
    principalRefundCount,
    roleChangesPendingOwner,
    workflowInboxModule,
  ]);

  const tasks: AttentionTask[] = useMemo(() => {
    if (role === 'school_owner') {
      return buildOwnerAttentionTasks({
        census,
        ownerApprovalCount,
        thresholdRefundCount,
        pendingAdmissionCount,
        workflowInboxModule,
      });
    }
    return buildPrincipalAttentionTasks({
      pendingAdmissionCount,
      principalRefundCount,
      feeAmendmentCount,
      gradeCorrectionCount,
      roleChangesPendingOwner,
      workflowInboxModule: options?.workflowInboxModule,
    });
  }, [
    census,
    feeAmendmentCount,
    gradeCorrectionCount,
    options?.workflowInboxModule,
    ownerApprovalCount,
    pendingAdmissionCount,
    principalRefundCount,
    role,
    roleChangesPendingOwner,
    thresholdRefundCount,
    workflowInboxModule,
  ]);

  const actionCount = tasks.filter((task) => task.urgency !== 'normal').length;

  return {
    isLoading,
    focusTerm,
    activeYear,
    psfSummary,
    census,
    tasks,
    stats: role === 'school_owner' ? ownerStats : principalStats,
    actionCount,
    inboxBreakdown,
  };
}
