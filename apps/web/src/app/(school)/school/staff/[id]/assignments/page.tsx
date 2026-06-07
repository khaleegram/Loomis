'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import {
  useAssignClassTeacher,
  useChangeStaffRole,
  useCreateSubjectAssignment,
  useDeactivateStaff,
  useStaffMember,
} from '@loomis/api-client';
import {
  assignClassTeacherRequest,
  changeStaffRoleRequest,
  createSubjectAssignmentRequest,
  deactivateStaffRequest,
  staffPrimaryRole,
  type AssignClassTeacherRequest,
  type ChangeStaffRoleRequest,
  type CreateSubjectAssignmentRequest,
} from '@loomis/contracts';
import { Button } from '@loomis/ui-web';
import type { z } from 'zod';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { FormError, TextField } from '@/components/auth/auth-ui';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const PRIMARY_ROLES = staffPrimaryRole.options;

export default function StaffAssignmentsPage() {
  const params = useParams<{ id: string }>();
  const staffProfileId = params.id;
  const tenantId = useTenantId();

  const canAssignSubject = useCan('subject.assign');
  const canAssignClassTeacher = useCan('classteacher.assign');
  const canChangeRole = useCan('staff.role.assign');
  const canDeactivate = useCan('staff.deactivate');

  const { data: staff, isLoading, isError } = useStaffMember(tenantId ?? '', staffProfileId);

  const changeRole = useChangeStaffRole(tenantId ?? '', staffProfileId);
  const createSubject = useCreateSubjectAssignment(tenantId ?? '');
  const assignClassTeacher = useAssignClassTeacher(tenantId ?? '');
  const deactivate = useDeactivateStaff(tenantId ?? '', staffProfileId);

  const roleForm = useForm<ChangeStaffRoleRequest>({
    resolver: zodResolver(changeStaffRoleRequest),
    defaultValues: { primaryRole: 'teacher' },
  });

  const subjectForm = useForm<CreateSubjectAssignmentRequest>({
    resolver: zodResolver(createSubjectAssignmentRequest),
    defaultValues: {
      staffProfileId,
      termId: '',
      classArmId: '',
      subjectId: '',
    },
  });

  const classTeacherForm = useForm<AssignClassTeacherRequest>({
    resolver: zodResolver(assignClassTeacherRequest),
    defaultValues: {
      staffProfileId,
      termId: '',
      classArmId: '',
    },
  });

  const deactivateForm = useForm<z.input<typeof deactivateStaffRequest>>({
    resolver: zodResolver(deactivateStaffRequest),
    defaultValues: {
      reason: '',
      singletonOverrideConfirmed: false,
    },
  });

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Staff assignments" />
        <PageBody>
          <p className="text-sm text-red-600">No tenant context. Sign in again.</p>
        </PageBody>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Staff assignments" />
        <PageBody>
          <p className="text-sm text-neutral-500">Loading staff profile…</p>
        </PageBody>
      </>
    );
  }

  if (isError || !staff) {
    return (
      <>
        <PageHeader title="Staff assignments" />
        <PageBody>
          <p className="text-sm text-red-600">Staff member not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/school/staff">Back to directory</Link>
          </Button>
        </PageBody>
      </>
    );
  }

  const hasAnyAction =
    canAssignSubject || canAssignClassTeacher || canChangeRole || canDeactivate;

  return (
    <>
      <PageHeader
        title={staff.fullName}
        description={`Role assignments and teaching allocations (US-HRM-002..005).`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/school/staff">Back to directory</Link>
          </Button>
        }
      />
      <PageBody>
        <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Profile</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Primary role</dt>
              <dd className="font-medium text-neutral-900">{formatRoleLabel(staff.primaryRole)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Status</dt>
              <dd className="font-medium capitalize text-neutral-900">{staff.status}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Email</dt>
              <dd className="text-neutral-900">{staff.email}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Phone</dt>
              <dd className="text-neutral-900">{staff.phone ?? '—'}</dd>
            </div>
          </dl>
        </section>

        {!hasAnyAction ? (
          <p className="text-sm text-neutral-500">
            You do not have permission to manage assignments for this staff member.
          </p>
        ) : null}

        {canChangeRole && staff.status === 'active' ? (
          <AssignmentSection title="Change primary role (US-HRM-004)">
            <form
              onSubmit={(e) =>
                void roleForm.handleSubmit(async (values) => {
                  try {
                    await changeRole.mutateAsync(values);
                    roleForm.reset(values);
                  } catch (err) {
                    roleForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Role change failed.',
                    });
                  }
                })(e)
              }
              className="space-y-4"
            >
              <FormError message={roleForm.formState.errors.root?.message ?? null} />
              <div>
                <label htmlFor="newRole" className="mb-1 block text-sm font-medium text-neutral-700">
                  New primary role
                </label>
                <select
                  id="newRole"
                  className="block w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  {...roleForm.register('primaryRole')}
                >
                  {PRIMARY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={changeRole.isPending} size="sm">
                {changeRole.isPending ? 'Saving…' : 'Change role'}
              </Button>
            </form>
          </AssignmentSection>
        ) : null}

        {canAssignSubject && staff.status === 'active' ? (
          <AssignmentSection title="Assign subject (US-HRM-002)">
            <form
              onSubmit={(e) =>
                void subjectForm.handleSubmit(async (values) => {
                  try {
                    await createSubject.mutateAsync({ ...values, staffProfileId });
                    subjectForm.reset({ staffProfileId, termId: '', classArmId: '', subjectId: '' });
                  } catch (err) {
                    subjectForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Assignment failed.',
                    });
                  }
                })(e)
              }
              className="space-y-4"
            >
              <FormError message={subjectForm.formState.errors.root?.message ?? null} />
              <TextField
                label="Term ID"
                error={subjectForm.formState.errors.termId?.message}
                {...subjectForm.register('termId')}
              />
              <TextField
                label="Class arm ID"
                error={subjectForm.formState.errors.classArmId?.message}
                {...subjectForm.register('classArmId')}
              />
              <TextField
                label="Subject ID"
                error={subjectForm.formState.errors.subjectId?.message}
                {...subjectForm.register('subjectId')}
              />
              <Button type="submit" disabled={createSubject.isPending} size="sm">
                {createSubject.isPending ? 'Assigning…' : 'Assign subject'}
              </Button>
            </form>
          </AssignmentSection>
        ) : null}

        {canAssignClassTeacher && staff.status === 'active' ? (
          <AssignmentSection title="Assign class teacher (US-HRM-003)">
            <form
              onSubmit={(e) =>
                void classTeacherForm.handleSubmit(async (values) => {
                  try {
                    await assignClassTeacher.mutateAsync({ ...values, staffProfileId });
                    classTeacherForm.reset({ staffProfileId, termId: '', classArmId: '' });
                  } catch (err) {
                    classTeacherForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Assignment failed.',
                    });
                  }
                })(e)
              }
              className="space-y-4"
            >
              <FormError message={classTeacherForm.formState.errors.root?.message ?? null} />
              <TextField
                label="Term ID"
                error={classTeacherForm.formState.errors.termId?.message}
                {...classTeacherForm.register('termId')}
              />
              <TextField
                label="Class arm ID"
                error={classTeacherForm.formState.errors.classArmId?.message}
                {...classTeacherForm.register('classArmId')}
              />
              <Button type="submit" disabled={assignClassTeacher.isPending} size="sm">
                {assignClassTeacher.isPending ? 'Assigning…' : 'Assign class teacher'}
              </Button>
            </form>
          </AssignmentSection>
        ) : null}

        {canDeactivate && staff.status === 'active' ? (
          <AssignmentSection title="Deactivate staff (US-HRM-005)">
            <form
              onSubmit={(e) =>
                void deactivateForm.handleSubmit(async (values) => {
                  try {
                    await deactivate.mutateAsync(deactivateStaffRequest.parse(values));
                  } catch (err) {
                    deactivateForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Deactivation failed.',
                    });
                  }
                })(e)
              }
              className="space-y-4"
            >
              <FormError message={deactivateForm.formState.errors.root?.message ?? null} />
              <TextField
                label="Reason"
                error={deactivateForm.formState.errors.reason?.message}
                {...deactivateForm.register('reason')}
              />
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" {...deactivateForm.register('singletonOverrideConfirmed')} />
                I confirm a deputy or replacement is available for singleton roles
              </label>
              <Button type="submit" variant="destructive" disabled={deactivate.isPending} size="sm">
                {deactivate.isPending ? 'Deactivating…' : 'Deactivate staff member'}
              </Button>
            </form>
          </AssignmentSection>
        ) : null}
      </PageBody>
    </>
  );
}

function AssignmentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}
