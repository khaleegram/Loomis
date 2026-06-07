'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@loomis/ui-web';

import { SCHOOLHUB } from '@/components/platform/schoolhub-stat-card';

interface PlatformSettlementDonutProps {
  settledMinor: number;
  outstandingMinor: number;
  isLoading?: boolean;
}

function formatKoboCompact(minor: number): string {
  const naira = minor / 100;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}K`;
  return `₦${naira.toFixed(0)}`;
}

/** Settlement split donut — SchoolHub "Students" chart pattern. */
export function PlatformSettlementDonut({
  settledMinor,
  outstandingMinor,
  isLoading,
}: PlatformSettlementDonutProps) {
  const total = settledMinor + outstandingMinor;
  const settledPct = total > 0 ? Math.round((settledMinor / total) * 100) : 0;
  const outstandingPct = total > 0 ? 100 - settledPct : 0;

  const data = [
    { name: 'Settled', value: settledMinor, color: SCHOOLHUB.chartBlue },
    { name: 'Outstanding', value: outstandingMinor, color: SCHOOLHUB.chartYellow },
  ];

  if (isLoading) {
    return <Skeleton className="h-[220px] w-full rounded-[20px]" />;
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#1E293B]">{settledPct}%</span>
          <span className="text-xs text-[#64748B]">Settled</span>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 rounded-full"
            style={{ backgroundColor: SCHOOLHUB.chartBlue }}
          />
          <div>
            <p className="font-semibold text-[#1E293B]">Settled ({settledPct}%)</p>
            <p className="text-[#64748B]">{formatKoboCompact(settledMinor)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-3 rounded-full"
            style={{ backgroundColor: SCHOOLHUB.chartYellow }}
          />
          <div>
            <p className="font-semibold text-[#1E293B]">Outstanding ({outstandingPct}%)</p>
            <p className="text-[#64748B]">{formatKoboCompact(outstandingMinor)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
