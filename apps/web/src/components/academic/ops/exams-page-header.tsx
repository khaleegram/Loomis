'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface ExamsPageHeaderProps {
  pendingCorrections?: number;
  showGradebookLink?: boolean;
}

export function ExamsPageHeader({
  pendingCorrections = 0,
  showGradebookLink = false,
}: ExamsPageHeaderProps) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
          Exams
        </h1>
        {pendingCorrections > 0 ? (
          <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-gold-900">
            {pendingCorrections} to review
          </span>
        ) : null}
        {showGradebookLink ? (
          <Link
            href="/school/gradebook"
            className="ml-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[#c9a96e] px-3.5 py-2 text-[13px] font-semibold text-neutral-900"
          >
            <BookOpen aria-hidden className="size-4" />
            View gradebook
          </Link>
        ) : null}
      </div>
      <p className={ACADEMIC_UI.pageDesc}>
        Grading scheme, corrections, and publishing — all on this page.
      </p>
    </header>
  );
}
