'use client';

import {
  useAcademicTerms,
  useAcademicYears,
  useAdmissions,
  useCensusPreview,
  useOutstandingBalances,
  usePsfObligations,
  useSchoolBranding,
  useStudents,
  useWorkflowInbox,
  useWorkflowMine,
} from '@loomis/api-client';
import { useMemo } from 'react';

import {
  buildOwnerAttentionTasks,
  buildOwnerSchoolStripStats,
  buildPrincipalAttentionTasks,
  computePrincipalInboxBreakdown,
  countInboxForRole,
  countOwnerThresholdRefunds,
  countRoleChangesPendingOwner,
  filterInboxByTypes,
  resolveCensusAttention,
  resolveSchoolTermPulse,
  summarizePsfObligations,
  type AttentionStripStat,
  type AttentionTask,
  type CensusAttention,
  type PrincipalInboxBreakdown,
  type PsfSummary,
  type SchoolTermPulse,
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
  const studentsQuery = useStudents(tenantId);
  const brandingQuery = useSchoolBranding(tenantId);

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

  const balancesQuery = useOutstandingBalances(tenantId, focusTerm?.id ?? '', { scope: 'all' });

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
    (role === 'school_owner' && studentsQuery.isLoading) ||
    (role === 'school_owner' && brandingQuery.isLoading) ||
    (role === 'school_owner' && Boolean(focusTerm?.id) && balancesQuery.isLoading) ||
    (focusTerm?.status === 'open' && censusPreviewQuery.isLoading);

  const enrolledCount = useMemo(() => {
    const billable = censusPreviewQuery.data?.systemBillableCount;
    if (typeof billable === 'number') return billable;
    return studentsQuery.data?.students?.length ?? null;
  }, [censusPreviewQuery.data?.systemBillableCount, studentsQuery.data?.students]);

  const schoolTermPulse: SchoolTermPulse = useMemo(
    () => resolveSchoolTermPulse(focusTerm, enrolledCount),
    [enrolledCount, focusTerm],
  );

  const schoolName = brandingQuery.data?.tenantName ?? 'Your school';

  const ownerStats: AttentionStripStat[] = useMemo(() => {
    const balanceRows = balancesQuery.data?.rows ?? [];
    const familiesOwingCount = balanceRows.filter((row) => row.balanceMinor > 0).length;
    const totalFeesOwedMinor =
      balancesQuery.data?.summary?.totalBalanceMinor ??
      balanceRows.reduce((sum, row) => sum + row.balanceMinor, 0);

    return buildOwnerSchoolStripStats({
      enrolledCount: enrolledCount ?? 0,
      pendingAdmissionCount,
      familiesOwingCount,
      totalFeesOwedMinor,
      ownerApprovalCount,
      thresholdRefundCount,
      termLabel: schoolTermPulse.termLabel,
      isLoading:
        isLoading ||
        (Boolean(focusTerm?.id) && balancesQuery.isLoading && role === 'school_owner'),
    });
  }, [
    balancesQuery.data,
    enrolledCount,
    focusTerm?.id,
    isLoading,
    ownerApprovalCount,
    pendingAdmissionCount,
    role,
    schoolTermPulse.termLabel,
    thresholdRefundCount,
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
    schoolTermPulse,
    schoolName,
  };
}
