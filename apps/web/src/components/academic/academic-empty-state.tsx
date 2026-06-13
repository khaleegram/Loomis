'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC } from '@/lib/design/surfaces';

interface AcademicEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  /** Smaller padding for sidebar / nested panels. */
  compact?: boolean;
}

export function AcademicEmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: AcademicEmptyStateProps) {
  return (
    <div
      className={`flex flex-1 flex-col items-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/30 text-center ${
        compact ? 'px-4 py-8' : 'px-6 py-16'
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-2xl ${SEMANTIC.cta.iconCircle} ${
          compact ? 'mb-3 size-11' : 'mb-4 size-14'
        }`}
      >
        <Icon aria-hidden className={compact ? 'size-5' : 'size-6'} />
      </div>
      <h3 className={`font-semibold text-neutral-800 ${compact ? 'text-[13px]' : 'text-[15px]'}`}>
        {title}
      </h3>
      <p
        className={`mt-1.5 max-w-sm leading-relaxed text-neutral-500 ${
          compact ? 'text-[12px]' : 'text-[13px]'
        }`}
      >
        {description}
      </p>
      {action ? <div className={compact ? 'mt-4' : 'mt-5'}>{action}</div> : null}
    </div>
  );
}

interface AcademicSectionHeaderProps {
  label: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function AcademicSectionHeader({ label, title, description, action }: AcademicSectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>{label}</p>
        <h2
          className="mt-1 text-neutral-900"
          style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-xl text-[13px] text-neutral-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
