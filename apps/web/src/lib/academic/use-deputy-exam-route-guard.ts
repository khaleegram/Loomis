'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useRole } from '@/lib/auth/use-capability';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

/** Redirect Core deputy exam officers when the feature is disabled. */
export function useDeputyExamRouteGuard(): void {
  const router = useRouter();
  const role = useRole();
  const { isCore, flags, isLoading } = useTenantExperience();

  useEffect(() => {
    if (isLoading || role !== 'deputy_exam_officer') return;
    if (isCore && !flags.deputyExamEnabled) {
      router.replace('/school/settings');
    }
  }, [role, isCore, flags.deputyExamEnabled, isLoading, router]);
}
