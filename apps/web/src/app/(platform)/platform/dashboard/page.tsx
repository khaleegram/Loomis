'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { formatKobo } from '@loomis/core';
import {
  usePlatformPrivilegedChanges,
  usePlatformRevenueSummary,
  usePlatformRiskCases,
} from '@loomis/api-client';
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@loomis/ui-web';

import { PlatformRevenueLineChart } from '@/components/platform/platform-revenue-line-chart';
import { PlatformSettlementDonut } from '@/components/platform/platform-settlement-donut';
import { PageBody, PageHeader } from '@/components/platform/platform-shell';
import { SchoolHubStatCard } from '@/components/platform/schoolhub-stat-card';

function formatKoboCompact(minor: number): string {
  const naira = minor / 100;
  if (naira >= 1_000_000_000) return `₦${(naira / 1_000_000_000).toFixed(1)}B`;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}K`;
  return `₦${naira.toFixed(0)}`;
}

function PanelCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`rounded-[20px] border-[#EEF2F7] bg-white shadow-sm ${className ?? ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-[#1E293B]">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function PlatformDashboard() {
  const { data: summary, isLoading } = usePlatformRevenueSummary();
  const { data: riskCases } = usePlatformRiskCases({ status: 'OPEN' });
  const { data: pendingApprovals } = usePlatformPrivilegedChanges('pending');

  const settlementRatePct =
    summary && summary.billedMinor > 0
      ? Math.round((summary.settledMinor / summary.billedMinor) * 100)
      : null;

  const openCases = riskCases?.cases.slice(0, 4) ?? [];
  const approvals = pendingApprovals?.changes.slice(0, 4) ?? [];

  return (
    <PageBody>
      <PageHeader
        title="Platform Dashboard"
        description="Revenue health, tenant activity, and compliance overview"
      />

      <div className="space-y-6">
        {/* SchoolHub-style stat row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-[20px]" />
            ))
          ) : (
            <>
              <SchoolHubStatCard
                variant="blue"
                label="Active Schools"
                value={summary ? summary.activeTenants.toLocaleString() : '—'}
                change={summary?.billedChangePct ?? null}
              />
              <SchoolHubStatCard
                variant="yellow"
                label="PSF Billed"
                value={summary ? formatKoboCompact(summary.billedMinor) : '—'}
                change={summary?.billedChangePct ?? null}
              />
              <SchoolHubStatCard
                variant="purple"
                label="Settled"
                value={summary ? formatKoboCompact(summary.settledMinor) : '—'}
                change={summary?.settledChangePct ?? null}
              />
              <SchoolHubStatCard
                variant="orange"
                label="Outstanding"
                value={summary ? formatKoboCompact(summary.outstandingMinor) : '—'}
              />
            </>
          )}
        </div>

        {/* Main grid — charts + right rail */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PanelCard title="Settlement Split">
                <PlatformSettlementDonut
                  settledMinor={summary?.settledMinor ?? 0}
                  outstandingMinor={summary?.outstandingMinor ?? 0}
                  isLoading={isLoading}
                />
              </PanelCard>

              <PanelCard title="Settlement Rate">
                <div className="flex h-full min-h-[180px] flex-col justify-center">
                  <p className="text-5xl font-bold text-[#1E293B]">
                    {settlementRatePct != null ? `${settlementRatePct}%` : '—'}
                  </p>
                  <p className="mt-2 text-sm text-[#64748B]">
                    of billed PSF obligations settled this period
                  </p>
                  {summary ? (
                    <p className="mt-4 text-xs text-[#94A3B8]">
                      Exact: {formatKobo(summary.settledMinor)} settled ·{' '}
                      {formatKobo(summary.outstandingMinor)} outstanding
                    </p>
                  ) : null}
                </div>
              </PanelCard>
            </div>

            <PanelCard title="Earnings">
              <PlatformRevenueLineChart />
            </PanelCard>
          </div>

          {/* Right column — agenda + messages pattern from SchoolHub */}
          <div className="space-y-6 xl:col-span-4">
            <PanelCard title="Pending Approvals">
              {approvals.length === 0 ? (
                <p className="text-sm text-[#64748B]">No approvals waiting.</p>
              ) : (
                <ul className="space-y-3">
                  {approvals.map((item) => (
                    <li key={item.id} className="rounded-xl bg-[#F8FAFC] p-3">
                      <p className="text-sm font-medium text-[#1E293B]">{item.changeType}</p>
                      <p className="mt-0.5 text-xs text-[#64748B]">{item.reason}</p>
                      <Link
                        href="/platform/approvals"
                        className="mt-2 inline-block text-xs font-semibold text-[#5B93FF] hover:underline"
                      >
                        Review →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </PanelCard>

            <PanelCard title="Open IVP Cases">
              {openCases.length === 0 ? (
                <p className="text-sm text-[#64748B]">No open risk cases.</p>
              ) : (
                <ul className="space-y-3">
                  {openCases.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#1E293B]">
                          {c.tenantName}
                        </p>
                        <p className="text-xs text-[#64748B]">Score {c.anomalyScore}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {c.caseStatus}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/platform/risk"
                className="mt-4 inline-block text-xs font-semibold text-[#5B93FF] hover:underline"
              >
                View all cases →
              </Link>
            </PanelCard>
          </div>
        </div>

        {/* Bottom row — activity feeds */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PanelCard title="Revenue Snapshot">
            {summary ? (
              <ul className="space-y-2 text-sm text-[#64748B]">
                <li className="flex justify-between">
                  <span>Billed</span>
                  <span className="font-semibold text-[#1E293B]">
                    {formatKobo(summary.billedMinor)}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Settled</span>
                  <span className="font-semibold text-[#1E293B]">
                    {formatKobo(summary.settledMinor)}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Outstanding</span>
                  <span className="font-semibold text-[#1E293B]">
                    {formatKobo(summary.outstandingMinor)}
                  </span>
                </li>
              </ul>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </PanelCard>

          <PanelCard title="Platform Activity">
            <ul className="space-y-3 text-sm">
              <li className="rounded-xl bg-[#F8FAFC] p-3 text-[#64748B]">
                {summary
                  ? `${summary.activeTenants.toLocaleString()} schools active on platform`
                  : 'Loading tenant count…'}
              </li>
              <li className="rounded-xl bg-[#F8FAFC] p-3 text-[#64748B]">
                {openCases.length > 0
                  ? `${openCases.length} IVP cases need attention`
                  : 'No IVP anomalies flagged'}
              </li>
              <li className="rounded-xl bg-[#F8FAFC] p-3 text-[#64748B]">
                {approvals.length > 0
                  ? `${approvals.length} privileged changes awaiting dual approval`
                  : 'Approval queue clear'}
              </li>
            </ul>
          </PanelCard>

          <PanelCard title="Ledger Note">
            {summary ? (
              <p className="text-sm leading-relaxed text-[#64748B]">
                As of{' '}
                {new Date(summary.asOf).toLocaleString('en-NG', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                . PSF obligations are immutable — figures derive from the double-entry ledger.
              </p>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
          </PanelCard>
        </div>
      </div>
    </PageBody>
  );
}
