'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface GradebookMissingBannerProps {
  missingCount: number;
  totalStudents: number;
  subjectLabel?: string | null;
  classLabel?: string | null;
}

/** Tells teachers exactly what's left to enter — no hunting through the spreadsheet. */
export function GradebookMissingBanner({
  missingCount,
  totalStudents,
  subjectLabel,
  classLabel,
}: GradebookMissingBannerProps) {
  if (missingCount === 0) return null;

  const complete = totalStudents - missingCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          <AlertCircle aria-hidden className="size-4" />
        </span>
        <div>
          <p className="text-[14px] font-bold text-neutral-900">
            {missingCount} student{missingCount === 1 ? '' : 's'} still need scores
          </p>
          <p className="mt-0.5 text-[12px] text-neutral-600">
            {complete} of {totalStudents} complete
            {subjectLabel ? ` · ${subjectLabel}` : ''}
            {classLabel ? ` · ${classLabel}` : ''}
          </p>
        </div>
      </div>
      <Link href="#gradebook-entry" className={cn(ACADEMIC_UI.btnPrimarySm)}>
        Enter scores
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </div>
  );
}
