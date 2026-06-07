'use client';

import { useAdmissions, useClassLevels } from '@loomis/api-client';
import type { AdmissionResponse } from '@loomis/contracts';
import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AdmissionDecisionDialog } from '@/components/student/admission-decision-dialog';
import { AdmissionsEmptyState } from '@/components/student/admissions-empty-state';
import {
  AdmissionsKpiCards,
  AdmissionsKpiSkeleton,
  computeAdmissionsKpis,
  type KpiFilter,
} from '@/components/student/admissions-kpi-cards';
import { AdmissionsTable, AdmissionsTableSkeleton } from '@/components/student/admissions-table';
import { CreateAdmissionSheet } from '@/components/student/create-admission-sheet';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AdmissionsPipelinePage() {
  const tenantId = useTenantId();
  const canManage = useCan('admissions.manage');
  const canDecide = useCan('admissions.approve');
  const canView = useCanAny(['admissions.manage', 'admissions.approve']);

  const [createOpen, setCreateOpen] = useState(false);
  const [decisionAdmission, setDecisionAdmission] = useState<AdmissionResponse | null>(null);
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);

  const admissionsQuery = useAdmissions(tenantId ?? '');
  const classLevelsQuery = useClassLevels(tenantId ?? '');
  const admissions = admissionsQuery.data?.admissions ?? [];
  const classLevels = classLevelsQuery.data?.levels ?? [];

  const metrics = useMemo(() => computeAdmissionsKpis(admissions), [admissions]);

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Admissions pipeline" />
        <PageBody>
          <p className="text-sm text-destructive">No tenant context. Sign in again.</p>
        </PageBody>
      </>
    );
  }

  if (!canView) {
    return (
      <>
        <PageHeader title="Admissions pipeline" />
        <PageBody>
          <Alert>
            <AlertDescription>
              You do not have permission to view the admissions pipeline.
            </AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  const isLoading = admissionsQuery.isLoading || classLevelsQuery.isLoading;
  const isError = admissionsQuery.isError;
  const isEmpty = !isLoading && admissions.length === 0;

  return (
    <>
      <PageHeader
        title="Admissions pipeline"
        description="Track applications from registration through approval (US-SIS-001, US-SIS-002)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/school/students">Student registry</Link>
            </Button>
            {canManage ? (
              <Button onClick={() => setCreateOpen(true)}>New application</Button>
            ) : null}
          </div>
        }
      />
      <PageBody>
        <div className="space-y-6">
          {isLoading ? (
            <AdmissionsKpiSkeleton />
          ) : (
            <AdmissionsKpiCards
              metrics={metrics}
              activeFilter={kpiFilter}
              onFilterSelect={setKpiFilter}
            />
          )}

          {isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(admissionsQuery.error as Error).message ?? 'Failed to load admissions.'}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <AdmissionsTableSkeleton />
          ) : isEmpty ? (
            <AdmissionsEmptyState
              canCreate={canManage}
              onCreateClick={() => setCreateOpen(true)}
            />
          ) : (
            <AdmissionsTable
              admissions={admissions}
              classLevels={classLevels}
              kpiFilter={kpiFilter}
              canDecide={canDecide}
              onDecide={setDecisionAdmission}
            />
          )}
        </div>
      </PageBody>

      {canManage ? (
        <CreateAdmissionSheet
          tenantId={tenantId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      ) : null}

      <AdmissionDecisionDialog
        tenantId={tenantId}
        admission={decisionAdmission}
        open={decisionAdmission !== null}
        onOpenChange={(open) => {
          if (!open) setDecisionAdmission(null);
        }}
      />
    </>
  );
}
