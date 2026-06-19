'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Building2, Coins, ShieldCheck, TrendingUp } from 'lucide-react';
import { formatKobo } from '@loomis/core';
import { usePlatformPsfRates, usePlatformTenants } from '@loomis/api-client';
import { Skeleton } from '@loomis/ui-web';

import { PlatformConsoleHero } from '@/components/platform/platform-console-hero';
import { PageBody } from '@/components/platform/platform-shell';
import { PLATFORM_PAGE_CLASS, PLATFORM_UI } from '@/lib/platform/platform-ui';
import { SURFACES } from '@/lib/design/surfaces';

export default function PsfPage() {
  const { data: tenantsData, isLoading: tenantsLoading } = usePlatformTenants();
  const { data: ratesData, isLoading: ratesLoading } = usePlatformPsfRates();

  const isLoading = tenantsLoading || ratesLoading;
  const tenants = tenantsData?.tenants ?? [];
  const latestSnapshot = ratesData?.snapshots[0];
  const activeSchools = tenants.filter((t) => t.status === 'active').length;

  return (
    <PageBody className={PLATFORM_PAGE_CLASS}>
      <div className="space-y-6">
        <PlatformConsoleHero
          sectionLabel="Platform revenue"
          title="PSF rate configuration"
          description="Platform-wide and per-school PSF rates. All changes require dual approval and step-up MFA."
          isLoading={isLoading}
          stats={[
            {
              label: 'Global rate',
              value: latestSnapshot ? formatKobo(latestSnapshot.rateMinor) : '—',
              hint: 'Per student per term',
              icon: Coins,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Schools',
              value: String(tenants.length),
              hint: `${activeSchools} active`,
              icon: Building2,
              gradient: SURFACES.kpi.g3,
            },
            {
              label: 'Rate changes',
              value: latestSnapshot
                ? formatDistanceToNow(new Date(latestSnapshot.createdAt), { addSuffix: true })
                : '—',
              hint: 'Last global update',
              icon: TrendingUp,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Integrity',
              value: 'Protected',
              hint: 'Zero rate permanently blocked',
              icon: ShieldCheck,
              gradient: SURFACES.kpi.g4,
            },
          ]}
        />

        <div className={`${PLATFORM_UI.dataPanel} p-5 sm:p-6`}>
          <p className={PLATFORM_UI.sectionLabel}>Global default</p>
          {ratesLoading ? (
            <Skeleton className="mt-3 h-16 w-full max-w-md rounded-xl" />
          ) : latestSnapshot ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-3xl font-extrabold tabular-nums text-neutral-900">
                  {formatKobo(latestSnapshot.rateMinor)}
                </p>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Effective{' '}
                  {new Date(latestSnapshot.effectiveFrom).toLocaleDateString('en-NG', {
                    dateStyle: 'medium',
                  })}
                </p>
              </div>
              <p className="text-[12px] text-neutral-500">
                Navigate to a school detail page to request a tenant-specific override.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-neutral-500">No global rate configured yet.</p>
          )}
        </div>

        <div className={`${PLATFORM_UI.dataPanel} overflow-hidden`}>
          <div className="border-b border-border/80 px-5 py-4">
            <p className={PLATFORM_UI.sectionLabel}>Per-school rates</p>
            <p className="mt-1 text-[14px] font-semibold text-neutral-900">Tenant PSF snapshots</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[13px]">
              <thead className={PLATFORM_UI.tableHeader}>
                <tr>
                  {['School', 'Region', 'Tier', 'PSF rate', 'Status', ''].map((head) => (
                    <th
                      key={head || 'action'}
                      className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-brand-50/80">
                      <td colSpan={6} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                      No schools provisioned.
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-t border-brand-50/80">
                      <td className="px-4 py-3 font-semibold text-neutral-900">{tenant.name}</td>
                      <td className="px-4 py-3 text-neutral-600">{tenant.region}</td>
                      <td className="px-4 py-3 capitalize text-neutral-600">{tenant.tierCode}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-neutral-800">
                        {tenant.currentPsfRateMinor != null ? (
                          formatKobo(tenant.currentPsfRateMinor)
                        ) : (
                          <span className="text-neutral-400">Tier default</span>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-neutral-600">{tenant.status}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/platform/tenants/${tenant.id}`}
                          className="text-[12px] font-semibold text-brand-700 hover:underline"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[12px] text-neutral-500">
          CON-011: PSF rate of zero is permanently blocked. All rate changes are dual-approved and
          require step-up MFA.
        </p>
      </div>
    </PageBody>
  );
}
