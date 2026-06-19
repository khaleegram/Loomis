'use client';

import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface CommsPageHeaderProps {
  unreadCount: number;
  subtitle: string;
}

export function CommsPageHeader({ unreadCount, subtitle }: CommsPageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>School communications</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-foreground" style={ACADEMIC_PAGE_TITLE_STYLE}>
            Messages
          </h1>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-brand-800">
              {unreadCount} unread
            </span>
          ) : null}
        </div>
        <p className={ACADEMIC_UI.pageDesc}>{subtitle}</p>
      </div>
    </header>
  );
}
