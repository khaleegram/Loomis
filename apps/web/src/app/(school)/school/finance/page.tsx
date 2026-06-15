'use client';

import Link from 'next/link';
import { useClassLevels, useFeeStructures } from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { useState } from 'react';

import { FeeStructureEditor } from '@/components/finance/fee-structure-editor';
import { FinanceFeeStructuresHero } from '@/components/finance/finance-fee-structures-hero';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

export default function FinanceFeeStructuresPage() {
  const tenantId = useTenantId();
  const canConfigure = useCan('fee.configure');
  const canViewFinance = useCanAny(['fee.configure', 'payment.verify', 'payment.log']);
  const { yearId, termId, activeYear, activeTerm, isLoading: sessionLoading } = useSchoolAcademic();

  const [classLevelId, setClassLevelId] = useState<string | null>(null);

  const classLevelsQuery = useClassLevels(tenantId ?? '');
  const classLevels = classLevelsQuery.data?.levels ?? [];
  const resolvedClassLevelId = classLevelId ?? classLevels[0]?.id ?? null;

  const feeStructuresQuery = useFeeStructures(tenantId ?? '', termId ?? '');
  const structures = feeStructuresQuery.data?.feeStructures ?? [];

  const isLoading =
    sessionLoading ||
    classLevelsQuery.isLoading ||
    feeStructuresQuery.isLoading;

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canViewFinance) {
    return (
      <PageBody className={pageClass}>
        <Alert>
          <AlertDescription>You do not have permission to view fee structures.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <FinanceFeeStructuresHero
          termLabel={activeTerm?.name ?? null}
          yearLabel={activeYear?.label ?? null}
          classLevelCount={classLevels.length}
          structureCount={structures.length}
          canConfigure={canConfigure}
          isLoading={isLoading}
        />

        {!termId ? (
          <Alert>
            <AlertDescription>
              No billing term selected. Use the session bar to choose a term, or configure terms in
              Academic sessions.
            </AlertDescription>
          </Alert>
        ) : null}

        {classLevels.length === 0 && !isLoading ? (
          <Alert>
            <AlertDescription>
              No class levels configured. Set up your class structure in Academic sessions first.
            </AlertDescription>
          </Alert>
        ) : null}

        {termId && classLevels.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {classLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  className={
                    resolvedClassLevelId === level.id ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive
                  }
                  onClick={() => setClassLevelId(level.id)}
                >
                  {level.name}
                </button>
              ))}
            </div>

            {resolvedClassLevelId ? (
              isLoading ? (
                <Skeleton className="h-64 w-full rounded-2xl" />
              ) : (
                <FeeStructureEditor
                  tenantId={tenantId}
                  termId={termId}
                  yearId={yearId!}
                  classLevelId={resolvedClassLevelId}
                  classLevelLabel={classLevels.find((l) => l.id === resolvedClassLevelId)?.name ?? ''}
                  termOpen={activeTerm?.status === 'open'}
                  structure={structures.find((s) => s.classLevelId === resolvedClassLevelId) ?? null}
                  isLoading={false}
                  canEdit={canConfigure}
                />
              )
            ) : null}
          </>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/school/finance/payments/log" className={ACADEMIC_UI.btnSecondary}>
            Log payment
          </Link>
          <Link href="/school/finance/reconciliation" className={ACADEMIC_UI.btnSecondary}>
            Reconciliation
          </Link>
        </div>
      </div>
    </PageBody>
  );
}
