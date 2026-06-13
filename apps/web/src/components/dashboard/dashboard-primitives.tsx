'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Zap } from 'lucide-react';
import { SmartSearchSelect } from '@loomis/ui-web';

export const BRONZE = {
  stroke: {
    primary: 'hsl(35, 33%, 45%)',
    accent: 'hsl(35, 33%, 55%)',
  },
  gradients: {
    g1: 'linear-gradient(135deg,hsl(35,35%,52%),hsl(35,32%,40%))',
    g2: 'linear-gradient(135deg,hsl(30,28%,38%),hsl(28,26%,28%))',
    g3: 'linear-gradient(135deg,hsl(40,38%,54%),hsl(38,34%,42%))',
    g4: 'linear-gradient(135deg,hsl(28,33%,46%),hsl(24,30%,34%))',
    card: 'linear-gradient(135deg,hsl(35,33%,48%),hsl(35,28%,36%))',
  },
} as const;

export function DashboardSpark({
  data,
  stroke,
  height = 48,
}: {
  data: number[];
  stroke: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  const W = 200;
  const H = height;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const r = max - min || 1;
  const pts = data.map(
    (v, i) =>
      [
        pad + (i / (data.length - 1)) * (W - 2 * pad),
        H - pad - ((v - min) / r) * (H - 2 * pad),
      ] as [number, number],
  );
  const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [fx, fy] = pts[0]!;
  const [lx] = pts[pts.length - 1]!;
  const area = `M${fx},${fy} L${poly.replace(/ /g, ' L')} L${lx},${H} L${fx},${H} Z`;
  const id = `g${stroke.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
          <stop offset="85%" stopColor={stroke} stopOpacity={0.04} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <polyline
        points={poly}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardHeader({
  consoleLabel,
  roleLabel,
  userName,
  description,
}: {
  consoleLabel: string;
  roleLabel: string;
  userName?: string;
  description: string;
}) {
  const label = userName ?? roleLabel;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-4 items-center justify-center rounded-full bg-brand-600">
          <Zap aria-hidden className="size-2.5 text-white" />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">{consoleLabel}</p>
      </div>
      <h1
        className="text-neutral-900 text-2xl lg:text-[1.875rem]"
        style={{ fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 }}
      >
        {greeting()}, <span className="text-brand-600">{label}.</span>
      </h1>
      <p className="mt-1.5 text-[13px] text-neutral-500">{description}</p>
    </div>
  );
}

export type DashboardFilterOption = {
  value: string;
  label: string;
};

export function DashboardFilterMenu({
  value,
  onValueChange,
  options,
  allLabel,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  disabled = false,
}: {
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: DashboardFilterOption[];
  allLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}) {
  return (
    <SmartSearchSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      allLabel={allLabel}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
    />
  );
}

export function DashboardToolbar({
  periods = ['This Term', 'Last Term', 'YTD'],
  selectedPeriod,
  onPeriodChange,
  actions,
}: {
  periods?: string[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  actions?: ReactNode;
}) {
  const activePeriod = selectedPeriod ?? periods[0];

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5">
        {periods.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => onPeriodChange?.(label)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              label === activePeriod
                ? 'bg-black text-white'
                : 'border border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
    </div>
  );
}

export type DashboardStatItem = {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  icon: LucideIcon;
  color: string;
};

export function DashboardStatStrip({ items }: { items: DashboardStatItem[] }) {
  return (
    <div className="card mb-5 grid grid-cols-1 divide-y divide-neutral-100 rounded-2xl sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center gap-3.5 px-4 py-4 sm:px-5 lg:px-5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: item.color }}
            >
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">{item.label}</p>
              <p
                className="mt-0.5 tabular-nums text-neutral-900"
                style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15 }}
              >
                {item.value}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold" style={{ color: item.subColor ?? '#9ca3af' }}>
                {item.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardBottomCard({
  href,
  icon: Icon,
  gradient,
  label,
  value,
  sub,
  badge,
}: {
  href?: string;
  icon: LucideIcon;
  gradient: string;
  label: string;
  value: string;
  sub: string;
  badge?: ReactNode;
}) {
  const content = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <span
          className="flex size-9 items-center justify-center rounded-xl text-white"
          style={{ background: gradient }}
        >
          <Icon aria-hidden className="size-4" />
        </span>
        {badge ?? (href ? (
          <ArrowUpRight aria-hidden className="size-3.5 text-neutral-300 transition group-hover:text-neutral-600" />
        ) : null)}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">{label}</p>
      <p className="mt-1 tabular-nums text-neutral-900" style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card group flex flex-col rounded-2xl p-5 transition">
        {content}
      </Link>
    );
  }

  return <div className="card flex flex-col rounded-2xl p-5">{content}</div>;
}

export function formatPercentChange(
  pct: number | null | undefined,
  suffix = 'vs last term',
): { text: string; color: string } | null {
  if (pct == null || Number.isNaN(pct)) return null;
  const sign = pct >= 0 ? '+' : '−';
  return {
    text: `${sign}${Math.abs(pct).toFixed(1)}% ${suffix}`,
    color: pct >= 0 ? '#16a34a' : '#f59e0b',
  };
}

export function DashboardDarkPanel({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: LucideIcon;
  rows: { label: string; value: string; color: string; href: string }[];
}) {
  return (
    <div
      className="card-dark flex-1 rounded-2xl p-5 text-white"
      style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex size-7 items-center justify-center rounded-lg text-brand-300"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <Icon aria-hidden className="size-3.5" />
        </span>
        <p className="text-[12px] font-bold text-white">{title}</p>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] transition hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {row.label}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: row.color }} />
              <p className="font-bold" style={{ color: row.color }}>
                {row.value}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
