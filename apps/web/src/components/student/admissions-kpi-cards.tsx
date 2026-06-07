import type { AdmissionResponse } from '@loomis/contracts';
import { Card, CardContent, Skeleton } from '@loomis/ui-web';
import type { KeyboardEvent } from 'react';
import { useMemo } from 'react';

import { daysBetween } from '@/lib/student/student-labels';

export interface AdmissionsKpiMetrics {
  pendingCount: number;
  approvedThisWeek: number;
  avgDaysPending: number;
  declineRatePercent: number | null;
}

export function computeAdmissionsKpis(admissions: AdmissionResponse[]): AdmissionsKpiMetrics {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const pending = admissions.filter((a) => a.status === 'pending');
  const approvedThisWeek = admissions.filter(
    (a) =>
      a.status === 'approved' &&
      a.decidedAt &&
      new Date(a.decidedAt) >= weekAgo,
  ).length;

  const avgDaysPending =
    pending.length === 0
      ? 0
      : Math.round(
          pending.reduce((sum, a) => sum + daysBetween(a.createdAt), 0) / pending.length,
        );

  const decided = admissions.filter(
    (a) => a.status === 'approved' || a.status === 'declined',
  );
  const declined = admissions.filter((a) => a.status === 'declined').length;
  const declineRatePercent =
    decided.length === 0 ? null : Math.round((declined / decided.length) * 100);

  return {
    pendingCount: pending.length,
    approvedThisWeek,
    avgDaysPending,
    declineRatePercent,
  };
}

export type KpiFilter = 'pending' | 'approved_week' | 'declined';

interface AdmissionsKpiCardsProps {
  metrics: AdmissionsKpiMetrics;
  activeFilter: KpiFilter | null;
  onFilterSelect: (filter: KpiFilter | null) => void;
}

const KPI_ITEMS: {
  key: KpiFilter | 'avg_days';
  label: string;
  description: string;
  emeraldSide: boolean;
}[] = [
  {
    key: 'pending',
    label: 'Pending review',
    description: 'Applications awaiting a decision',
    emeraldSide: true,
  },
  {
    key: 'approved_week',
    label: 'Approved this week',
    description: 'Offers extended in the last 7 days',
    emeraldSide: false,
  },
  {
    key: 'avg_days',
    label: 'Avg. days pending',
    description: 'Mean wait time for open applications',
    emeraldSide: true,
  },
  {
    key: 'declined',
    label: 'Decline rate',
    description: 'Share of decided applications declined',
    emeraldSide: false,
  },
];

function formatMetric(key: KpiFilter | 'avg_days', metrics: AdmissionsKpiMetrics): string {
  switch (key) {
    case 'pending':
      return String(metrics.pendingCount);
    case 'approved_week':
      return String(metrics.approvedThisWeek);
    case 'avg_days':
      return metrics.avgDaysPending === 0 ? '—' : `${metrics.avgDaysPending}d`;
    case 'declined':
      return metrics.declineRatePercent === null ? '—' : `${metrics.declineRatePercent}%`;
    default:
      return '—';
  }
}

export function AdmissionsKpiCards({
  metrics,
  activeFilter,
  onFilterSelect,
}: AdmissionsKpiCardsProps) {
  const items = useMemo(() => KPI_ITEMS, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const isClickable = item.key !== 'avg_days';
        const isActive = isClickable && activeFilter === item.key;
        const valueClass = item.emeraldSide
          ? 'text-brand-600 dark:text-mint-400'
          : 'text-gold-600 dark:text-gold-300';

        return (
          <Card
            key={item.key}
            className={`overflow-hidden border-border shadow-card transition-shadow ${
              isClickable ? 'cursor-pointer hover:shadow-md' : ''
            } ${isActive ? 'ring-2 ring-brand-500 dark:ring-mint-400' : ''}`}
            {...(isClickable
              ? {
                  onClick: () =>
                    onFilterSelect(isActive ? null : (item.key as KpiFilter)),
                  role: 'button' as const,
                  tabIndex: 0,
                  onKeyDown: (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onFilterSelect(isActive ? null : (item.key as KpiFilter));
                    }
                  },
                }
              : {})}
          >
            <div
              className={`h-1 ${
                item.emeraldSide
                  ? 'bg-brand-600 dark:bg-mint-500'
                  : 'bg-gold-400 dark:bg-gold-300'
              }`}
            />
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className={`mt-1 font-serif text-3xl font-semibold tabular-nums ${valueClass}`}>
                {formatMetric(item.key, metrics)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function AdmissionsKpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  );
}
