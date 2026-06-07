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
import { SegmentedControl, Skeleton } from '@loomis/ui-web';
import { usePlatformRevenueChart } from '@loomis/api-client';
import type { PlatformRevenueDataPointResponse } from '@loomis/contracts';

import { SCHOOLHUB } from '@/components/platform/schoolhub-stat-card';

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

/** SchoolHub-style earnings line chart — PSF Billed vs Settled. */
export function PlatformRevenueLineChart() {
  const [period, setPeriod] = useState('12m');
  const { data, isLoading } = usePlatformRevenueChart(period);
  const chartData = data ? toChartData(data.points) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[#1E293B]">Platform Earnings</p>
          <p className="text-xs text-[#64748B]">PSF billed vs settled</p>
        </div>
        <SegmentedControl
          value={period}
          onValueChange={setPeriod}
          options={PERIOD_OPTIONS}
          size="sm"
          aria-label="Revenue chart period"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : chartData.length === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-[#64748B]">
          No revenue data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatKoboCompact}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 text-xs shadow-lg">
                    <p className="mb-1 font-semibold text-[#64748B]">{label}</p>
                    {payload.map((entry) => (
                      <p key={String(entry.name)} className="text-[#1E293B]">
                        {entry.name}: {formatKoboCompact(Number(entry.value ?? 0))}
                      </p>
                    ))}
                  </div>
                );
              }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line
              type="monotone"
              dataKey="billedMinor"
              name="PSF Billed"
              stroke={SCHOOLHUB.chartBlue}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="settledMinor"
              name="Settled"
              stroke={SCHOOLHUB.chartPurple}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
