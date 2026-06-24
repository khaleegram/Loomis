'use client';

import Link from 'next/link';
import { formatKobo } from '@loomis/core';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import type { CensusAttention, PsfSummary } from '@/lib/leadership/leadership-attention';

interface LoomisPlatformFootnoteProps {
  psfSummary: PsfSummary;
  census: CensusAttention;
  isLoading: boolean;
}

/** De-emphasized Loomis SaaS billing — separate from parent school fees. */
export function LoomisPlatformFootnote({
  psfSummary,
  census,
  isLoading,
}: LoomisPlatformFootnoteProps) {
  const outstandingLabel =
    psfSummary.outstandingMinor > 0
      ? `${formatKobo(psfSummary.outstandingMinor)} outstanding`
      : psfSummary.total > 0
        ? 'All settled this term'
        : 'Recorded when term census locks';

  return (
    <section
      className={`${ACADEMIC_UI.dataPanel} flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`}
    >
      <div className="min-w-0">
        <p className={ACADEMIC_UI.sectionLabel}>Loomis platform</p>
        <p className="text-[14px] font-semibold text-neutral-900">
          {isLoading ? 'Loading platform fee…' : outstandingLabel}
        </p>
        <p className="mt-0.5 text-[12px] text-neutral-500">
          {census.hint}. This is your Loomis subscription — not parent school-fee payments.
        </p>
      </div>
      <Link href="/school/finance/platform-fee" className={`${ACADEMIC_UI.btnSecondary} shrink-0`}>
        View platform fee
      </Link>
    </section>
  );
}
