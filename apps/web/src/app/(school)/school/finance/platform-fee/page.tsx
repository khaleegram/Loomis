'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePlatformBillingPreview } from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';

import { PlatformFeeHero } from '@/components/finance/platform-fee-hero';
import { PsfObligationsSection } from '@/components/finance/psf-obligations-section';
import { PageBody } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatCalendarDate } from '@/lib/academic/term-labels';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

function platformFeeStatusLabel(
  termStatus: string,
  billingDate: string | null,
  recordedAt: string | null,
): string {
  if (termStatus === 'census_locked' || recordedAt) return 'Recorded';
  if (billingDate) return `Auto on ${formatCalendarDate(billingDate)}`;
  return 'Pending billing date';
}

export default function PlatformFeePage() {
  const tenantId = useTenantId();
  const canView = useCan('census.lock');
  const { termId, activeYear, activeTerm } = useSchoolAcademic();

  const preview = usePlatformBillingPreview(tenantId ?? '', termId ?? '');

  const psfTotalMinor = useMemo(() => {
    if (!preview.data?.psfRateMinor) return null;
    return preview.data.psfRateMinor * preview.data.systemBillableCount;
  }, [preview.data]);

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
          <AlertDescription>You do not have access to platform fee details.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-8">
        <PlatformFeeHero
          termLabel={activeTerm?.name ?? preview.data?.termName ?? null}
          yearLabel={activeYear?.label ?? null}
          enrolledCount={preview.data?.systemBillableCount ?? 0}
          psfRateMinor={preview.data?.psfRateMinor ?? null}
          psfTotalMinor={psfTotalMinor}
          billingDate={preview.data?.censusSnapshotDate ?? null}
          statusLabel={platformFeeStatusLabel(
            preview.data?.termStatus ?? activeTerm?.status ?? 'open',
            preview.data?.censusSnapshotDate ?? null,
            preview.data?.snapshotCreatedAt ?? null,
          )}
          isLoading={preview.isLoading && Boolean(termId)}
        />

        <div className="space-y-6 pt-20">
          {!termId ? (
            <Alert>
              <AlertDescription>
                Select a term in the session bar to see platform fee for that period.
              </AlertDescription>
            </Alert>
          ) : null}

          {preview.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{academicErrorMessage(preview.error)}</AlertDescription>
            </Alert>
          ) : null}

          {termId ? (
            <div className={ACADEMIC_UI.dataPanel + ' p-5 sm:p-6'}>
              <h2 className="text-sm font-extrabold text-neutral-900">How this works</h2>
              {preview.isLoading ? (
                <Skeleton className="mt-4 h-16 w-full" />
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  Loomis counts your enrolled students on the billing date and records the platform
                  fee for this term. You do not need to take any action — it runs automatically.
                  School fee balances are separate; see{' '}
                  <Link href="/school/finance/balances" className="font-semibold text-brand-700 underline">
                    Outstanding balances
                  </Link>
                  .
                </p>
              )}
              {!preview.isLoading && preview.data ? (
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-neutral-500">Billing date</dt>
                    <dd className="font-semibold">
                      {preview.data.censusSnapshotDate
                        ? formatCalendarDate(preview.data.censusSnapshotDate)
                        : 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Recorded</dt>
                    <dd className="font-semibold">
                      {preview.data.snapshotCreatedAt
                        ? new Date(preview.data.snapshotCreatedAt).toLocaleString()
                        : 'Not yet — runs on billing date'}
                    </dd>
                  </div>
                </dl>
              ) : null}
            </div>
          ) : null}

          <PsfObligationsSection tenantId={tenantId} />
        </div>
      </div>
    </PageBody>
  );
}
