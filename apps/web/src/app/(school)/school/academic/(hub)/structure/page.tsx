'use client';

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

      <ClassStructureManager tenantId={tenantId} />
    </div>
  );
}
