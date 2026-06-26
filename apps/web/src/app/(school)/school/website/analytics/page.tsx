'use client';

import { useMemo, useState } from 'react';
import { useWebsiteAnalytics, useWebsiteSite } from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { ArrowLeft, BarChart3, Eye, MousePointerClick, Users } from 'lucide-react';
import Link from 'next/link';

import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan } from '@/lib/auth/use-capability';
import { SURFACES } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const RANGE_OPTIONS = [7, 30, 90] as const;

function compact(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value);
}

export default function WebsiteAnalyticsPage() {
  const tenantId = useTenantId() ?? '';
  const canViewAnalytics = useCan('website.analytics.view');
  const [days, setDays] = useState<(typeof RANGE_OPTIONS)[number]>(30);
  const siteQuery = useWebsiteSite(tenantId);
  const analyticsQuery = useWebsiteAnalytics(tenantId, days);

  const maxViews = useMemo(
    () => Math.max(1, ...(analyticsQuery.data?.daily.map((day) => day.pageViews) ?? [0])),
    [analyticsQuery.data],
  );

  if (!tenantId) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
        <p className="text-sm text-muted-foreground">No school context.</p>
      </PageBody>
    );
  }

  if (!canViewAnalytics) {
    return (
      <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
        <Alert variant="destructive">
          <AlertDescription>You do not have access to website analytics.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  const analytics = analyticsQuery.data;
  const site = siteQuery.data;

  return (
    <PageBody className="px-4 py-5 sm:px-6 lg:px-12">
      <section className="relative overflow-hidden rounded-2xl border border-brand-100/40 shadow-sm">
        <div
          className="px-4 pb-16 pt-8 sm:px-8 sm:pb-20 sm:pt-10"
          style={{ background: SURFACES.hero }}
        >
          <Link
            href="/school/website"
            className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500 hover:text-brand-700"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Website
          </Link>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            Website analytics
          </p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
                Public site performance
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                First-party traffic summary for {site?.publicUrl?.replace('https://', '') ?? 'your public website'}.
                No third-party tracker or raw IP storage.
              </p>
            </div>
            <div className="flex rounded-full border border-white/60 bg-white/80 p-1 shadow-sm">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={`min-h-[40px] rounded-full px-4 text-xs font-bold transition ${
                    days === option
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-brand-50'
                  }`}
                >
                  {option}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-10 grid grid-cols-1 gap-3 px-4 sm:grid-cols-4 sm:px-8">
          {[
            {
              label: 'Page views',
              value: analytics?.totals.pageViews ?? 0,
              icon: Eye,
              gradient: SURFACES.kpi.g1,
            },
            {
              label: 'Unique visitors',
              value: analytics?.totals.uniqueVisitors ?? 0,
              icon: Users,
              gradient: SURFACES.kpi.g2,
            },
            {
              label: 'Enquiries',
              value: analytics?.totals.inquiries ?? 0,
              icon: MousePointerClick,
              gradient: SURFACES.kpi.g3,
            },
            {
              label: 'Admission interest',
              value: analytics?.totals.admissionInterest ?? 0,
              icon: BarChart3,
              gradient: SURFACES.kpi.g4,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/60 bg-white p-4 shadow-md"
              style={{ background: stat.gradient }}
            >
              <div className="flex items-center gap-2 text-neutral-600">
                <stat.icon className="size-4" aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                  {stat.label}
                </span>
              </div>
              <p className="mt-2 text-2xl font-extrabold text-neutral-900">
                {analyticsQuery.isLoading ? '…' : compact(stat.value)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">Last {days} days</p>
            </div>
          ))}
        </div>
      </section>

      {analyticsQuery.error ? (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>Could not load website analytics. Try again shortly.</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className={ACADEMIC_UI.dataPanel}>
          <div className="border-b border-brand-100/40 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Daily trend
            </p>
            <h2 className="mt-1 text-sm font-bold text-neutral-900">Page views by day</h2>
          </div>
          <div className="p-5">
            {analyticsQuery.isLoading ? (
              <Skeleton className="h-64 w-full rounded-2xl" />
            ) : analytics ? (
              <div className="flex h-64 items-end gap-1 overflow-x-auto rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                {analytics.daily.map((day) => (
                  <div key={day.date} className="flex min-w-8 flex-1 flex-col items-center gap-2">
                    <div className="flex h-48 w-full items-end">
                      <div
                        className="w-full rounded-t-lg bg-brand-500"
                        style={{
                          height: `${Math.max(4, (day.pageViews / maxViews) * 100)}%`,
                        }}
                        title={`${day.date}: ${day.pageViews} views`}
                      />
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(`${day.date}T00:00:00Z`).getUTCDate()}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className={ACADEMIC_UI.dataPanel}>
          <div className="border-b border-brand-100/40 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Referrers
            </p>
            <h2 className="mt-1 text-sm font-bold text-neutral-900">Where visitors came from</h2>
          </div>
          <div className="space-y-3 p-5">
            {analyticsQuery.isLoading ? (
              <>
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </>
            ) : analytics && analytics.topReferrers.length > 0 ? (
              analytics.topReferrers.map((referrer) => (
                <div
                  key={referrer.host}
                  className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-neutral-800">
                    {referrer.host}
                  </span>
                  <span className="text-sm font-bold text-brand-700">
                    {compact(referrer.pageViews)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center">
                <p className="text-sm font-semibold text-neutral-800">No visits yet</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Traffic appears here after people open the published website.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageBody>
  );
}
