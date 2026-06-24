'use client';

import type { RegionalTenantAnalyticsResponse } from '@loomis/contracts';
import { AlertTriangle, TrendingDown, Wallet } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  cn,
} from '@loomis/ui-web';

const ATTENDANCE_THRESHOLD_MILLI = 750_000; // 75%
const FEE_COLLECTION_THRESHOLD_MILLI = 700_000; // 70%

export type RegionalAlert = {
  id: string;
  tenantId: string;
  schoolLabel: string;
  indicator: 'attendance' | 'fee_collection' | 'enrollment';
  message: string;
  severity: 'warning' | 'danger';
};

function deriveAlerts(tenants: RegionalTenantAnalyticsResponse[]): RegionalAlert[] {
  const alerts: RegionalAlert[] = [];
  for (const t of tenants) {
    const schoolLabel = t.tenantName?.trim() || 'School';
    if (t.attendanceRateMilli < ATTENDANCE_THRESHOLD_MILLI) {
      alerts.push({
        id: `${t.tenantId}-attendance`,
        tenantId: t.tenantId,
        schoolLabel,
        indicator: 'attendance',
        message: `Attendance ${(t.attendanceRateMilli / 10_000).toFixed(1)}% — below 75% threshold`,
        severity: t.attendanceRateMilli < 600_000 ? 'danger' : 'warning',
      });
    }
    if (t.feeCollectionRateMilli < FEE_COLLECTION_THRESHOLD_MILLI) {
      alerts.push({
        id: `${t.tenantId}-fees`,
        tenantId: t.tenantId,
        schoolLabel,
        indicator: 'fee_collection',
        message: `Fee collection ${(t.feeCollectionRateMilli / 10_000).toFixed(1)}% — revenue decline flagged`,
        severity: t.feeCollectionRateMilli < 500_000 ? 'danger' : 'warning',
      });
    }
    if (t.activeEnrollments === 0 && t.totalStudents > 0) {
      alerts.push({
        id: `${t.tenantId}-enrollment`,
        tenantId: t.tenantId,
        schoolLabel,
        indicator: 'enrollment',
        message: 'Zero active enrollments with historical students — investigate',
        severity: 'danger',
      });
    }
  }
  return alerts.sort((a, b) => (a.severity === 'danger' ? -1 : 1));
}

function AlertIcon({ indicator }: { indicator: RegionalAlert['indicator'] }) {
  if (indicator === 'fee_collection') return <Wallet aria-hidden className="size-4" />;
  if (indicator === 'enrollment') return <TrendingDown aria-hidden className="size-4" />;
  return <AlertTriangle aria-hidden className="size-4" />;
}

interface RegionalAlertsFeedProps {
  tenants: RegionalTenantAnalyticsResponse[];
  isLoading?: boolean;
  onAcknowledge?: (alertId: string) => void;
  acknowledgedIds?: Set<string>;
}

export function RegionalAlertsFeed({
  tenants,
  isLoading,
  onAcknowledge,
  acknowledgedIds = new Set(),
}: RegionalAlertsFeedProps) {
  const alerts = deriveAlerts(tenants).filter((a) => !acknowledgedIds.has(a.id));

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-base">Schools at Risk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-serif text-base">Schools at Risk</CardTitle>
          <Badge variant="outline" className="font-mono text-[10px]">
            {alerts.length} active
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">US-REG-005 · Platform monitoring rules</p>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-foreground">All schools within thresholds</p>
            <p className="mt-1 text-xs text-muted-foreground">No alerts require attention</p>
          </div>
        ) : (
          <ul className="max-h-[420px] space-y-2 overflow-y-auto">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={cn(
                  'rounded-md border px-3 py-2.5',
                  alert.severity === 'danger'
                    ? 'border-danger/30 bg-danger/5 dark:border-danger/40 dark:bg-danger/10'
                    : 'border-warning/30 bg-warning/5 dark:border-warning/40 dark:bg-warning/10',
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0',
                      alert.severity === 'danger' ? 'text-danger' : 'text-warning',
                    )}
                  >
                    <AlertIcon indicator={alert.indicator} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{alert.schoolLabel}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
                {onAcknowledge ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 w-full text-xs"
                    onClick={() => onAcknowledge(alert.id)}
                  >
                    Acknowledge
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export { deriveAlerts };
