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
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@loomis/ui-web';
import type { z } from 'zod';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const PRIMARY_ROLES = staffPrimaryRole.options;

function RootFormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

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
          <Alert variant="destructive">
            <AlertDescription>No tenant context. Sign in again.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Staff assignments" />
        <PageBody>
          <Skeleton className="h-32 w-full" />
        </PageBody>
      </>
    );
  }

  if (isError || !staff) {
    return (
      <>
        <PageHeader title="Staff assignments" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>Staff member not found.</AlertDescription>
          </Alert>
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
        description="Role assignments and teaching allocations (US-HRM-002..005)."
        actions={
          <Button variant="outline" asChild>
            <Link href="/school/staff">Back to directory</Link>
          </Button>
        }
      />
      <PageBody>
        <Card className="mb-8 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Primary role</dt>
                <dd className="font-medium">{formatRoleLabel(staff.primaryRole)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize">{staff.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd>{staff.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{staff.phone ?? '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {!hasAnyAction ? (
          <p className="text-sm text-muted-foreground">
            You do not have permission to manage assignments for this staff member.
          </p>
        ) : null}

        {canChangeRole && staff.status === 'active' ? (
          <AssignmentSection title="Change primary role (US-HRM-004)">
            <Form {...roleForm}>
              <form
                onSubmit={roleForm.handleSubmit(async (values) => {
                  try {
                    await changeRole.mutateAsync(values);
                    roleForm.reset(values);
                  } catch (err) {
                    roleForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Role change failed.',
                    });
                  }
                })}
                className="space-y-4"
              >
                <RootFormError message={roleForm.formState.errors.root?.message} />
                <FormField
                  control={roleForm.control}
                  name="primaryRole"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>New primary role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIMARY_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {formatRoleLabel(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={changeRole.isPending} size="sm">
                  {changeRole.isPending ? 'Saving…' : 'Change role'}
                </Button>
              </form>
            </Form>
          </AssignmentSection>
        ) : null}

        {canAssignSubject && staff.status === 'active' ? (
          <AssignmentSection title="Assign subject (US-HRM-002)">
            <Form {...subjectForm}>
              <form
                onSubmit={subjectForm.handleSubmit(async (values) => {
                  try {
                    await createSubject.mutateAsync({ ...values, staffProfileId });
                    subjectForm.reset({ staffProfileId, termId: '', classArmId: '', subjectId: '' });
                  } catch (err) {
                    subjectForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Assignment failed.',
                    });
                  }
                })}
                className="space-y-4"
              >
                <RootFormError message={subjectForm.formState.errors.root?.message} />
                {(['termId', 'classArmId', 'subjectId'] as const).map((name) => (
                  <FormField
                    key={name}
                    control={subjectForm.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {name === 'termId'
                            ? 'Term ID'
                            : name === 'classArmId'
                              ? 'Class arm ID'
                              : 'Subject ID'}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button type="submit" disabled={createSubject.isPending} size="sm">
                  {createSubject.isPending ? 'Assigning…' : 'Assign subject'}
                </Button>
              </form>
            </Form>
          </AssignmentSection>
        ) : null}

        {canAssignClassTeacher && staff.status === 'active' ? (
          <AssignmentSection title="Assign class teacher (US-HRM-003)">
            <Form {...classTeacherForm}>
              <form
                onSubmit={classTeacherForm.handleSubmit(async (values) => {
                  try {
                    await assignClassTeacher.mutateAsync({ ...values, staffProfileId });
                    classTeacherForm.reset({ staffProfileId, termId: '', classArmId: '' });
                  } catch (err) {
                    classTeacherForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Assignment failed.',
                    });
                  }
                })}
                className="space-y-4"
              >
                <RootFormError message={classTeacherForm.formState.errors.root?.message} />
                {(['termId', 'classArmId'] as const).map((name) => (
                  <FormField
                    key={name}
                    control={classTeacherForm.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{name === 'termId' ? 'Term ID' : 'Class arm ID'}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button type="submit" disabled={assignClassTeacher.isPending} size="sm">
                  {assignClassTeacher.isPending ? 'Assigning…' : 'Assign class teacher'}
                </Button>
              </form>
            </Form>
          </AssignmentSection>
        ) : null}

        {canDeactivate && staff.status === 'active' ? (
          <AssignmentSection title="Deactivate staff (US-HRM-005)">
            <Form {...deactivateForm}>
              <form
                onSubmit={deactivateForm.handleSubmit(async (values) => {
                  try {
                    await deactivate.mutateAsync(deactivateStaffRequest.parse(values));
                  } catch (err) {
                    deactivateForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Deactivation failed.',
                    });
                  }
                })}
                className="space-y-4"
              >
                <RootFormError message={deactivateForm.formState.errors.root?.message} />
                <FormField
                  control={deactivateForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={deactivateForm.control}
                  name="singletonOverrideConfirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal leading-snug">
                        I confirm a deputy or replacement is available for singleton roles
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="destructive" disabled={deactivate.isPending} size="sm">
                  {deactivate.isPending ? 'Deactivating…' : 'Deactivate staff member'}
                </Button>
              </form>
            </Form>
          </AssignmentSection>
        ) : null}
      </PageBody>
    </>
  );
}

function AssignmentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="mb-6 shadow-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
