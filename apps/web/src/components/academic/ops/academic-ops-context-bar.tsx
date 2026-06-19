'use client';

import type { ReactNode } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

interface AcademicOpsContextBarProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

/** Branded filter strip for attendance, timetable, gradebook, etc. */
export function AcademicOpsContextBar({
  title = 'Context',
  description = 'Select year, term, and class to load data.',
  children,
}: AcademicOpsContextBarProps) {
  return (
    <div className={`mb-6 ${ACADEMIC_UI.dataPanel} p-4 sm:p-5`}>
      <div className="mb-4 border-b border-border pb-3">
        <p className={ACADEMIC_UI.sectionLabel}>{title}</p>
        <p className="mt-1 text-[13px] text-neutral-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
