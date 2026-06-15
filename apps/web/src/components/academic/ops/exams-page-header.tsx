'use client';

import Link from 'next/link';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface ExamsPageHeaderProps {
  subtitle: string;
  pendingCorrections?: number;
  canPublish?: boolean;
  showPublishLink?: boolean;
}

export function ExamsPageHeader({
  subtitle,
  pendingCorrections = 0,
  canPublish = false,
  showPublishLink = true,
}: ExamsPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>Exam Officer · results lifecycle</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
            Exams & results
          </h1>
          {pendingCorrections > 0 ? (
            <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-gold-900">
              {pendingCorrections} correction{pendingCorrections === 1 ? '' : 's'} pending
            </span>
          ) : null}
        </div>
        <p className={ACADEMIC_UI.pageDesc}>{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/school/gradebook" className={ACADEMIC_UI.btnSecondary}>
          Gradebook
        </Link>
        {canPublish && showPublishLink ? (
          <Link href="/school/exams/publish" className={ACADEMIC_UI.btnPrimary}>
            Publish results
          </Link>
        ) : null}
      </div>
    </header>
  );
}
