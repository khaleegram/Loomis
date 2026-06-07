'use client';

import { formatKobo } from '@loomis/core';
import { usePlatformRevenueSummary } from '@loomis/api-client';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@loomis/ui-web';

import { KpiCard } from '@/components/platform/kpi-card';
import { PlatformRevenueChart } from '@/components/platform/revenue-chart';
import { PageBody, PageHeader } from '@/components/platform/platform-shell';

function formatKoboCompact(minor: number): string {
  const naira = minor / 100;
  if (naira >= 1_000_000_000) return `₦${(naira / 1_000_000_000).toFixed(1)}B`;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}K`;
  return `₦${naira.toFixed(0)}`;
}

export default function PlatformDashboard() {
  const { data: summary, isLoading } = usePlatformRevenueSummary();

  const settlementRatePct =
    summary && summary.billedMinor > 0
      ? ((summary.settledMinor / summary.billedMinor) * 100).toFixed(1)
      : null;

  return (
    <>
      <PageHeader
        title="Revenue Dashboard"
        description="Platform-wide PSF billing and settlement overview"
      />
      <PageBody>
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))
            ) : (
              <>
                <KpiCard
                  label="PSF Billed (period)"
                  value={summary ? formatKoboCompact(summary.billedMinor) : '—'}
                  subValue={summary ? formatKobo(summary.billedMinor) : undefined}
                  change={summary?.billedChangePct ?? null}
                  changePeriod="vs last period"
                />
                <KpiCard
                  label="Settled"
                  value={summary ? formatKoboCompact(summary.settledMinor) : '—'}
                  subValue={summary ? formatKobo(summary.settledMinor) : undefined}
                  change={summary?.settledChangePct ?? null}
                  changePeriod="vs last period"
                />
                <KpiCard
                  label="Outstanding"
                  value={summary ? formatKoboCompact(summary.outstandingMinor) : '—'}
                  subValue={summary ? formatKobo(summary.outstandingMinor) : undefined}
                />
                <KpiCard
                  label="Settlement Rate"
                  value={settlementRatePct ? `${settlementRatePct}%` : '—'}
                  subValue={
                    summary
                      ? `${summary.activeTenants.toLocaleString()} active schools`
                      : undefined
                  }
                />
              </>
            )}
          </div>

          {/* Revenue Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <PlatformRevenueChart />
            </CardContent>
          </Card>

          {/* Ledger integrity note */}
          {summary ? (
            <p className="text-xs text-muted-foreground">
              As of{' '}
              {new Date(summary.asOf).toLocaleString('en-NG', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
              . PSF obligations are immutable — this report is derived from the
              double-entry ledger.
            </p>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
