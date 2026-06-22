'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import {
  useAcademicTerms,
  useAcademicYears,
  useAssignClassTeacher,
  useChangeStaffRole,
  useClassStructure,
  useCreateSubjectAssignment,
  useDeactivateStaff,
  useDesignateBackup,
  useReactivateStaff,
  useRemoveSubjectAssignment,
  useResendStaffInvitation,
  useStaffDirectory,
  useStaffMember,
  useWorkflowInbox,
} from '@loomis/api-client';
import {
  assignClassTeacherRequest,
  changeStaffRoleRequest,
  createSubjectAssignmentRequest,
  deactivateStaffRequest,
  designateBackupRequest,
  reactivateStaffRequest,
  staffPrimaryRole,
  type AssignClassTeacherRequest,
  type CreateSubjectAssignmentRequest,
  type DesignateBackupRequest,
  type StaffDetailResponse,
} from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@loomis/ui-web';
import type { z } from 'zod';

import { BookOpen, Briefcase, Shield, UserCog } from 'lucide-react';

import { SEMANTIC, SURFACES } from '@/lib/design/surfaces';
import { formatRoleLabel } from '@/components/school/school-nav-config';
import { SodNotice } from '@/components/school/sod-notice';
import {
  formatStaffDisplayRole,
  formatStaffExtensionLabels,
} from '@/lib/staff/staff-labels';
import { useCan, useCanAny, useRole } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { DeactivationImpactPreview } from '@/components/staff/staff-deactivation-preview';
import { CoreInlineWorkflowDecision } from '@/components/workflow/core-inline-workflow-decision';
import { WorkloadOverview } from '@/components/staff/staff-workload-overview';

const PRIMARY_ROLES = staffPrimaryRole.options;
const BACKUP_ROLES = ['accountant', 'cashier', 'exam_officer'] as const;

function RootFormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="card rounded-2xl p-4 sm:p-6">
      <h3 className="text-[13px] font-bold text-neutral-800">{title}</h3>
      {description ? <p className="mt-1 text-[12px] text-neutral-400">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

interface StaffMemberDetailProps {
  staffProfileId: string;
  staff?: StaffDetailResponse;
}

export function StaffMemberDetail({ staffProfileId, staff: staffProp }: StaffMemberDetailProps) {
  const tenantId = useTenantId();
  const role = useRole();

  const canOnboard = useCan('staff.onboard');
  const canAssignSubject = useCan('subject.assign');
  const canAssignClassTeacher = useCan('classteacher.assign');
  const canChangeRole = useCanAny(['staff.role.assign', 'staff.role.request']);
  const canDeactivate = useCan('staff.deactivate');

  const { data: fetchedStaff, isLoading, isError, refetch } = useStaffMember(
    tenantId ?? '',
    staffProfileId,
  );
  const staff = fetchedStaff ?? staffProp;
  const { data: directoryData } = useStaffDirectory(tenantId ?? '');
  const inboxQuery = useWorkflowInbox(tenantId ?? '');
  const [roleChangeSubmitted, setRoleChangeSubmitted] = useState(false);

  const pendingRoleChange = useMemo(
    () =>
      inboxQuery.data?.items.find(
        (item) =>
          item.instance.workflowType === 'staff_role_change' &&
          item.instance.subjectId === staffProfileId,
      ) ?? null,
    [inboxQuery.data?.items, staffProfileId],
  );

  const singletonRoleLabel = useMemo(() => {
    if (!staff?.primaryRole || !directoryData?.staff) return null;
    const critical = ['school_owner', 'principal', 'accountant', 'exam_officer'] as const;
    if (!critical.includes(staff.primaryRole as (typeof critical)[number])) return null;
    const activeSameRole = directoryData.staff.filter(
      (member) => member.status === 'active' && member.primaryRole === staff.primaryRole,
    ).length;
    return activeSameRole <= 1 ? formatRoleLabel(staff.primaryRole) : null;
  }, [directoryData?.staff, staff?.primaryRole]);

  const changeRole = useChangeStaffRole(tenantId ?? '', staffProfileId);
  const createSubject = useCreateSubjectAssignment(tenantId ?? '');
  const removeSubject = useRemoveSubjectAssignment(tenantId ?? '', staffProfileId);
  const assignClassTeacher = useAssignClassTeacher(tenantId ?? '');
  const deactivate = useDeactivateStaff(tenantId ?? '', staffProfileId);
  const reactivate = useReactivateStaff(tenantId ?? '', staffProfileId);
  const resendInvitation = useResendStaffInvitation(tenantId ?? '', staffProfileId);
  const designateBackup = useDesignateBackup(tenantId ?? '', staffProfileId);

  const { data: yearsData } = useAcademicYears(tenantId ?? '');
  const activeYear = useMemo(
    () => yearsData?.academicYears?.find((y) => y.status === 'active'),
    [yearsData],
  );
  const { data: termsData } = useAcademicTerms(tenantId ?? '', activeYear?.id ?? '');
  const terms = termsData?.terms ?? [];
  const openTerm = useMemo(() => terms.find((t) => t.status === 'open'), [terms]);
  const { data: classStructureData } = useClassStructure(tenantId ?? '', activeYear?.id ?? '');
  const classArms = classStructureData?.arms ?? [];

  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const activeTermId = selectedTermId ?? openTerm?.id ?? terms[0]?.id ?? null;

  const termOptions = useMemo(
    () => terms.map((term) => ({ value: term.id, label: term.name ?? 'Term' })),
    [terms],
  );
  const classArmOptions = useMemo(
    () => classArms.map((arm) => ({ value: arm.id, label: arm.name })),
    [classArms],
  );

  const activeStaff = useMemo(
    () => (directoryData?.staff ?? []).filter((m) => m.status === 'active' && m.id !== staffProfileId),
    [directoryData?.staff, staffProfileId],
  );

  const roleForm = useForm<z.input<typeof changeStaffRoleRequest>>({
    resolver: zodResolver(changeStaffRoleRequest),
    defaultValues: { primaryRole: 'teacher', singletonOverrideConfirmed: false },
  });

  const subjectForm = useForm<CreateSubjectAssignmentRequest>({
    resolver: zodResolver(createSubjectAssignmentRequest),
    defaultValues: { staffProfileId, termId: '', classArmId: '', subjectId: '' },
  });

  const classTeacherForm = useForm<AssignClassTeacherRequest>({
    resolver: zodResolver(assignClassTeacherRequest),
    defaultValues: { staffProfileId, termId: '', classArmId: '' },
  });

  const deactivateForm = useForm<z.input<typeof deactivateStaffRequest>>({
    resolver: zodResolver(deactivateStaffRequest),
    defaultValues: { reason: '', singletonOverrideConfirmed: false },
  });

  const reactivateForm = useForm<z.infer<typeof reactivateStaffRequest>>({
    resolver: zodResolver(reactivateStaffRequest),
    defaultValues: { reason: '' },
  });

  const backupForm = useForm<DesignateBackupRequest>({
    resolver: zodResolver(designateBackupRequest),
    defaultValues: {
      primaryStaffProfileId: staffProfileId,
      backupStaffProfileId: '',
      role: 'exam_officer',
    },
  });

  const [showDeactivationPreview, setShowDeactivationPreview] = useState(false);

  if (!tenantId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No tenant context. Sign in again.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading && !staff) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if ((isError && !staffProp) || !staff) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Staff member not found.</AlertDescription>
      </Alert>
    );
  }

  const invitationExpired =
    staff.pendingInvitation != null && new Date(staff.pendingInvitation.expiresAt) <= new Date();

  const assignmentCount =
    staff.subjectAssignments.length + staff.classTeacherAssignments.length;

  return (
    <Tabs defaultValue="overview" className="space-y-5">
      {/* Premium tab bar */}
      <div className="overflow-x-auto">
        <TabsList className="inline-flex h-auto gap-1 rounded-xl border border-brand-100 bg-brand-50/30 p-1">
          <TabsTrigger
            value="overview"
            className="shrink-0 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm sm:py-2"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="role"
            className="shrink-0 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm sm:py-2"
          >
            Role &amp; Access
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="shrink-0 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm sm:py-2"
          >
            Assignments
          </TabsTrigger>
          <TabsTrigger
            value="workload"
            className="shrink-0 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm sm:py-2"
          >
            Workload
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card group rounded-2xl p-5 transition-all duration-300 hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <span
                className="flex size-9 items-center justify-center rounded-xl text-white"
                style={{ background: SURFACES.kpi.g1 }}
              >
                <Briefcase aria-hidden className="size-4" />
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Primary role</p>
            <p className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
              {formatStaffDisplayRole(staff.primaryRole, staff.roleExtensions)}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              {(() => {
                const extensionLabels = formatStaffExtensionLabels(
                  staff.roleExtensions,
                  staff.primaryRole,
                );
                if (extensionLabels) return `+${extensionLabels}`;
                if (staff.roleExtensions.length === 0) return 'No extensions';
                return null;
              })()}
            </p>
          </div>

          <div className="card group rounded-2xl p-5 transition-all duration-300 hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <span
                className="flex size-9 items-center justify-center rounded-xl text-white"
                style={{ background: SURFACES.kpi.g3 }}
              >
                <BookOpen aria-hidden className="size-4" />
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Active assignments</p>
            <p className="mt-1 text-xl font-extrabold tracking-tight tabular-nums text-neutral-900">
              {assignmentCount}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              {staff.subjectAssignments.length} subject · {staff.classTeacherAssignments.length} class
            </p>
          </div>

          <div className="card group rounded-2xl p-5 transition-all duration-300 hover:shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <span
                className="flex size-9 items-center justify-center rounded-xl text-white"
                style={{ background: SURFACES.kpi.g2 }}
              >
                <Shield aria-hidden className="size-4" />
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Account status</p>
            <p className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
              {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              {staff.joinedAt
                ? `Joined ${new Date(staff.joinedAt).toLocaleDateString()}`
                : staff.status === 'pending'
                  ? 'Awaiting invitation'
                  : 'No join date'}
            </p>
          </div>
        </div>
      </TabsContent>

      {/* Role & Access Tab */}
      <TabsContent value="role" className="space-y-4">
        {/* Pending invitation */}
        {staff.status === 'pending' && staff.pendingInvitation ? (
          <SectionCard
            title="Pending invitation"
            description={
              invitationExpired
                ? 'This invitation has expired. Resend to issue a new 48-hour setup link.'
                : `Expires ${new Date(staff.pendingInvitation.expiresAt).toLocaleString()}`
            }
          >
            {canOnboard ? (
              <Button
                size="sm"
                variant="gradient"
                disabled={resendInvitation.isPending}
                onClick={async () => {
                  try {
                    await resendInvitation.mutateAsync(staff.pendingInvitation!.id);
                    await refetch();
                  } catch (err) {}
                }}
              >
                {resendInvitation.isPending ? 'Resending…' : 'Resend invitation'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">You do not have permission to resend invitations.</p>
            )}
          </SectionCard>
        ) : null}

        {/* Owner one-tap role change approval (Core Sprint 5) */}
        {role === 'school_owner' && pendingRoleChange && tenantId ? (
          <SectionCard
            title="Role change awaiting your approval"
            description="Principal submitted this change — approve or reject inline."
          >
            <SodNotice compact highlight="Finalize staff role change" />
            <CoreInlineWorkflowDecision
              tenantId={tenantId}
              item={pendingRoleChange}
              onDecided={() => {
                void inboxQuery.refetch();
                void refetch();
              }}
            />
          </SectionCard>
        ) : null}

        {/* Change role */}
        {canChangeRole && staff.status === 'active' ? (
          <SectionCard
            title="Change primary role"
            description={
              role === 'principal'
                ? 'Submits to the school owner for one-tap approval in Core.'
                : 'Role changes will invalidate active sessions.'
            }
          >
            {role === 'principal' && (roleChangeSubmitted || pendingRoleChange) ? (
              <Alert>
                <AlertDescription>
                  Role change submitted — waiting for the school owner to approve.
                </AlertDescription>
              </Alert>
            ) : null}
            {role === 'principal' ? (
              <SodNotice compact highlight="Initiate staff role change" />
            ) : null}
            <Form {...roleForm}>
              <form
                onSubmit={roleForm.handleSubmit(async (values) => {
                  try {
                    const result = await changeRole.mutateAsync(
                      changeStaffRoleRequest.parse(values),
                    );
                    if (
                      result &&
                      typeof result === 'object' &&
                      'status' in result &&
                      result.status === 'pending'
                    ) {
                      setRoleChangeSubmitted(true);
                      await inboxQuery.refetch();
                    } else {
                      setRoleChangeSubmitted(false);
                      roleForm.reset(values);
                    }
                    await refetch();
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                <Button type="submit" disabled={changeRole.isPending} size="sm" variant="gradient">
                  {changeRole.isPending
                    ? 'Saving…'
                    : role === 'principal'
                      ? 'Submit for owner approval'
                      : 'Change role'}
                </Button>
              </form>
            </Form>
          </SectionCard>
        ) : null}

        {/* Backup designation */}
        {canChangeRole && staff.status === 'active' ? (
          <SectionCard
            title="Backup designation"
            description="Assign a backup for singleton roles before deactivating critical staff."
          >
            <Form {...backupForm}>
              <form
                onSubmit={backupForm.handleSubmit(async (values) => {
                  try {
                    await designateBackup.mutateAsync({
                      ...values,
                      primaryStaffProfileId: staffProfileId,
                    });
                    backupForm.reset({
                      primaryStaffProfileId: staffProfileId,
                      backupStaffProfileId: '',
                      role: 'exam_officer',
                    });
                  } catch (err) {
                    backupForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Backup designation failed.',
                    });
                  }
                })}
                className="space-y-4"
              >
                <RootFormError message={backupForm.formState.errors.root?.message} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={backupForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Singleton role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BACKUP_ROLES.map((role) => (
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
                  <FormField
                    control={backupForm.control}
                    name="backupStaffProfileId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Backup staff member</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select backup" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activeStaff.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.fullName} ({formatRoleLabel(member.primaryRole)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={designateBackup.isPending} size="sm" variant="gradient">
                  {designateBackup.isPending ? 'Saving…' : 'Designate backup'}
                </Button>
              </form>
            </Form>
          </SectionCard>
        ) : null}

        {/* Deactivation */}
        {canDeactivate && staff.status === 'active' ? (
          <SectionCard
            title="Deactivate staff"
            description="Deactivation revokes all sessions. Historical records are preserved."
          >
            {/* Impact Preview */}
            {showDeactivationPreview ? (
              <div className="mb-4">
                <DeactivationImpactPreview staff={staff} singletonRoleLabel={singletonRoleLabel} />
              </div>
            ) : null}

            <Form {...deactivateForm}>
              <form
                onSubmit={deactivateForm.handleSubmit(async (values) => {
                  try {
                    await deactivate.mutateAsync(deactivateStaffRequest.parse(values));
                    await refetch();
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
                        No replacement yet — I understand this critical role may be left vacant and
                        will assign coverage soon
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeactivationPreview(!showDeactivationPreview)}
                  >
                    {showDeactivationPreview ? 'Hide impact preview' : 'Show impact preview'}
                  </Button>
                  <Button type="submit" variant="destructive" disabled={deactivate.isPending} size="sm">
                    {deactivate.isPending ? 'Deactivating…' : 'Deactivate staff member'}
                  </Button>
                </div>
              </form>
            </Form>
          </SectionCard>
        ) : null}

        {/* Reactivation */}
        {canChangeRole && staff.status === 'deactivated' ? (
          <SectionCard
            title="Reactivate staff"
            description="Reactivation restores login access. Previous role assignments are not restored automatically."
          >
            <Form {...reactivateForm}>
              <form
                onSubmit={reactivateForm.handleSubmit(async (values) => {
                  try {
                    await reactivate.mutateAsync(values);
                    await refetch();
                  } catch (err) {
                    reactivateForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Reactivation failed.',
                    });
                  }
                })}
                className="space-y-4"
              >
                <RootFormError message={reactivateForm.formState.errors.root?.message} />
                <FormField
                  control={reactivateForm.control}
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
                <Button type="submit" disabled={reactivate.isPending} size="sm" variant="gradient">
                  {reactivate.isPending ? 'Reactivating…' : 'Reactivate staff member'}
                </Button>
              </form>
            </Form>
          </SectionCard>
        ) : null}
      </TabsContent>

      {/* Assignments Tab */}
      <TabsContent value="assignments" className="space-y-4">
        {/* Current Assignments */}
        {(staff.subjectAssignments.length > 0 || staff.classTeacherAssignments.length > 0) ? (
          <SectionCard title="Current assignments" description="Active teaching allocations for this term.">
            {staff.subjectAssignments.length > 0 ? (
              <div className="mb-6">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                  Subject Assignments
                </p>
                <div className="space-y-2">
                  {staff.subjectAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex flex-col gap-3 rounded-xl border border-brand-50 bg-brand-50/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-accent-purple-100 text-accent-purple-600">
                          <BookOpen aria-hidden className="size-4" />
                        </span>
                        <div>
                          <p className="text-[13px] font-semibold text-neutral-800">
                            {assignment.subjectId.slice(0, 8)}…
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            {classArms.find((a) => a.id === assignment.classArmId)?.name ?? 'Class'} · Term {assignment.termId.slice(0, 8)}…
                          </p>
                        </div>
                      </div>
                      {canAssignSubject ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 text-[11px] ${SEMANTIC.danger.button}`}
                          disabled={removeSubject.isPending}
                          onClick={async () => {
                            const reason = window.prompt('Reason for removing this assignment:');
                            if (!reason || reason.length < 3) return;
                            await removeSubject.mutateAsync({ assignmentId: assignment.id, reason });
                            await refetch();
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {staff.classTeacherAssignments.length > 0 ? (
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                  Class Teacher
                </p>
                <div className="space-y-2">
                  {staff.classTeacherAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 rounded-xl border border-brand-50 bg-brand-50/10 px-4 py-3"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <Shield aria-hidden className="size-4" />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-800">
                          {classArms.find((a) => a.id === assignment.classArmId)?.name ?? assignment.classArmId}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          Term {assignment.termId.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <div className="card rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
            <p className="text-[13px] font-medium text-neutral-400">No active assignments for this staff member.</p>
            <p className="mt-1 text-[12px] text-neutral-300">
              Assign subjects or class teacher duties below.
            </p>
          </div>
        )}

        {/* Assign Subject */}
        {canAssignSubject && staff.status === 'active' ? (
          <SectionCard title="Assign subject" description="Assign this teacher to a subject and class arm for a term.">
            <div className="mb-4 max-w-xs">
              <Label>Term</Label>
              <Select
                value={activeTermId ?? ''}
                onValueChange={(v) => setSelectedTermId(v)}
                disabled={termOptions.length === 0}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {termOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Form {...subjectForm}>
              <form
                onSubmit={subjectForm.handleSubmit(async (values) => {
                  try {
                    await createSubject.mutateAsync({
                      ...values,
                      staffProfileId,
                      termId: values.termId || activeTermId || '',
                    });
                    subjectForm.reset({ staffProfileId, termId: '', classArmId: '', subjectId: '' });
                    await refetch();
                  } catch (err) {
                    subjectForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Assignment failed.',
                    });
                  }
                })}
                className="space-y-4"
              >
                <RootFormError message={subjectForm.formState.errors.root?.message} />
                <FormField
                  control={subjectForm.control}
                  name="termId"
                  render={({ field }) => (
                    <input type="hidden" {...field} value={field.value || activeTermId || ''} />
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={subjectForm.control}
                    name="classArmId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class arm</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class arm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classArmOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subjectForm.control}
                    name="subjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Subject UUID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={createSubject.isPending || !activeTermId} size="sm" variant="gradient">
                  {createSubject.isPending ? 'Assigning…' : 'Assign subject'}
                </Button>
              </form>
            </Form>
          </SectionCard>
        ) : null}

        {/* Assign Class Teacher */}
        {canAssignClassTeacher && staff.status === 'active' ? (
          <SectionCard title="Assign class teacher">
            <Form {...classTeacherForm}>
              <form
                onSubmit={classTeacherForm.handleSubmit(async (values) => {
                  try {
                    await assignClassTeacher.mutateAsync({
                      ...values,
                      staffProfileId,
                      termId: values.termId || activeTermId || '',
                    });
                    classTeacherForm.reset({ staffProfileId, termId: '', classArmId: '' });
                    await refetch();
                  } catch (err) {
                    classTeacherForm.setError('root', {
                      message: err instanceof Error ? err.message : 'Assignment failed.',
                    });
                  }
                })}
                className="space-y-4"
              >
                <RootFormError message={classTeacherForm.formState.errors.root?.message} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={classTeacherForm.control}
                    name="termId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || activeTermId || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select term" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {termOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={classTeacherForm.control}
                    name="classArmId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class arm</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class arm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classArmOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={assignClassTeacher.isPending} size="sm" variant="gradient">
                  {assignClassTeacher.isPending ? 'Assigning…' : 'Assign class teacher'}
                </Button>
              </form>
            </Form>
          </SectionCard>
        ) : null}
      </TabsContent>

      {/* Workload Tab */}
      <TabsContent value="workload">
        <WorkloadOverview
          subjectAssignments={staff.subjectAssignments}
          classTeacherAssignments={staff.classTeacherAssignments}
          classArms={classArms}
        />
      </TabsContent>
    </Tabs>
  );
}
