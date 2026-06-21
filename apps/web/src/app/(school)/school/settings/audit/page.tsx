'use client';

import { SchoolAuditLog } from '@/components/settings/school-audit-log';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function SchoolAuditSettingsPage() {
  const tenantId = useTenantId();
  const canView = useCan('audit.view');

  if (!tenantId) {
    return (
      <p className="text-[13px] text-red-600 font-medium">No tenant context. Sign in again.</p>
    );
  }

  if (!canView) {
    return (
      <p className="text-[13px] text-neutral-500">
        You do not have permission to view the audit log.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>Compliance</p>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">Audit log</h1>
        <p className="mt-1.5 max-w-2xl text-[13px] text-neutral-600">
          Who did what and when at your school — read-only. Use filters to investigate payments,
          admissions, and role changes.
        </p>
      </div>
      <SchoolAuditLog tenantId={tenantId} />
    </div>
  );
}
