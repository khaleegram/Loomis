'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';

interface AcademicYearBridgeProps {
  fromLabel: string | null;
  toLabel: string | null;
}

/** Visual from → to year bridge for promotions. */
export function AcademicYearBridge({ fromLabel, toLabel }: AcademicYearBridgeProps) {
  const hasDestination = Boolean(toLabel);

  return (
    <div className="card relative overflow-hidden rounded-2xl p-5">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-50/80 via-transparent to-brand-50/40" />
      <div
        className="pointer-events-none absolute -right-8 top-0 size-32 rounded-full opacity-10 blur-2xl"
        style={{ background: BRONZE.gradients.g2 }}
      />

      <div className="relative flex flex-wrap items-center justify-center gap-4 sm:gap-8">
        <div className="min-w-[120px] rounded-xl border border-neutral-200 bg-white px-4 py-3 text-center shadow-xs transition hover:border-brand-200">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Closing year</p>
          <p className="mt-1 text-[15px] font-bold text-neutral-900">{fromLabel ?? '—'}</p>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-brand-300 sm:w-12" />
            <span className="flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase text-neutral-900 shadow-sm">
              Promote
              <ArrowRight aria-hidden className="size-3" />
            </span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-brand-300 sm:w-12" />
          </div>
          <p className="text-[10px] text-neutral-400">Class progression</p>
        </div>

        <div
          className={`min-w-[120px] rounded-xl border px-4 py-3 text-center transition ${
            hasDestination
              ? 'border-brand-200 bg-brand-50/50'
              : 'border-dashed border-gold-200 bg-gold-50/30'
          }`}
        >
          <p
            className={`text-[10px] font-bold uppercase tracking-wide ${
              hasDestination ? 'text-brand-700' : 'text-gold-700'
            }`}
          >
            Destination
          </p>
          <p className="mt-1 text-[15px] font-bold text-neutral-900">
            {toLabel ?? 'Create next year'}
          </p>
        </div>
      </div>
    </div>
  );
}
