'use client';

import { useOutstandingBalances } from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';
import Link from 'next/link';

import { FinanceBalancesHero } from '@/components/finance/finance-balances-hero';
import { OutstandingBalancesPanel } from '@/components/finance/outstanding-balances-panel';
import { PageBody } from '@/components/school/school-shell';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

export default function OutstandingBalancesPage() {
  const tenantId = useTenantId();
  const canView = useCan('finance.balances.view');
  const canViewPlatformFee = useCan('census.lock');
  const { termId, activeYear, activeTerm } = useSchoolAcademic();

  const balancesQuery = useOutstandingBalances(tenantId ?? '', termId ?? '', {});
  const summary = balancesQuery.data?.summary;

  if (!tenantId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className={pageClass}>
        <Alert>
          <AlertDescription>You do not have permission to view outstanding balances.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <FinanceBalancesHero
          termLabel={activeTerm?.name ?? null}
          yearLabel={activeYear?.label ?? null}
          studentCount={summary?.studentCount ?? 0}
          totalBalanceMinor={summary?.totalBalanceMinor ?? 0}
          totalChargedMinor={summary?.totalChargedMinor ?? 0}
          isLoading={balancesQuery.isLoading && Boolean(termId)}
        />

        {termId ? (
          <OutstandingBalancesPanel tenantId={tenantId} termId={termId} />
        ) : (
          <Alert>
            <AlertDescription>
              No term selected. Use the session bar at the top to choose a term.
            </AlertDescription>
          </Alert>
        )}

        {canViewPlatformFee ? (
          <div className={ACADEMIC_UI.dataPanel + ' flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Loomis platform fee
              </p>
              <p className="text-sm text-neutral-600">
                Separate from school fees — recorded automatically each term.
              </p>
            </div>
            <Link href="/school/finance/platform-fee" className={ACADEMIC_UI.btnSecondary}>
              View platform fee
            </Link>
          </div>
        ) : null}
      </div>
    </PageBody>
  );
}
