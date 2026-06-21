'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth/auth-context';
import { homePathForRole } from '@/lib/auth/home-path';
import { isExamOfficerRole } from '@/lib/auth/is-exam-officer';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

export default function SchoolIndexPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { experienceTier, financeMode, flags } = useTenantExperience();

  useEffect(() => {
    if (!session?.role) return;

    if (isExamOfficerRole(session.role)) {
      router.replace('/school/exams');
      return;
    }

    const target = homePathForRole(session.role, {
      experienceTier,
      financeMode,
      flags,
    });
    router.replace(target === '/school' ? '/school/dashboard' : target);
  }, [session?.role, experienceTier, financeMode, flags, router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
