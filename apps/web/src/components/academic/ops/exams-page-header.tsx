'use client';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface ExamsPageHeaderProps {
  pendingCorrections?: number;
}

export function ExamsPageHeader({ pendingCorrections = 0 }: ExamsPageHeaderProps) {
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
      </div>
      <p className={ACADEMIC_UI.pageDesc}>
        Grading scheme, corrections, and publishing — all on this page.
      </p>
    </header>
  );
}
