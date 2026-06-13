'use client';

import Link from 'next/link';
import { GraduationCap, Users } from 'lucide-react';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import type { AcademicHubMetrics } from '@/lib/academic/academic-metrics';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { cn } from '@loomis/ui-web';

interface AcademicYearEndPanelProps {
  metrics: AcademicHubMetrics;
}

export function AcademicYearEndPanel({ metrics }: AcademicYearEndPanelProps) {
  const hasPending = metrics.stagedPromotions > 0;

  return (
    <div
      className="card-dark relative overflow-hidden rounded-2xl p-5"
      style={{ background: 'linear-gradient(145deg, #1c1917 0%, #292524 55%, #1c1917 100%)' }}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full opacity-20 blur-xl"
        style={{ background: BRONZE.gradients.g4 }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-1/4 size-24 rounded-full opacity-10 blur-2xl"
        style={{ background: BRONZE.gradients.g1 }}
      />

      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
        Year-end pipeline
      </p>
      <p className="mt-1 text-[15px] font-bold text-neutral-100">Promotions & graduation</p>

      <div className="mt-5 space-y-3">
        <Link
          href="/school/academic/promotions"
          className={cn(
            'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white/10',
            hasPending && 'ring-1 ring-gold-500/30',
          )}
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <span
            className="flex size-9 items-center justify-center rounded-lg text-white transition-transform duration-200 group-hover:scale-105"
            style={{ background: BRONZE.gradients.g3 }}
          >
            <Users aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-neutral-200">Promotions</p>
            <p className="text-[10px] text-neutral-500">
              {hasPending
                ? `${metrics.stagedPromotions} awaiting review`
                : `${metrics.confirmedPromotions} confirmed`}
            </p>
          </div>
          {hasPending ? (
            <span className="animate-pulse rounded-full bg-gold-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-gold-300">
              Action
            </span>
          ) : null}
        </Link>

        <Link
          href="/school/academic/graduation"
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white/10"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <span
            className="flex size-9 items-center justify-center rounded-lg text-white transition-transform duration-200 group-hover:scale-105"
            style={{ background: BRONZE.gradients.card }}
          >
            <GraduationCap aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-neutral-200">Graduation</p>
            <p className="text-[10px] text-neutral-500">{metrics.graduatedCount} cohort records</p>
          </div>
        </Link>
      </div>

      <Link
        href="/school/timetable"
        className={`mt-4 inline-flex transition-all duration-200 hover:shadow-sm ${ACADEMIC_UI.btnPrimarySm}`}
      >
        Open timetable builder
      </Link>
    </div>
  );
}
