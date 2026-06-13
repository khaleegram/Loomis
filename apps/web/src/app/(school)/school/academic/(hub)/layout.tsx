'use client';

import type { ReactNode } from 'react';

import { AcademicSubNav } from '@/components/academic/academic-sub-nav';
import { PageBody } from '@/components/school/school-shell';
import { SURFACES } from '@/lib/design/surfaces';

export default function AcademicHubLayout({ children }: { children: ReactNode }) {
  return (
    <PageBody className="relative max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">
      {/* Subtle page backdrop */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40"
        style={{ background: SURFACES.hero }}
        aria-hidden
      />
      <div className="relative">
        <AcademicSubNav />
        {children}
      </div>
    </PageBody>
  );
}
