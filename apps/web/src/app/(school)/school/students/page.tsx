'use client';

import { useStudents } from '@loomis/api-client';
import { Alert, AlertDescription, Button } from '@loomis/ui-web';
import Link from 'next/link';

import { StudentsTable, StudentsTableSkeleton } from '@/components/student/students-table';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function StudentsRegistryPage() {
  const tenantId = useTenantId();
  const canView = useCanAny(['admissions.manage', 'admissions.approve', 'student.promote']);
  const canManageAdmissions = useCanAny(['admissions.manage', 'admissions.approve']);

  const studentsQuery = useStudents(tenantId ?? '');
  const students = studentsQuery.data?.students ?? [];

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Student registry" />
        <PageBody>
          <p className="text-sm text-destructive">No tenant context. Sign in again.</p>
        </PageBody>
      </>
    );
  }

  if (!canView) {
    return (
      <>
        <PageHeader title="Student registry" />
        <PageBody>
          <Alert>
            <AlertDescription>You do not have permission to view students.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Student registry"
        description="All admitted and enrolled students for this school."
        actions={
          canManageAdmissions ? (
            <Button asChild>
              <Link href="/school/students/admissions">Admissions pipeline</Link>
            </Button>
          ) : null
        }
      />
      <PageBody>
        {studentsQuery.isLoading ? (
          <StudentsTableSkeleton />
        ) : studentsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {(studentsQuery.error as Error).message ?? 'Failed to load students.'}
            </AlertDescription>
          </Alert>
        ) : students.length === 0 ? (
          <Alert>
            <AlertDescription>
              No student records yet.{' '}
              {canManageAdmissions ? (
                <Link href="/school/students/admissions" className="font-medium underline">
                  Register applicants in the admissions pipeline
                </Link>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : (
          <StudentsTable students={students} />
        )}
      </PageBody>
    </>
  );
}
