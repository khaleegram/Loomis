'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRegionalAnalytics } from '@loomis/api-client';
import { can } from '@loomis/core';
import {
  ArrowUpRight,
  Building2,
  Download,
  MapPin,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Skeleton } from '@loomis/ui-web';

import {
  BRONZE,
  DashboardBottomCard,
  DashboardDarkPanel,
  DashboardFilterMenu,
  DashboardHeader,
  DashboardSpark,
  DashboardStatStrip,
  DashboardToolbar,
} from '@/components/dashboard/dashboard-primitives';
import { NigeriaChoropleth } from '@/components/regional/nigeria-choropleth';
import { PageBody } from '@/components/regional/regional-shell';
import { useAuth } from '@/lib/auth/auth-context';

const ROLE_LABELS: Record<string, string> = {
  regional_manager: 'Regional Manager',
  regional_subordinate: 'Regional Officer',
};

function deriveAlertCount(tenants: { attendanceRateMilli: number; feeCollectionRateMilli: number; activeEnrollments: number; totalStudents: number }[]): number {
  let count = 0;
  for (const t of tenants) {
    if (t.attendanceRateMilli < 750_000) count++;
    if (t.feeCollectionRateMilli < 700_000) count++;
    if (t.activeEnrollments === 0 && t.totalStudents > 0) count++;
  }
  return count;
}

export default function RegionalDashboardPage() {
  const { session } = useAuth();
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('This Term');

  const regionFilter = selectedState ?? undefined;
  const { data, isLoading } = useRegionalAnalytics(regionFilter);

  const roleLabel =
    session?.role != null
      ? (ROLE_LABELS[session.role] ?? session.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      : 'Regional';

  const tenants = data?.tenants ?? [];
  const filteredTenants = selectedState
    ? tenants.filter((t) => t.region.toLowerCase().includes(selectedState.toLowerCase()))
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
      ? filteredTenants.reduce((s, t) => s + t.attendanceRateMilli, 0) / filteredTenants.length / 10_000
      : null;

  const avgFeeCollection =
    filteredTenants.length > 0
      ? filteredTenants.reduce((s, t) => s + t.feeCollectionRateMilli, 0) / filteredTenants.length / 10_000
      : null;

  const totalEnrollments = data?.totals?.activeEnrollments ?? filteredTenants.reduce((s, t) => s + t.activeEnrollments, 0);
  const totalStudents = data?.totals?.totalStudents ?? filteredTenants.reduce((s, t) => s + t.totalStudents, 0);
  const alertCount = deriveAlertCount(filteredTenants);
  const showComparison = session ? can(session.role, 'regional.analytics.view') : false;

  const enrollmentTrend = filteredTenants
    .map((tenant) => tenant.activeEnrollments)
    .filter((value) => value >= 0)
    .sort((a, b) => a - b);

  const territoryOptions = useMemo(() => {
    const regions = new Set((data?.tenants ?? []).map((tenant) => tenant.region));
    return Array.from(regions)
      .sort()
      .map((region) => ({ value: region, label: region }));
  }, [data?.tenants]);

  return (
    <PageBody className="max-w-[1200px] px-7 py-7">
      <DashboardHeader
        consoleLabel="Regional Console"
        roleLabel={roleLabel}
        description="Aggregated performance across your referral network — live."
      />

      <DashboardToolbar
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        actions={
          <>
            <DashboardFilterMenu
              value={selectedState}
              onValueChange={setSelectedState}
              options={territoryOptions}
              allLabel="All Territories"
              searchPlaceholder="Search territories…"
              disabled={territoryOptions.length === 0}
            />
            <Link
              href="/regional/onboarding"
              className="flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-neutral-800"
            >
              <Plus aria-hidden className="size-3.5" />
              Onboard School
            </Link>
          </>
        }
      />

      <DashboardStatStrip
        items={[
          {
            label: 'Schools',
            value: isLoading ? '—' : filteredTenants.length.toLocaleString(),
            sub: data?.region ? `Region: ${data.region}` : `${totalStudents.toLocaleString()} students`,
            icon: Building2,
            color: BRONZE.gradients.g1,
          },
          {
            label: 'Avg Attendance',
            value: avgAttendance != null ? `${avgAttendance.toFixed(1)}%` : isLoading ? '—' : '—',
            sub: 'Network average',
            subColor: avgAttendance != null && avgAttendance >= 75 ? '#16a34a' : '#f59e0b',
            icon: TrendingUp,
            color: BRONZE.gradients.g2,
          },
          {
            label: 'Fee Collection',
            value: avgFeeCollection != null ? `${avgFeeCollection.toFixed(1)}%` : isLoading ? '—' : '—',
            sub: 'Network average',
            subColor: avgFeeCollection != null && avgFeeCollection >= 70 ? '#16a34a' : '#f59e0b',
            icon: Wallet,
            color: BRONZE.gradients.g3,
          },
          {
            label: 'Enrollments',
            value: isLoading ? '—' : totalEnrollments.toLocaleString(),
            sub: `Snapshot ${data?.snapshotDate ?? '—'}`,
            icon: Users,
            color: BRONZE.gradients.g4,
          },
        ]}
      />

      <div className="mb-5 grid grid-cols-12 gap-5">
        <div className="card col-span-8 overflow-hidden rounded-2xl">
          <div className="flex items-start justify-between px-6 pt-6 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Territory Map</p>
              <p
                className="mt-1 tabular-nums text-neutral-900"
                style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.025em' }}
              >
                {isLoading ? '—' : filteredTenants.length.toLocaleString()} schools
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">
                {selectedState ? `Filtered to ${selectedState}` : 'Nigeria referral network'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500">
              <MapPin aria-hidden className="size-3" />
              Live
            </div>
          </div>
          <div className="px-4 pb-4">
            {isLoading ? (
              <Skeleton className="h-[320px] w-full rounded-xl" />
            ) : (
              <NigeriaChoropleth
                schoolsByState={schoolsByState}
                selectedState={selectedState}
                onStateSelect={setSelectedState}
              />
            )}
          </div>
          {showComparison && filteredTenants.length > 0 ? (
            <div className="border-t border-neutral-100 px-6 py-3.5">
              <Link href="/regional/subordinates" className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 hover:text-neutral-700">
                Full comparison <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            </div>
          ) : null}
        </div>

        <div className="col-span-4 flex flex-col gap-4">
          <div className="card flex-1 overflow-hidden rounded-2xl">
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-7 items-center justify-center rounded-lg text-white"
                    style={{ background: BRONZE.gradients.g1 }}
                  >
                    <Users aria-hidden className="size-3.5" />
                  </span>
                  <p className="text-[12px] font-bold text-neutral-700">Enrollment Growth</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                  Snapshot {data?.snapshotDate ?? '—'}
                </span>
              </div>
              <p
                className="mt-2 tabular-nums text-neutral-900"
                style={{ fontSize: '1.625rem', fontWeight: 800, letterSpacing: '-0.025em' }}
              >
                {isLoading ? '—' : totalEnrollments.toLocaleString()}
              </p>
              <p className="text-[11px] text-neutral-400">Active enrollments</p>
            </div>
            <DashboardSpark data={enrollmentTrend.length >= 2 ? enrollmentTrend : []} stroke={BRONZE.stroke.accent} height={52} />
          </div>

          <DashboardDarkPanel
            title="Network Health"
            icon={MapPin}
            rows={[
              {
                label: 'Active Alerts',
                value: alertCount === 0 ? 'Clear' : `${alertCount} Flagged`,
                color: alertCount === 0 ? '#34d399' : '#f87171',
                href: '/regional/dashboard',
              },
              {
                label: 'Avg Attendance',
                value: avgAttendance != null ? `${avgAttendance.toFixed(1)}%` : '—',
                color: avgAttendance != null && avgAttendance >= 75 ? '#34d399' : '#fbbf24',
                href: '/regional/subordinates',
              },
              {
                label: 'Fee Collection',
                value: avgFeeCollection != null ? `${avgFeeCollection.toFixed(1)}%` : '—',
                color: avgFeeCollection != null && avgFeeCollection >= 70 ? '#34d399' : '#fbbf24',
                href: '/regional/subordinates',
              },
              {
                label: 'Onboarding',
                value: 'Open',
                color: '#34d399',
                href: '/regional/onboarding',
              },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <DashboardBottomCard
          href="/regional/onboarding"
          icon={Plus}
          gradient={BRONZE.gradients.card}
          label="Schools in Network"
          value={isLoading ? '—' : filteredTenants.length.toLocaleString()}
          sub={selectedState ? `In ${selectedState}` : 'Across all territories'}
        />
        <DashboardBottomCard
          href="/regional/dashboard"
          icon={TrendingUp}
          gradient="linear-gradient(135deg,#F43F5E,#BE123C)"
          label="Active Alerts"
          value={String(alertCount)}
          sub={alertCount === 0 ? 'All clear' : 'Requires attention'}
        />
        <DashboardBottomCard
          href="/regional/earnings"
          icon={Download}
          gradient="linear-gradient(135deg,#14B8A6,#0F766E)"
          label="Network Enrollments"
          value={isLoading ? '—' : totalEnrollments.toLocaleString()}
          sub="Active this snapshot"
        />
      </div>
    </PageBody>
  );
}
