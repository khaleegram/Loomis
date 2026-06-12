'use client';

import { Clock, UserCheck, Users, UserX } from 'lucide-react';

import { DashboardStatStrip } from '@/components/dashboard/dashboard-primitives';
import { STATUS_TEXT, SURFACES } from '@/lib/design/surfaces';
import type { StaffDirectoryMetrics } from '@/lib/staff/staff-labels';

/** Compact counts bar — dashboard look, directory context (not a home dashboard). */
export function StaffSummaryStrip({
  metrics,
  isLoading,
}: {
  metrics: StaffDirectoryMetrics;
  isLoading?: boolean;
}) {
  const dash = isLoading ? '—' : undefined;

  return (
    <DashboardStatStrip
      items={[
        {
          label: 'Total',
          value: dash ?? metrics.total.toLocaleString(),
          sub: 'In directory',
          icon: Users,
          color: SURFACES.kpi.g1,
        },
        {
          label: 'Active',
          value: dash ?? metrics.active.toLocaleString(),
          sub: 'Working now',
          subColor: STATUS_TEXT.success,
          icon: UserCheck,
          color: SURFACES.kpi.g2,
        },
        {
          label: 'Pending',
          value: dash ?? metrics.pending.toLocaleString(),
          sub:
            metrics.expiredInvites > 0
              ? `${metrics.expiredInvites} invite expired`
              : 'Awaiting setup',
          subColor: metrics.expiredInvites > 0 ? STATUS_TEXT.warning : STATUS_TEXT.muted,
          icon: Clock,
          color: SURFACES.kpi.g3,
        },
        {
          label: 'Deactivated',
          value: dash ?? metrics.deactivated.toLocaleString(),
          sub: 'Former members',
          icon: UserX,
          color: SURFACES.kpi.g4,
        },
      ]}
    />
  );
}
