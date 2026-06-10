'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard, SegmentedControl, Skeleton } from '@loomis/ui-web';
import { usePlatformRevenueChart } from '@loomis/api-client';
import type { PlatformRevenueDataPointResponse } from '@loomis/contracts';

const CHART_BLUE = 'hsl(221 83% 53%)';
const CHART_GREEN = 'hsl(142 76% 36%)';

function formatKoboCompact(minor: number): string {
  const naira = minor / 100;
  if (naira >= 1_000_000_000) return `₦${(naira / 1_000_000_000).toFixed(1)}B`;
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
  if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}K`;
  return `₦${naira.toFixed(0)}`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString('en-NG', { month: 'short' });
}

const PERIOD_OPTIONS = [
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: '24m', label: '24M' },
];

function toChartData(points: PlatformRevenueDataPointResponse[]) {
  return points.map((p) => ({
    month: formatMonth(p.month),
    billedMinor: p.billedMinor,
    settledMinor: p.settledMinor,
  }));
}

/** PSF billed vs settled line chart for platform dashboard. */
export function PlatformRevenueLineChart() {
  const [period, setPeriod] = useState('12m');
  const { data, isLoading } = usePlatformRevenueChart(period);
  const chartData = data ? toChartData(data.points) : [];

  return (
    <ChartCard
      title="Platform Earnings"
      description="PSF billed vs settled"
      action={
        <SegmentedControl
          value={period}
          onValueChange={setPeriod}
          options={PERIOD_OPTIONS}
          size="sm"
          aria-label="Revenue chart period"
        />
      }
    >
      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : chartData.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
          No revenue data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={formatKoboCompact}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-border bg-card p-3 text-xs shadow-lg">
                    <p className="mb-1 font-semibold text-muted-foreground">{label}</p>
                    {payload.map((entry) => (
                      <p key={String(entry.name)} className="text-foreground">
                        {entry.name}: {formatKoboCompact(Number(entry.value ?? 0))}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line
              type="monotone"
              dataKey="billedMinor"
              name="PSF Billed"
              stroke={CHART_BLUE}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="settledMinor"
              name="Settled"
              stroke={CHART_GREEN}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
