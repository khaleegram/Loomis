'use client';

import { useAdmissions, useClassLevels } from '@loomis/api-client';
import type { AdmissionResponse } from '@loomis/contracts';
import { Button } from '@loomis/ui-web';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AdmissionDecisionDialog } from '@/components/student/admission-decision-dialog';
import { AdmissionsHero, AdmissionsHeroSkeleton } from '@/components/student/admissions-hero';
import { computeAdmissionsKpis } from '@/components/student/admissions-kpi-cards';
import { AdmissionsTable, AdmissionsTableSkeleton } from '@/components/student/admissions-table';
import { CreateAdmissionSheet } from '@/components/student/create-admission-sheet';
import { PageBody } from '@/components/school/school-shell';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { UserPlus, Users } from 'lucide-react';

export default function AdmissionsPipelinePage() {
  const tenantId = useTenantId();
  const canManage = useCan('admissions.manage');
  const canDecide = useCan('admissions.approve');
  const canView = useCanAny(['admissions.manage', 'admissions.approve']);

  const [createOpen, setCreateOpen] = useState(false);
  const [decisionAdmission, setDecisionAdmission] = useState<AdmissionResponse | null>(null);

  const admissionsQuery = useAdmissions(tenantId ?? '');
  const classLevelsQuery = useClassLevels(tenantId ?? '');
  const admissions = admissionsQuery.data?.admissions ?? [];
  const classLevels = classLevelsQuery.data?.levels ?? [];

  const metrics = useMemo(() => computeAdmissionsKpis(admissions), [admissions]);

  if (!tenantId) {
    return (
      <PageBody className="max-w-[1400px] px-6 py-6 lg:px-12 lg:py-8">
        <p className="text-sm text-red-600 font-medium">No tenant context. Sign in again.</p>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className="max-w-[1400px] px-6 py-6 lg:px-12 lg:py-8">
        <p className="text-sm text-neutral-500">You do not have permission to view the admissions pipeline.</p>
      </PageBody>
    );
  }

  const isLoading = admissionsQuery.isLoading || classLevelsQuery.isLoading;
  const isError = admissionsQuery.isError;
  const isEmpty = !isLoading && admissions.length === 0;

  return (
    <>
      <PageBody className="max-w-[1400px] px-6 py-6 lg:px-12 lg:py-8">
        <div className="space-y-8">
          {/* 1. Hero */}
          {isLoading ? <AdmissionsHeroSkeleton /> : <AdmissionsHero metrics={metrics} />}

          {/* 2. CTA Buttons — right under the hero */}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className="gap-1.5 border-neutral-200 hover:border-brand-200" asChild>
              <Link href="/school/students">
                <Users aria-hidden className="size-3.5" />
                Student Registry
              </Link>
            </Button>
            {canManage ? (
              <button
                onClick={() => setCreateOpen(true)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-colors duration-150 ${SEMANTIC.cta.primary}`}
              >
                <UserPlus size={16} />
                New Application
              </button>
            ) : null}
          </div>

          {/* 3. Error */}
          {isError ? (
            <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
              {(admissionsQuery.error as Error).message ?? 'Failed to load admissions.'}
            </div>
          ) : null}

          {/* 4. Empty state — no applications at all */}
          {isEmpty ? (
            <div className="flex flex-col items-center py-20">
              <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${SEMANTIC.cta.iconCircle}`}>
                <UserPlus size={28} />
              </div>
              <h2 className="mb-2 text-lg font-medium text-neutral-800">No applications yet</h2>
              <p className="mb-5 max-w-xs text-center text-sm text-neutral-500">
                Register your first applicant to begin the admissions pipeline.
              </p>
              {canManage ? (
                <button
                  onClick={() => setCreateOpen(true)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors ${SEMANTIC.cta.primary}`}
                >
                  <UserPlus size={16} />
                  Register first applicant
                </button>
              ) : null}
            </div>
          ) : null}

          {/* 5. Table */}
          {isLoading ? (
            <AdmissionsTableSkeleton />
          ) : !isError && admissions.length > 0 ? (
            <AdmissionsTable
              admissions={admissions}
              classLevels={classLevels}
              kpiFilter={null}
              canDecide={canDecide}
              onDecide={setDecisionAdmission}
            />
          ) : null}
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
