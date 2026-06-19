'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock, UserCheck, Users, UserX, Zap } from 'lucide-react';
import type { StaffDirectoryMetrics } from '@/lib/staff/staff-labels';
import { SURFACES } from '@/lib/design/surfaces';

interface StaffHeroProps {
  metrics: StaffDirectoryMetrics;
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

const KPI_CARDS: {
  key: keyof StaffDirectoryMetrics;
  label: string;
  icon: typeof Users;
  gradient: string;
}[] = [
  { key: 'total', label: 'Total Staff', icon: Users, gradient: SURFACES.kpi.g1 },
  { key: 'active', label: 'Active', icon: UserCheck, gradient: SURFACES.kpi.g2 },
  { key: 'pending', label: 'Pending Invitations', icon: Clock, gradient: SURFACES.kpi.g3 },
  { key: 'deactivated', label: 'Deactivated', icon: UserX, gradient: SURFACES.kpi.g4 },
];

export function StaffHero({ metrics, isLoading }: StaffHeroProps) {
  return (
    <div className="hero-panel rounded-2xl">
      {/* Header area — warm brand gradient */}
      <div
        className="relative px-6 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-8 lg:px-10 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className="flex size-5 items-center justify-center rounded-full bg-brand-600"
          >
            <Zap aria-hidden className="size-3 text-white" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-700">
            Staff Operations Center
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
          Staff Management
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-neutral-500">
          Manage your school&rsquo;s workforce, assignments, permissions, and staff operations from a single workspace.
        </p>

        {/* KPI Cards Row — overflows out of the hero area */}
        <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {KPI_CARDS.map((kpi) => {
            const Icon = kpi.icon;
            const value = metrics[kpi.key];

            return (
              <div
                key={kpi.key}
                className="card group relative overflow-hidden rounded-xl p-4 transition-all duration-150 hover:-translate-y-0.5 sm:p-5"
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
                      fontSize: 'clamp(1.375rem, 2vw, 1.75rem)',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    <AnimatedCounter target={value} isLoading={isLoading} />
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

export function StaffHeroSkeleton() {
  return (
    <div className="hero-panel rounded-2xl">
      <div
        className="animate-pulse px-6 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-8 lg:px-10 lg:pt-10"
        style={{ background: SURFACES.hero }}
      >
        <div className="mb-3 h-5 w-48 rounded-lg bg-brand-100" />
        <div className="mb-3 h-10 w-72 rounded-xl bg-brand-100" />
        <div className="mb-8 h-5 w-96 rounded-lg bg-brand-50" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card rounded-xl p-4 sm:p-5">
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
