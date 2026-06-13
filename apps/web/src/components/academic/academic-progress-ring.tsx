'use client';

import { cn } from '@loomis/ui-web';

interface AcademicProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

/** Circular progress indicator for term lifecycle. */
export function AcademicProgressRing({
  value,
  size = 56,
  strokeWidth = 4,
  className,
  label = 'Term progress',
}: AcademicProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#academic-progress-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="academic-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(35, 35%, 52%)" />
            <stop offset="100%" stopColor="hsl(35, 28%, 36%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="tabular-nums leading-none text-brand-800"
          style={{ fontSize: size > 50 ? '1rem' : '0.875rem', fontWeight: 800 }}
        >
          {Math.round(value)}%
        </span>
      </div>
      <span className="sr-only">
        {label}: {Math.round(value)} percent
      </span>
    </div>
  );
}
