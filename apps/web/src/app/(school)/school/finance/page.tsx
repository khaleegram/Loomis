'use client';

import Link from 'next/link';
import {
  useAcademicTerms,
  useAcademicYears,
  useClassLevels,
  useFeeStructures,
} from '@loomis/api-client';
import { Alert, AlertDescription, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@loomis/ui-web';
import { useState } from 'react';

import { FeeStructureEditor } from '@/components/finance/fee-structure-editor';
import {
  FinanceTermContext,
  pickDefaultTerm,
  pickDefaultYear,
} from '@/components/finance/finance-term-context';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function FinanceFeeStructuresPage() {
  const tenantId = useTenantId();
  const canConfigure = useCan('fee.configure');
  const canViewFinance = useCanAny(['fee.configure', 'payment.verify', 'payment.log']);

  const [yearId, setYearId] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [classLevelId, setClassLevelId] = useState<string | null>(null);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const resolvedYearId = yearId ?? pickDefaultYear(years)?.id ?? null;

  const termsQuery = useAcademicTerms(tenantId ?? '', resolvedYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const resolvedTermId = termId ?? pickDefaultTerm(terms)?.id ?? null;
  const activeTerm = terms.find((t) => t.id === resolvedTermId) ?? null;

  const classLevelsQuery = useClassLevels(tenantId ?? '');
  const classLevels = classLevelsQuery.data?.levels ?? [];
  const resolvedClassLevelId = classLevelId ?? classLevels[0]?.id ?? null;

  const feeStructuresQuery = useFeeStructures(tenantId ?? '', resolvedTermId ?? '');
  const structures = feeStructuresQuery.data?.feeStructures ?? [];

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Fee structures" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context. Sign in again.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!canViewFinance) {
    return (
      <>
        <PageHeader title="Fee structures" />
        <PageBody>
          <Alert>
            <AlertDescription>You do not have permission to view fee structures.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  const isLoading =
    yearsQuery.isLoading ||
    termsQuery.isLoading ||
    classLevelsQuery.isLoading ||
    feeStructuresQuery.isLoading;

  return (
    <>
      <PageHeader
        title="Fee structures"
        description="Configure per-class fee items for the current term (US-FIN-001)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild size="sm">
              <Link href="/school/finance/balances">Outstanding balances</Link>
            </Button>
            <Button variant="outline" asChild size="sm">
              <Link href="/school/finance/refunds">Refunds</Link>
            </Button>
          </div>
        }
      />
      <PageBody>
        <div className="space-y-6">
          <FinanceTermContext
            tenantId={tenantId}
            yearId={resolvedYearId}
            termId={resolvedTermId}
            onYearChange={(id) => {
              setYearId(id);
              setTermId(null);
            }}
            onTermChange={setTermId}
          />

          {!resolvedTermId ? (
            <Alert>
              <AlertDescription>
                Select an academic year and term, or configure terms in Academic sessions.
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

          {resolvedTermId && classLevels.length > 0 ? (
            <Tabs
              value={resolvedClassLevelId ?? undefined}
              onValueChange={setClassLevelId}
            >
              <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                {classLevels.map((level) => (
                  <TabsTrigger
                    key={level.id}
                    value={level.id}
                    className="data-[state=active]:bg-brand-600 data-[state=active]:text-white dark:data-[state=active]:bg-mint-500 dark:data-[state=active]:text-forest-950"
                  >
                    {level.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {classLevels.map((level) => (
                <TabsContent key={level.id} value={level.id} className="mt-4">
                  {isLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : (
                    <FeeStructureEditor
                      tenantId={tenantId}
                      termId={resolvedTermId}
                      yearId={resolvedYearId!}
                      classLevelId={level.id}
                      classLevelLabel={level.name}
                      termOpen={activeTerm?.status === 'open'}
                      structure={structures.find((s) => s.classLevelId === level.id) ?? null}
                      isLoading={false}
                      canEdit={canConfigure}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
