'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { AcademicSetupWizard } from '@/components/academic/setup/academic-setup-wizard';
import { useCanAny } from '@/lib/auth/use-capability';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AcademicSetupPage() {
  const tenantId = useTenantId();
  const canSetup = useCanAny(['academic_year.manage', 'class_structure.manage']);

  if (!tenantId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
          No tenant context.
        </div>
      </div>
    );
  }

  if (!canSetup) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-neutral-500">You do not have permission to run academic setup.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/school/academic"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Academic
      </Link>
      <AcademicSetupWizard tenantId={tenantId} />
    </div>
  );
}
