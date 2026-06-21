'use client';

import { useOutstandingBalances } from '@loomis/api-client';
import { Alert, AlertDescription } from '@loomis/ui-web';

import { FinanceBalancesHero } from '@/components/finance/finance-balances-hero';
import { OutstandingBalancesPanel } from '@/components/finance/outstanding-balances-panel';
import { PsfObligationsSection } from '@/components/finance/psf-obligations-section';
import { PageBody } from '@/components/school/school-shell';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

export default function OutstandingBalancesPage() {
  const tenantId = useTenantId();
  const canView = useCan('finance.balances.view');
  const canViewPsf = useCan('ledger.view');
  const { isCore } = useTenantExperience();
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
              No billing term selected. Use the session bar to choose a term.
            </AlertDescription>
          </Alert>
        )}

        {isCore && canViewPsf ? <PsfObligationsSection tenantId={tenantId} /> : null}
      </div>
    </PageBody>
  );
}
