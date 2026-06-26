'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { ClassStructureManager } from '@/components/academic/class-structure-manager';
import { useCan } from '@/lib/auth/use-capability';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AcademicStructurePage() {
  const tenantId = useTenantId();
  const canManage = useCan('class_structure.manage');

  if (!tenantId) {
    return <p className="text-sm text-red-600">No tenant context.</p>;
  }

  if (!canManage) {
    return (
      <p className="text-sm text-neutral-500">
        You do not have permission to manage class structure.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className={ACADEMIC_UI.sectionLabel}>Class structure</p>
        <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
          Levels, arms & progression
        </h1>
        <p className={ACADEMIC_UI.pageDesc}>
          Configure the class ladder, per-year arms, and the progression map used when staging
          year-end promotions (FR-ASM-009).
        </p>
      </header>

      <Link
        href="/school/academic/setup"
        className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200/60 bg-brand-50/50 px-5 py-4 transition hover:bg-brand-50"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Sparkles aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[13px] font-bold text-neutral-900">New here? Use guided setup</p>
            <p className="text-[12px] text-neutral-500">
              Answer a few questions and we&apos;ll build your classes and arms for you.
            </p>
          </div>
        </div>
        <span className="text-[12px] font-semibold text-brand-700">Start</span>
      </Link>

      <ClassStructureManager tenantId={tenantId} />
    </div>
  );
}
