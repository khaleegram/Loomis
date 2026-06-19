'use client';

import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';

import type { ConsoleHeroStat } from '@/components/platform/platform-console-hero';
import { SURFACES } from '@/lib/design/surfaces';
import { REGIONAL_UI } from '@/lib/regional/regional-ui';

interface RegionalConsoleHeroProps {
  title: string;
  description: string;
  stats?: ConsoleHeroStat[];
  actions?: ReactNode;
  isLoading?: boolean;
}

export function RegionalConsoleHero({
  title,
  description,
  stats,
  actions,
  isLoading,
}: RegionalConsoleHeroProps) {
  return (
    <div className="hero-panel rounded-2xl">
      <div
        className={`relative px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10 ${stats?.length ? 'pb-16 sm:pb-20' : 'pb-6 sm:pb-8'}`}
        style={{ background: SURFACES.hero }}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-400/10 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-brand-600">
                <MapPin aria-hidden className="size-2.5 text-white" />
              </span>
              <p className={REGIONAL_UI.sectionLabel}>Regional console</p>
            </div>
            <h1 className={REGIONAL_UI.pageTitle} style={REGIONAL_UI.pageTitleStyle}>
              {title}
            </h1>
            <p className={REGIONAL_UI.pageDesc}>{description}</p>
          </div>
          {actions ? <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto lg:justify-end">{actions}</div> : null}
        </div>

        {stats?.length ? (
          <div className="relative z-10 -mb-24 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="card overflow-hidden rounded-xl p-4 sm:p-5">
                  <div className="mb-3">
                    <span
                      className="flex size-8 items-center justify-center rounded-xl text-white shadow-sm sm:size-9"
                      style={{ background: stat.gradient ?? SURFACES.kpi.g2 }}
                    >
                      <Icon aria-hidden className="size-3.5 sm:size-4" />
                    </span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">{stat.label}</p>
                  <p
                    className="mt-1 tabular-nums leading-none text-neutral-900"
                    style={{
                      fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {isLoading ? '—' : stat.value}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-neutral-500">{stat.hint}</p>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
