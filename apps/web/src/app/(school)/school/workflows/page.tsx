'use client';

import { useMemo } from 'react';
import { useWorkflowInbox } from '@loomis/api-client';
import type { WorkflowInboxItemResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';

import { WorkflowInboxHero } from '@/components/workflow/workflow-inbox-hero';
import { WorkflowInboxItemCard } from '@/components/workflow/workflow-inbox-item';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { isExamOfficerRole } from '@/lib/auth/is-exam-officer';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

export default function WorkflowInboxPage() {
  const tenantId = useTenantId();
  const { session } = useAuth();
  const inboxQuery = useWorkflowInbox(tenantId ?? '');
  const items = inboxQuery.data?.items ?? [];
  const showExamsGradeLink = session?.role ? isExamOfficerRole(session.role) : false;

  const metrics = useMemo(() => {
    const gradeCorrectionCount = items.filter(
      (item) => item.instance.workflowType === 'grade_correction',
    ).length;
    const refundCount = items.filter(
      (item) => item.instance.workflowType === 'refund_request',
    ).length;
    return {
      pendingCount: items.length,
      gradeCorrectionCount,
      refundCount,
    };
  }, [items]);

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <WorkflowInboxHero
          pendingCount={metrics.pendingCount}
          gradeCorrectionCount={metrics.gradeCorrectionCount}
          refundCount={metrics.refundCount}
          isLoading={inboxQuery.isLoading}
          showExamsGradeLink={showExamsGradeLink}
        />

        {inboxQuery.isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : inboxQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{academicErrorMessage(inboxQuery.error)}</AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <div className={`${ACADEMIC_UI.dataPanel} p-12 text-center`}>
            <p className="text-[15px] font-semibold text-neutral-800">No pending tasks</p>
            <p className="mx-auto mt-2 max-w-md text-[13px] text-neutral-500">
              Approval requests will appear here when a workflow step is assigned to your role.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item: WorkflowInboxItemResponse) => (
              <WorkflowInboxItemCard key={item.instance.id} tenantId={tenantId} item={item} />
            ))}
          </div>
        )}
      </div>
    </PageBody>
  );
}
