'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { CoreOwnerHome } from '@/components/dashboard/core-owner-home';
import { CorePrincipalHome } from '@/components/dashboard/core-principal-home';
import { PrincipalOperationsDashboard } from '@/components/dashboard/principal-operations-dashboard';
import { SchoolOwnerDashboard } from '@/components/dashboard/school-owner-dashboard';
import { PageBody } from '@/components/school/school-shell';
import { ClassTeacherDashboard } from '@/components/staff/class-teacher-dashboard';
import { AdminOfficerDashboard } from '@/components/staff/admin-officer-dashboard';
import { TeacherLanding } from '@/components/staff/teacher-landing';
import { useAuth } from '@/lib/auth/auth-context';
import { homePathForRole } from '@/lib/auth/home-path';
import { resolveSchoolDashboardVariant } from '@/lib/auth/school-dashboard-resolver';
import { isExamOfficerRole } from '@/lib/auth/is-exam-officer';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

const PAGE_BODY_CLASS = 'max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7';

export default function SchoolDashboardPage() {
  const { session } = useAuth();
  const router = useRouter();
  const tenantId = session?.tenantId ?? '';
  const role = session?.role;
  const { isCore, financeMode, experienceTier, flags, isLoading: experienceLoading } = useTenantExperience();
  const variant = resolveSchoolDashboardVariant(role, isCore);

  useEffect(() => {
    if (!role) return;
    if (isExamOfficerRole(role)) {
      router.replace('/school/exams');
      return;
    }
    if (!experienceLoading && (role === 'accountant' || role === 'cashier')) {
      router.replace(homePathForRole(role, { financeMode, experienceTier, flags }));
      return;
    }
    if (!experienceLoading && !isCore) {
      const financeHome = homePathForRole(role, { financeMode, experienceTier, flags });
      if (financeHome !== '/school/dashboard') {
        router.replace(financeHome);
      }
    }
  }, [role, router, experienceLoading, isCore, financeMode, experienceTier, flags]);

  if (role && isExamOfficerRole(role)) {
    return null;
  }

  if (!experienceLoading && (role === 'accountant' || role === 'cashier')) {
    return null;
  }

  if (!experienceLoading && !isCore && role) {
    const financeHome = homePathForRole(role, { financeMode, experienceTier, flags });
    if (financeHome !== '/school/dashboard') {
      return null;
    }
  }

  if (variant === 'class_teacher') {
    return (
      <PageBody className={PAGE_BODY_CLASS}>
        <ClassTeacherDashboard tenantId={tenantId} displayName={session?.displayName} />
      </PageBody>
    );
  }

  if (variant === 'admin_officer') {
    return (
      <PageBody className={PAGE_BODY_CLASS}>
        <AdminOfficerDashboard tenantId={tenantId} displayName={session?.displayName} />
      </PageBody>
    );
  }

  if (variant === 'teacher') {
    return (
      <PageBody className={PAGE_BODY_CLASS}>
        <TeacherLanding displayName={session?.displayName} />
      </PageBody>
    );
  }

  if (variant === 'core_owner') {
    return (
      <PageBody className={PAGE_BODY_CLASS}>
        <CoreOwnerHome tenantId={tenantId} displayName={session?.displayName} />
      </PageBody>
    );
  }

  if (variant === 'core_principal') {
    return (
      <PageBody className={PAGE_BODY_CLASS}>
        <CorePrincipalHome tenantId={tenantId} displayName={session?.displayName} />
      </PageBody>
    );
  }

  if (variant === 'advanced_owner') {
    return (
      <PageBody className={PAGE_BODY_CLASS}>
        <SchoolOwnerDashboard tenantId={tenantId} displayName={session?.displayName} />
      </PageBody>
    );
  }

  if (variant === 'advanced_principal') {
    return (
      <PageBody className={PAGE_BODY_CLASS}>
        <PrincipalOperationsDashboard tenantId={tenantId} displayName={session?.displayName} />
      </PageBody>
    );
  }

  return (
    <PageBody className={PAGE_BODY_CLASS}>
      <p className="text-sm text-neutral-500">Redirecting to your workspace…</p>
    </PageBody>
  );
}
