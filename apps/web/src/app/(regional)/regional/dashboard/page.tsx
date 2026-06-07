'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRegionalAnalytics } from '@loomis/api-client';
import { can } from '@loomis/core';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@loomis/ui-web';
import { Plus } from 'lucide-react';

import { KpiCard } from '@/components/platform/kpi-card';
import { NigeriaChoropleth } from '@/components/regional/nigeria-choropleth';
import { RegionalAlertsFeed } from '@/components/regional/regional-alerts-feed';
import { PageBody, PageHeader } from '@/components/regional/regional-shell';
import { useAuth } from '@/lib/auth/auth-context';

export default function RegionalDashboardPage() {
  const { session } = useAuth();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const regionFilter = selectedState ?? undefined;
  const { data, isLoading } = useRegionalAnalytics(regionFilter);

  const tenants = data?.tenants ?? [];
  const filteredTenants = selectedState
    ? tenants.filter(
        (t) => t.region.toLowerCase().includes(selectedState.toLowerCase()),
      )
    : tenants;

  const schoolsByState = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of data?.tenants ?? []) {
      map[t.region] = (map[t.region] ?? 0) + 1;
    }
    return map;
  }, [data?.tenants]);

  const avgAttendance =
    filteredTenants.length > 0
      ? filteredTenants.reduce((s, t) => s + t.attendanceRateMilli, 0) /
        filteredTenants.length /
        10_000
      : null;

  const avgFeeCollection =
    filteredTenants.length > 0
      ? filteredTenants.reduce((s, t) => s + t.feeCollectionRateMilli, 0) /
        filteredTenants.length /
        10_000
      : null;

  const totalEnrollments = filteredTenants.reduce((s, t) => s + t.activeEnrollments, 0);

  const showComparison = session ? can(session.role, 'regional.analytics.view') : false;

  return (
    <>
      <PageHeader
        title="Regional Performance"
        description="Aggregated metrics across your referral network — US-REG-001"
        actions={
          <Button asChild size="sm">
            <Link href="/regional/onboarding">
              <Plus aria-hidden className="mr-1.5 size-4" />
              Onboard School
            </Link>
          </Button>
        }
      />
      <PageBody>
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))
            ) : (
              <>
                <KpiCard
                  label="Schools in Network"
                  value={String(filteredTenants.length)}
                  subValue={data?.region ? `Region: ${data.region}` : 'All territories'}
                />
                <KpiCard
                  label="Avg Attendance"
                  value={avgAttendance != null ? `${avgAttendance.toFixed(1)}%` : '—'}
                />
                <KpiCard
                  label="Avg Fee Collection"
                  value={avgFeeCollection != null ? `${avgFeeCollection.toFixed(1)}%` : '—'}
                />
                <KpiCard
                  label="Active Enrollments"
                  value={totalEnrollments.toLocaleString()}
                  subValue={`Snapshot ${data?.snapshotDate ?? '—'}`}
                />
              </>
            )}
          </div>

          {/* Command Atlas — 8/4 map + alerts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-serif text-base">Territory Map</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[420px] w-full rounded-lg" />
                  ) : (
                    <NigeriaChoropleth
                      schoolsByState={schoolsByState}
                      selectedState={selectedState}
                      onStateSelect={setSelectedState}
                    />
                  )}
                </CardContent>
              </Card>

              {showComparison && filteredTenants.length > 0 ? (
                <Card className="mt-6 shadow-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-base">School Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>School</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead>Fee Coll.</TableHead>
                          <TableHead>Enrollments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...filteredTenants]
                          .sort((a, b) => b.attendanceRateMilli - a.attendanceRateMilli)
                          .map((t, idx) => (
                            <TableRow key={t.tenantId}>
                              <TableCell className="font-mono text-xs">
                                {idx + 1}. {t.tenantId.slice(0, 8)}…
                              </TableCell>
                              <TableCell>{t.region}</TableCell>
                              <TableCell className="tabular-nums">
                                {(t.attendanceRateMilli / 10_000).toFixed(1)}%
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {(t.feeCollectionRateMilli / 10_000).toFixed(1)}%
                              </TableCell>
                              <TableCell className="tabular-nums">{t.activeEnrollments}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="lg:col-span-4">
              <RegionalAlertsFeed
                tenants={filteredTenants}
                isLoading={isLoading}
                acknowledgedIds={acknowledged}
                onAcknowledge={(id) =>
                  setAcknowledged((prev) => new Set([...prev, id]))
                }
              />
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
