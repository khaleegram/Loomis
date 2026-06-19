'use client';

import Link from 'next/link';
import type { AcademicTermResponse } from '@loomis/contracts';
import { ArrowUpRight, Sparkles } from 'lucide-react';

import { AcademicProgressRing } from '@/components/academic/academic-progress-ring';
import { TermStatusBadge } from '@/components/academic/term-status-badge';
import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import type { AcademicHubMetrics } from '@/lib/academic/academic-metrics';
import {
  LIFECYCLE_PHASES,
  resolveNextAcademicAction,
  termLifecycleProgress,
  termPhaseIndex,
} from '@/lib/academic/academic-lifecycle-utils';
import { termStatusLabel } from '@/lib/academic/term-labels';
import { SURFACES } from '@/lib/design/surfaces';
import { cn } from '@loomis/ui-web';

interface AcademicCommandDeckProps {
  metrics: AcademicHubMetrics;
  terms: AcademicTermResponse[];
  focusTerm: AcademicTermResponse | null;
  yearId: string | null;
}

export function AcademicCommandDeck({
  metrics,
  terms,
  focusTerm,
  yearId,
}: AcademicCommandDeckProps) {
  const nextAction = resolveNextAcademicAction(metrics, terms, yearId, focusTerm);
  const progress = focusTerm ? termLifecycleProgress(focusTerm.status) : 0;
  const currentPhase = focusTerm ? termPhaseIndex(focusTerm.status) : -1;

  return (
    <div className="hero-panel rounded-2xl">
      {/* Decorative backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{ background: SURFACES.hero }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, hsl(35, 20%, 40%) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full opacity-20 blur-2xl"
        style={{ background: BRONZE.gradients.g1 }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full opacity-15 blur-2xl"
        style={{ background: BRONZE.gradients.g3 }}
      />

      <div className="relative px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-brand-600 shadow-sm">
                <Sparkles aria-hidden className="size-2.5 text-white" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                Academic command deck
              </p>
            </div>
            <h1
              className="text-neutral-900"
              style={{
                fontSize: 'clamp(1.5rem, 2.5vw, 2.125rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
              }}
            >
              {metrics.activeYearLabel ?? 'No active year'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {focusTerm ? (
                <>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-semibold text-neutral-700 shadow-xs ring-1 ring-black/[0.04]">
                    {focusTerm.name}
                  </span>
                  <TermStatusBadge status={focusTerm.status} />
                </>
              ) : (
                <span className="text-[13px] text-neutral-500">
                  Configure a term to begin the session lifecycle
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AcademicProgressRing value={progress} size={64} strokeWidth={5} />
          </div>
        </div>

        {/* Lifecycle rail */}
        <div className="mt-6 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-xs backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Session lifecycle
            </p>
            {focusTerm ? (
              <p className="text-[10px] font-medium text-neutral-400">
                Phase {currentPhase + 1} of {LIFECYCLE_PHASES.length} ·{' '}
                {termStatusLabel(focusTerm.status)}
              </p>
            ) : null}
          </div>

          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
            {LIFECYCLE_PHASES.map((phase, index) => {
              const isComplete = currentPhase > index;
              const isCurrent = currentPhase === index;
              return (
                <li key={phase.key} className="relative text-center">
                  {isCurrent ? (
                    <span
                      className="absolute left-1/2 top-0 size-9 -translate-x-1/2 animate-ping rounded-xl bg-brand-400/30"
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={cn(
                      'relative mx-auto flex size-9 items-center justify-center rounded-xl text-[11px] font-bold transition-all duration-300',
                      isComplete && 'bg-brand-600 text-neutral-900 shadow-sm',
                      isCurrent &&
                        'bg-brand-500 text-neutral-900 shadow-md ring-2 ring-brand-300 ring-offset-2',
                      !isComplete && !isCurrent && 'bg-neutral-100 text-neutral-400',
                    )}
                  >
                    {isComplete ? '✓' : index + 1}
                  </div>
                  <p
                    className={cn(
                      'mt-2 text-[10px] font-semibold uppercase tracking-wide',
                      isCurrent ? 'text-brand-800' : isComplete ? 'text-neutral-600' : 'text-neutral-400',
                    )}
                  >
                    {phase.short}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Term orbit + next action */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_minmax(240px,320px)]">
          <div className="flex flex-wrap gap-2">
            {terms.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-200 bg-white/50 px-4 py-6 text-[13px] text-neutral-500">
                No terms in this year yet. Activate the year to create term placeholders.
              </p>
            ) : (
              terms.map((term) => {
                const isFocus = term.id === focusTerm?.id;
                const pct = termLifecycleProgress(term.status);
                return (
                  <Link
                    key={term.id}
                    href="/school/academic/sessions"
                    className={cn(
                      'group min-w-[140px] flex-1 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                      isFocus
                        ? 'border-brand-300 bg-white shadow-sm ring-1 ring-brand-200/50'
                        : 'border-neutral-200/80 bg-white/80 hover:border-brand-200',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold tabular-nums text-neutral-400">
                        T{term.sequence}
                      </span>
                      <TermStatusBadge status={term.status} />
                    </div>
                    <p className="mt-1.5 text-[13px] font-bold text-neutral-900 transition-colors group-hover:text-brand-800">
                      {term.name}
                    </p>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: BRONZE.gradients.g2 }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <Link
            href={nextAction.href}
            className={cn(
              'group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
              nextAction.urgency === 'attention' &&
                'border-gold-200 bg-gradient-to-br from-gold-50/80 to-white ring-1 ring-gold-200/50',
              nextAction.urgency === 'ready' &&
                'border-brand-200 bg-gradient-to-br from-brand-50/60 to-white ring-1 ring-brand-200/40',
              nextAction.urgency === 'normal' && 'border-neutral-200 bg-white/90',
            )}
          >
            {nextAction.urgency === 'attention' ? (
              <span className="absolute right-3 top-3 size-2 animate-pulse rounded-full bg-gold-500" />
            ) : null}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                Recommended next
              </p>
              <p className="mt-1 text-[14px] font-bold text-neutral-900">{nextAction.title}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                {nextAction.description}
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700">
              {nextAction.cta}
              <ArrowUpRight
                aria-hidden
                className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AcademicCommandDeckSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-brand-100/40 bg-white">
      <div className="px-6 py-8 sm:px-8" style={{ background: SURFACES.hero }}>
        <div className="mb-4 h-4 w-40 rounded bg-brand-100/80" />
        <div className="mb-2 h-9 w-56 rounded-xl bg-brand-100/80" />
        <div className="h-4 w-72 rounded bg-brand-50" />
        <div className="mt-6 h-24 rounded-2xl bg-white/60" />
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
