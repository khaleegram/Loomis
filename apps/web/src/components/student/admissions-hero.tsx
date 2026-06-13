'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCheck, ClipboardList, Clock, TrendingDown, Zap } from 'lucide-react';
import type { AdmissionsKpiMetrics } from '@/components/student/admissions-kpi-cards';
import { SURFACES } from '@/lib/design/surfaces';

interface AdmissionsHeroProps {
  metrics: AdmissionsKpiMetrics;
  isLoading?: boolean;
}

function AnimatedCounter({ target, isLoading }: { target: number; isLoading?: boolean }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoading || target === 0) {
      setCount(0);
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const duration = 1200;
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startedRef.current = false;
    };
  }, [target, isLoading]);

  if (isLoading) {
    return <span className="tabular-nums">—</span>;
  }
  return <span className="tabular-nums">{count.toLocaleString()}</span>;
}

function AnimatedString({ value, isLoading }: { value: string; isLoading?: boolean }) {
  const [displayed, setDisplayed] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const targetRef = useRef(value);

  // Extract numeric part for animation (e.g. "12d" → 12, "45%" → 45)
  const numeric = parseInt(value, 10);
  const suffix = value.replace(/^\d+/, '');

  useEffect(() => {
    targetRef.current = value;
    if (isLoading || isNaN(numeric) || numeric === 0) {
      setDisplayed(value);
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const duration = 1200;
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(`${Math.round(eased * numeric)}${suffix}`);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startedRef.current = false;
    };
  }, [value, isLoading, numeric, suffix]);

  if (isLoading) {
    return <span className="tabular-nums">—</span>;
  }
  return <span className="tabular-nums">{displayed}</span>;
}

function formatAvgDays(metrics: AdmissionsKpiMetrics): string {
  if (metrics.pendingCount === 0) return '—';
  return `${metrics.avgDaysPending}d`;
}

function formatDeclineRate(metrics: AdmissionsKpiMetrics): string {
  if (metrics.declineRatePercent === null) return '—';
  return `${metrics.declineRatePercent}%`;
}

const KPI_CARDS: {
  key: string;
  label: string;
  icon: typeof ClipboardList;
  gradient: string;
  value: (m: AdmissionsKpiMetrics) => string;
  isRawNumber: (m: AdmissionsKpiMetrics) => boolean;
}[] = [
  {
    key: 'pending',
    label: 'Pending Review',
    icon: ClipboardList,
    gradient: SURFACES.kpi.g1,
    value: (m) => String(m.pendingCount),
    isRawNumber: () => true,
  },
  {
    key: 'approved_week',
    label: 'Approved This Week',
    icon: CheckCheck,
    gradient: SURFACES.kpi.g2,
    value: (m) => String(m.approvedThisWeek),
    isRawNumber: () => true,
  },
  {
    key: 'avg_days',
    label: 'Avg. Days Pending',
    icon: Clock,
    gradient: SURFACES.kpi.g3,
    value: formatAvgDays,
    isRawNumber: () => false,
  },
  {
    key: 'decline_rate',
    label: 'Decline Rate',
    icon: TrendingDown,
    gradient: SURFACES.kpi.g4,
    value: formatDeclineRate,
    isRawNumber: () => false,
  },
];

export function AdmissionsHero({ metrics, isLoading }: AdmissionsHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      {/* Header area — warm brand gradient */}
      <div
        className="relative px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-6 lg:px-10 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-brand-600">
            <Zap aria-hidden className="size-3 text-white" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-700">
            Admissions Center
          </p>
        </div>
        <h1
          className="max-w-2xl text-neutral-900"
          style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
          }}
        >
          Admissions Pipeline
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-neutral-500">
          Track applications from registration through approval. Register new applicants, review submissions, and extend offers — all in one workspace.
        </p>

        {/* KPI Cards Row — overflows out of the hero area */}
        <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {KPI_CARDS.map((kpi) => {
            const Icon = kpi.icon;
            const rawValue = kpi.value(metrics);

            return (
              <div
                key={kpi.key}
                className="card group relative overflow-hidden rounded-xl p-3 transition-all duration-150 hover:-translate-y-0.5 sm:p-4"
              >
                <div className="relative z-10">
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className="flex size-8 items-center justify-center rounded-xl text-white sm:size-9"
                      style={{ background: kpi.gradient }}
                    >
                      <Icon aria-hidden className="size-3.5 sm:size-4" />
                    </span>
                    <span
                      className="size-1.5 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: kpi.gradient }}
                    />
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    {kpi.label}
                  </p>
                  <p
                    className="mt-1 tabular-nums leading-none text-neutral-900"
                    style={{
                      fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {kpi.isRawNumber(metrics) ? (
                      <AnimatedCounter
                        target={parseInt(rawValue, 10)}
                        isLoading={isLoading}
                      />
                    ) : (
                      <AnimatedString value={rawValue} isLoading={isLoading} />
                    )}
                  </p>
                  <div className="mt-1 h-0.5 w-6 rounded-full opacity-30" style={{ background: kpi.gradient }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdmissionsHeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div
        className="animate-pulse px-4 pb-16 pt-5 sm:px-6 sm:pb-20 sm:pt-6 lg:px-10 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="mb-3 h-5 w-40 rounded-lg bg-brand-100" />
        <div className="mb-3 h-10 w-64 rounded-xl bg-brand-100" />
        <div className="mb-8 h-5 w-80 rounded-lg bg-brand-50" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card rounded-xl p-3 sm:p-4">
              <div className="mb-3 h-9 w-9 rounded-xl bg-brand-100" />
              <div className="mb-2 h-3 w-20 rounded bg-brand-50" />
              <div className="h-7 w-12 rounded bg-brand-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
