'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ChartCard, Skeleton } from '@loomis/ui-web';

const CHART_BLUE = 'hsl(221 83% 53%)';
const CHART_MUTED = 'hsl(214 32% 91%)';

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

/** Settlement split donut for platform dashboard. */
export function PlatformSettlementDonut({
  settledMinor,
  outstandingMinor,
  isLoading,
}: PlatformSettlementDonutProps) {
  const total = settledMinor + outstandingMinor;
  const settledPct = total > 0 ? Math.round((settledMinor / total) * 100) : 0;
  const outstandingPct = total > 0 ? 100 - settledPct : 0;

  const data = [
    { name: 'Settled', value: settledMinor, color: CHART_BLUE },
    { name: 'Outstanding', value: outstandingMinor, color: CHART_MUTED },
  ];

  return (
    <ChartCard title="Settlement Split" description="Settled vs outstanding PSF">
      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-xl" />
      ) : (
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
              <span className="text-2xl font-bold text-foreground">{settledPct}%</span>
              <span className="text-xs text-muted-foreground">Settled</span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-full bg-brand-600" />
              <div>
                <p className="font-semibold text-foreground">Settled ({settledPct}%)</p>
                <p className="text-muted-foreground">{formatKoboCompact(settledMinor)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-full bg-muted" />
              <div>
                <p className="font-semibold text-foreground">Outstanding ({outstandingPct}%)</p>
                <p className="text-muted-foreground">{formatKoboCompact(outstandingMinor)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
