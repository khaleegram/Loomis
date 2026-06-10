'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { Sparkline, type SparklineTrend } from './sparkline.js';
import { TrendBadge } from './trend-badge.js';

/**
 * Rainbow accent palette — each accent maps to a distinct vivid hue.
 * Icon wells use the solid color as background with a white icon.
 */
export type MetricAccent =
  | 'blue'
  | 'violet'
  | 'green'
  | 'orange'
  | 'teal'
  | 'rose'
  | 'amber'
  | 'indigo'
  | 'cyan'
  | 'pink';

type AccentConfig = {
  well: string;        // icon well bg + text
  sparkStroke: string; // sparkline stroke color (CSS color)
  sparkFill: string;   // sparkline fill (CSS color with alpha)
  trend: { up: string; down: string; neutral: string };
};

const ACCENTS: Record<MetricAccent, AccentConfig> = {
  blue:   { well: '',  sparkStroke: '#3B82F6', sparkFill: 'rgba(59,130,246,0.14)',   trend: { up: '#16a34a', down: '#dc2626', neutral: '#3B82F6' } },
  violet: { well: '',  sparkStroke: '#7C3AED', sparkFill: 'rgba(124,58,237,0.14)',   trend: { up: '#16a34a', down: '#dc2626', neutral: '#7C3AED' } },
  green:  { well: '',  sparkStroke: '#059669', sparkFill: 'rgba(5,150,105,0.14)',    trend: { up: '#16a34a', down: '#dc2626', neutral: '#059669' } },
  orange: { well: '',  sparkStroke: '#EA580C', sparkFill: 'rgba(234,88,12,0.14)',    trend: { up: '#16a34a', down: '#dc2626', neutral: '#EA580C' } },
  teal:   { well: '',  sparkStroke: '#0D9488', sparkFill: 'rgba(13,148,136,0.14)',   trend: { up: '#16a34a', down: '#dc2626', neutral: '#0D9488' } },
  rose:   { well: '',  sparkStroke: '#BE123C', sparkFill: 'rgba(190,18,60,0.14)',    trend: { up: '#16a34a', down: '#dc2626', neutral: '#BE123C' } },
  amber:  { well: '',  sparkStroke: '#D97706', sparkFill: 'rgba(217,119,6,0.14)',    trend: { up: '#16a34a', down: '#dc2626', neutral: '#D97706' } },
  indigo: { well: '',  sparkStroke: '#4338CA', sparkFill: 'rgba(67,56,202,0.14)',    trend: { up: '#16a34a', down: '#dc2626', neutral: '#4338CA' } },
  cyan:   { well: '',  sparkStroke: '#0891B2', sparkFill: 'rgba(8,145,178,0.14)',    trend: { up: '#16a34a', down: '#dc2626', neutral: '#0891B2' } },
  pink:   { well: '',  sparkStroke: '#DB2777', sparkFill: 'rgba(219,39,119,0.14)',   trend: { up: '#16a34a', down: '#dc2626', neutral: '#DB2777' } },
};

/** Deep two-tone gradient for each accent — rich, not flat */
const ACCENT_GRADIENT: Record<MetricAccent, string> = {
  blue:   'linear-gradient(135deg,#3B82F6,#1D4ED8)',
  violet: 'linear-gradient(135deg,#8B5CF6,#5B21B6)',
  green:  'linear-gradient(135deg,#10B981,#065F46)',
  orange: 'linear-gradient(135deg,#F97316,#C2410C)',
  teal:   'linear-gradient(135deg,#14B8A6,#0F766E)',
  rose:   'linear-gradient(135deg,#F43F5E,#9F1239)',
  amber:  'linear-gradient(135deg,#F59E0B,#92400E)',
  indigo: 'linear-gradient(135deg,#6366F1,#3730A3)',
  cyan:   'linear-gradient(135deg,#06B6D4,#155E75)',
  pink:   'linear-gradient(135deg,#EC4899,#9D174D)',
};

export interface MetricCardProps {
  label: string;
  value?: string;
  subValue?: string;
  change?: number | null;
  changePeriod?: string;
  sparklineData?: number[];
  sparklineVariant?: 'area' | 'step' | 'line';
  accent?: MetricAccent;
  icon?: LucideIcon;
  action?: { label: string; href: string };
  footer?: ReactNode;
  className?: string;
  insightTitle?: string;
  insightDescription?: string;
}

export function MetricCard({
  label,
  value,
  subValue,
  change,
  changePeriod = 'this term',
  sparklineData,
  sparklineVariant = 'area',
  accent = 'blue',
  icon: Icon,
  action,
  footer,
  className,
  insightTitle,
  insightDescription,
}: MetricCardProps) {
  const cfg = ACCENTS[accent];
  const trendKey: SparklineTrend =
    change == null ? 'neutral' : change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  const isInsight = !!(insightTitle ?? insightDescription);

  return (
    <div
      className={cn(
        'card group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-200',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
          {label}
        </p>
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-lg text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Card options"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Body: vivid icon left, value right */}
      <div className="flex items-center gap-4 px-5 pb-3">
        {Icon ? (
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ background: ACCENT_GRADIENT[accent] }}
          >
            <Icon aria-hidden className="size-6" />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          {isInsight ? (
            <>
              <p className="text-xl font-bold leading-tight text-neutral-900">
                {insightTitle}
              </p>
              {insightDescription ? (
                <p className="mt-1 text-sm text-neutral-500">{insightDescription}</p>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[2.25rem] font-bold leading-none tracking-tight text-neutral-900 tabular-nums">
                  {value ?? '—'}
                </span>
                {change != null ? (
                  <TrendBadge value={change} period={changePeriod} />
                ) : null}
              </div>
              {subValue ? (
                <p className="mt-1 text-sm text-neutral-500">{subValue}</p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Colorful sparkline */}
      {sparklineData && sparklineData.length >= 2 ? (
        <div className="px-1 pb-1">
          <ColorSparkline
            data={sparklineData}
            stroke={change != null && change < 0 ? cfg.trend.down : cfg.sparkStroke}
            fill={cfg.sparkFill}
            variant={sparklineVariant}
          />
        </div>
      ) : null}

      {footer}

      {/* Action link */}
      {action ? (
        <div className="border-t border-neutral-100 px-5 py-3">
          <a
            href={action.href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-700 transition-colors hover:text-neutral-900"
          >
            {action.label}
            <span aria-hidden className="ml-0.5 text-neutral-400">→</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}

/* ── Inline colorful sparkline — uses explicit color props ── */

interface ColorSparklineProps {
  data: number[];
  stroke: string;
  fill: string;
  variant?: 'area' | 'step' | 'line';
}

function ColorSparkline({ data, stroke, fill, variant = 'area' }: ColorSparklineProps) {
  if (data.length < 2) return null;
  const W = 120, H = 36, pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((v - min) / range) * (H - 2 * pad);
    return [x, y] as [number, number];
  });

  const polyPoints = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  if (variant === 'step') {
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i]!;
      d += i === 0 ? `M${x},${y}` : ` H${x} V${y}`;
    }
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
        <path d={d} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  const [fx, fy] = pts[0]!;
  const [lx] = pts[pts.length - 1]!;
  const areaD = `M${fx},${fy} L${polyPoints.replace(/ /g, ' L')} L${lx},${H} L${fx},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
      {variant === 'area' ? <path d={areaD} fill={fill} /> : null}
      <polyline points={polyPoints} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
