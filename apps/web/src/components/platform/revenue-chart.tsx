'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SegmentedControl } from '@loomis/ui-web';
import { usePlatformRevenueChart } from '@loomis/api-client';
import type { PlatformRevenueDataPointResponse } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';

// ── Formatters ─────────────────────────────────────────────────────────────────

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
  return date.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-forest-700 dark:bg-forest-800">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5 text-sm">
          <span
            aria-hidden
            className="size-2 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-neutral-600 dark:text-neutral-300">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
            {formatKoboCompact(entry.value)}
          </span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="mt-2 border-t border-neutral-200 pt-2 text-xs text-neutral-500 dark:border-forest-700 dark:text-neutral-400">
          Gap:{' '}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {formatKoboCompact((payload[0]?.value ?? 0) - (payload[1]?.value ?? 0))}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Period selector ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: '24m', label: '24M' },
];

// ── Chart component ────────────────────────────────────────────────────────────

function toChartData(points: PlatformRevenueDataPointResponse[]) {
  return points.map((p) => ({
    month: formatMonth(p.month),
    billedMinor: p.billedMinor,
    settledMinor: p.settledMinor,
    rawMonth: p.month,
  }));
}

/** Grouped bar chart — PSF Billed vs Settled per month (US-REV-001..006). */
export function PlatformRevenueChart() {
  const [period, setPeriod] = useState('12m');
  const { data, isLoading } = usePlatformRevenueChart(period);

  const chartData = data ? toChartData(data.points) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">PSF Revenue</p>
          <p className="text-xs text-muted-foreground">Billed vs Settled per month</p>
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
        <Skeleton className="h-72 w-full rounded-lg" />
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 4, bottom: 4, left: 4 }}
            barCategoryGap="28%"
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatKoboCompact}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={58}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
            <Bar
              dataKey="billedMinor"
              name="PSF Billed"
              fill="#10b981"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="settledMinor"
              name="Settled"
              fill="#d4af37"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {!isLoading && chartData.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          No revenue data for this period.
        </div>
      ) : null}
    </div>
  );
}
