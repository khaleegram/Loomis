'use client';

import { cn } from '../../lib/utils.js';

export type SparklineTrend = 'up' | 'down' | 'neutral';
export type SparklineVariant = 'line' | 'area' | 'step';

export interface SparklineProps {
  data: number[];
  trend?: SparklineTrend;
  variant?: SparklineVariant;
  className?: string;
  width?: number;
  height?: number;
}

const STROKE: Record<SparklineTrend, string> = {
  up: 'var(--color-accent-green-500, hsl(142 76% 36%))',
  down: 'var(--color-danger, hsl(0 84% 60%))',
  neutral: 'var(--color-brand-500, hsl(217 91% 60%))',
};

function buildPoints(data: number[], width: number, height: number, pad: number): string {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - 2 * pad);
      const y = height - pad - ((v - min) / range) * (height - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Inline SVG sparkline for KPI cards and metric strips. */
export function Sparkline({
  data,
  trend = 'neutral',
  variant = 'area',
  className,
  width = 120,
  height = 36,
}: SparklineProps) {
  if (data.length < 2) return null;

  const pad = 2;
  const points = buildPoints(data, width, height, pad);
  const stroke = STROKE[trend];
  const fillId = `spark-fill-${trend}`;

  if (variant === 'step') {
    const coords = points.split(' ').map((p) => p.split(',').map(Number));
    let stepD = '';
    for (let i = 0; i < coords.length; i++) {
      const [x, y] = coords[i]!;
      if (i === 0) stepD += `M${x},${y}`;
      else {
        const [px] = coords[i - 1]!;
        stepD += ` H${x} V${y}`;
        void px;
      }
    }
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn('h-10 w-full', className)}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={stepD} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  const [first] = points.split(' ');
  const areaPath = `M${first} L${points.replace(/ /g, ' L')} L${width - pad},${height} L${pad},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-10 w-full', className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {variant === 'area' ? <path d={areaPath} fill={`url(#${fillId})`} /> : null}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
