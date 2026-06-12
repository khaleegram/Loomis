'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useAcademicTerms,
  useAcademicYears,
  useAssignClassTeacher,
  useChangeStaffRole,
  useClassStructure,
  useCreateSubjectAssignment,
  useDeactivateStaff,
  useReactivateStaff,
  useRemoveSubjectAssignment,
  useResendStaffInvitation,
  useStaffMember,
} from '@loomis/api-client';
import {
  assignClassTeacherRequest,
  changeStaffRoleRequest,
  createSubjectAssignmentRequest,
  deactivateStaffRequest,
  reactivateStaffRequest,
  staffPrimaryRole,
  type AssignClassTeacherRequest,
  type CreateSubjectAssignmentRequest,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@loomis/ui-web';
import type { z } from 'zod';
import { BookOpen, Briefcase, Mail, ExternalLink, Shield, UserX, UserCheck } from 'lucide-react';
import Link from 'next/link';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { DeactivationImpactPreview } from '@/components/staff/staff-deactivation-preview';
import { SEMANTIC } from '@/lib/design/surfaces';

const PRIMARY_ROLES = staffPrimaryRole.options;

interface StaffQuickActionSheetProps {
  staffProfileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StaffQuickActionSheet({
  staffProfileId,
  open,
  onOpenChange,
  onSuccess,
}: StaffQuickActionSheetProps) {
  const tenantId = useTenantId();

  const canOnboard = useCan('staff.onboard');
  const canAssignSubject = useCan('subject.assign');
  const canAssignClassTeacher = useCan('classteacher.assign');
  const canChangeRole = useCan('staff.role.assign');
  const canDeactivate = useCan('staff.deactivate');

  const { data: staff, isLoading, isError, refetch } = useStaffMember(
    tenantId ?? '',
    staffProfileId ?? '',
  );

  const changeRole = useChangeStaffRole(tenantId ?? '', staffProfileId ?? '');
  const createSubject = useCreateSubjectAssignment(tenantId ?? '');
  const removeSubject = useRemoveSubjectAssignment(tenantId ?? '', staffProfileId ?? '');
  const assignClassTeacher = useAssignClassTeacher(tenantId ?? '');
  const deactivate = useDeactivateStaff(tenantId ?? '', staffProfileId ?? '');
  const reactivate = useReactivateStaff(tenantId ?? '', staffProfileId ?? '');
  const resendInvitation = useResendStaffInvitation(tenantId ?? '', staffProfileId ?? '');

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

  const roleForm = useForm<z.input<typeof changeStaffRoleRequest>>({
    resolver: zodResolver(changeStaffRoleRequest),
    defaultValues: { primaryRole: 'teacher', singletonOverrideConfirmed: false },
  });

  const subjectForm = useForm<CreateSubjectAssignmentRequest>({
    resolver: zodResolver(createSubjectAssignmentRequest),
    defaultValues: { staffProfileId: staffProfileId ?? '', termId: '', classArmId: '', subjectId: '' },
  });

  const classTeacherForm = useForm<AssignClassTeacherRequest>({
    resolver: zodResolver(assignClassTeacherRequest),
    defaultValues: { staffProfileId: staffProfileId ?? '', termId: '', classArmId: '' },
  });

  const deactivateForm = useForm<z.input<typeof deactivateStaffRequest>>({
    resolver: zodResolver(deactivateStaffRequest),
    defaultValues: { reason: '', singletonOverrideConfirmed: false },
  });

  const reactivateForm = useForm<z.infer<typeof reactivateStaffRequest>>({
    resolver: zodResolver(reactivateStaffRequest),
    defaultValues: { reason: '' },
  });

  const [showDeactivationPreview, setShowDeactivationPreview] = useState(false);

  const invitationExpired =
    staff?.pendingInvitation != null && new Date(staff.pendingInvitation.expiresAt) <= new Date();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto border-l border-brand-100/40 bg-white sm:max-w-xl">
        {/* Accessibility */}
        <div className="sr-only">
          <SheetTitle>
            {isLoading ? 'Loading staff details…' : isError || !staff ? 'Error' : staff.fullName}
          </SheetTitle>
          <SheetDescription>
            {isLoading ? 'Please wait' : isError || !staff ? 'Failed to load' : `Quick actions for ${staff.fullName}`}
          </SheetDescription>
        </div>

        {isLoading ? (
          <div className="space-y-6 p-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : isError || !staff ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>Failed to load staff details.</AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <SheetHeader className="text-left">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-bold text-neutral-900">{staff.fullName}</h2>
                  <p className="mt-1 text-[13px] text-neutral-500">
                    {staff.email}{' '}
                    <span className="font-semibold text-brand-700">
                      · {formatRoleLabel(staff.primaryRole)}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 border-brand-200 text-brand-700 hover:bg-brand-50"
                  asChild
                >
                  <Link href={`/school/staff/${staff.id}`} onClick={() => onOpenChange(false)}>
                    <ExternalLink aria-hidden className="size-3.5" />
                    Full Profile
                  </Link>
                </Button>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs defaultValue="role" className="space-y-4">
              <TabsList className="grid h-auto grid-cols-3 gap-1 rounded-xl border border-brand-100 bg-brand-50/30 p-1">
                <TabsTrigger
                  value="role"
                  className="rounded-lg py-2 text-[12px] font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                >
                  <Briefcase aria-hidden className="mr-1.5 size-3" />
                  Role
                </TabsTrigger>
                <TabsTrigger
                  value="assignments"
                  className="rounded-lg py-2 text-[12px] font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                >
                  <BookOpen aria-hidden className="mr-1.5 size-3" />
                  Assign
                </TabsTrigger>
                <TabsTrigger
                  value="status"
                  className="rounded-lg py-2 text-[12px] font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                >
                  <Shield aria-hidden className="mr-1.5 size-3" />
                  Status
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Role & Access */}
              <TabsContent value="role" className="space-y-4 pt-2">
                {canChangeRole && staff.status === 'active' ? (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/10 p-5 space-y-4">
                    <div>
                      <h3 className="text-[13px] font-bold text-neutral-800">Change Primary Role</h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Role changes will invalidate active sessions.</p>
                    </div>
                    <Form {...roleForm}>
                      <form
                        onSubmit={roleForm.handleSubmit(async (values) => {
                          try {
                            await changeRole.mutateAsync(changeStaffRoleRequest.parse(values));
                            roleForm.reset(values);
                            await refetch();
                            onSuccess?.();
                          } catch (err) {
                            roleForm.setError('root', {
                              message: err instanceof Error ? err.message : 'Role change failed.',
                            });
                          }
                        })}
                        className="space-y-4"
                      >
                        {roleForm.formState.errors.root?.message && (
                          <Alert variant="destructive">
                            <AlertDescription>{roleForm.formState.errors.root.message}</AlertDescription>
                          </Alert>
                        )}
                        <FormField
                          control={roleForm.control}
                          name="primaryRole"
                          render={({ field }) => (
                            <FormItem className="max-w-xs">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="border-brand-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {PRIMARY_ROLES.map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {formatRoleLabel(r)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={changeRole.isPending} size="sm" variant="gradient">
                          {changeRole.isPending ? 'Saving…' : 'Change role'}
                        </Button>
                      </form>
                    </Form>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center">
                    <Briefcase aria-hidden className="mx-auto size-6 text-neutral-200" />
                    <p className="mt-2 text-[13px] font-medium text-neutral-400">Role changes only available for active accounts.</p>
                  </div>
                )}
              </TabsContent>

              {/* Tab 2: Assignments */}
              <TabsContent value="assignments" className="space-y-4 pt-2">
                {/* Active Allocations */}
                <div className="space-y-3">
                  <h3 className="text-[13px] font-bold text-neutral-800">Current Allocations</h3>
                  {staff.subjectAssignments.length === 0 && staff.classTeacherAssignments.length === 0 ? (
                    <p className="text-[12px] text-neutral-400">No active assignments for this staff member.</p>
                  ) : (
                    <div className="space-y-2">
                      {staff.subjectAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between rounded-xl border border-brand-50 bg-brand-50/10 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen aria-hidden className="size-4 text-accent-purple-500" />
                            <div>
                              <p className="text-[12px] font-semibold text-neutral-800">Subject</p>
                              <p className="text-[11px] text-neutral-400">
                                {classArms.find((a) => a.id === assignment.classArmId)?.name ?? 'Class'} · {assignment.subjectId}
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
                                onSuccess?.();
                              }}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      ))}
                      {staff.classTeacherAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between rounded-xl border border-brand-50 bg-brand-50/10 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <Shield aria-hidden className="size-4 text-blue-500" />
                            <div>
                              <p className="text-[12px] font-semibold text-neutral-800">Class Teacher</p>
                              <p className="text-[11px] text-neutral-400">
                                {classArms.find((a) => a.id === assignment.classArmId)?.name ?? 'Class'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-neutral-400">Manage in profile</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Assign */}
                {staff.status === 'active' && (canAssignSubject || canAssignClassTeacher) ? (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/10 p-5 space-y-4">
                    <div>
                      <h3 className="text-[13px] font-bold text-neutral-800">Quick Academic Allocation</h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Assign a subject and class arm for the active term.</p>
                    </div>

                    <div className="max-w-xs">
                      <FormLabel>Term</FormLabel>
                      <Select
                        value={activeTermId ?? ''}
                        onValueChange={(v) => setSelectedTermId(v)}
                        disabled={termOptions.length === 0}
                      >
                        <SelectTrigger className="mt-1.5 border-brand-200 h-9 text-[12px]">
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

                    {canAssignSubject && (
                      <Form {...subjectForm}>
                        <form
                          onSubmit={subjectForm.handleSubmit(async (values) => {
                            try {
                              await createSubject.mutateAsync({
                                ...values,
                                staffProfileId: staff.id,
                                termId: values.termId || activeTermId || '',
                              });
                              subjectForm.reset({ staffProfileId: staff.id, termId: '', classArmId: '', subjectId: '' });
                              await refetch();
                              onSuccess?.();
                            } catch (err) {
                              subjectForm.setError('root', {
                                message: err instanceof Error ? err.message : 'Assignment failed.',
                              });
                            }
                          })}
                          className="space-y-3"
                        >
                          {subjectForm.formState.errors.root?.message && (
                            <Alert variant="destructive">
                              <AlertDescription>{subjectForm.formState.errors.root.message}</AlertDescription>
                            </Alert>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={subjectForm.control}
                              name="classArmId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[11px]">Class Arm</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="border-brand-200 h-9 text-[12px]">
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
                                  <FormLabel className="text-[11px]">Subject ID</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Subject UUID"
                                      className="border-brand-200 h-9 text-[12px]"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button type="submit" disabled={createSubject.isPending || !activeTermId} size="sm" variant="gradient">
                            {createSubject.isPending ? 'Assigning…' : 'Assign Subject'}
                          </Button>
                        </form>
                      </Form>
                    )}
                  </div>
                ) : null}
              </TabsContent>

              {/* Tab 3: Account Status */}
              <TabsContent value="status" className="space-y-4 pt-2">
                {/* Pending Invitation */}
                {staff.status === 'pending' && staff.pendingInvitation ? (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/10 p-5 space-y-4">
                    <div>
                      <h3 className="text-[13px] font-bold text-neutral-800">Pending Invitation</h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {invitationExpired
                          ? 'This invitation has expired. Resend to issue a new 48-hour setup link.'
                          : `Expires ${new Date(staff.pendingInvitation.expiresAt).toLocaleString()}`}
                      </p>
                    </div>
                    {canOnboard ? (
                      <Button
                        size="sm"
                        variant="gradient"
                        disabled={resendInvitation.isPending}
                        onClick={async () => {
                          try {
                            await resendInvitation.mutateAsync(staff.pendingInvitation!.id);
                            await refetch();
                            onSuccess?.();
                          } catch (err) {}
                        }}
                      >
                        <Mail aria-hidden className="mr-1.5 size-3" />
                        {resendInvitation.isPending ? 'Resending…' : 'Resend invitation'}
                      </Button>
                    ) : (
                      <p className="text-sm text-neutral-400">You do not have permission to resend invitations.</p>
                    )}
                  </div>
                ) : null}

                {/* Deactivate */}
                {canDeactivate && staff.status === 'active' ? (
                  <div className="space-y-4">
                    <div className={`rounded-2xl border p-5 space-y-4 ${SEMANTIC.danger.surfaceSubtle}`}>
                      <div>
                        <h3 className={`text-[13px] font-bold ${SEMANTIC.danger.textStrong}`}>Deactivate Account</h3>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Deactivation revokes all sessions. Historical records are preserved.</p>
                      </div>
                      <Form {...deactivateForm}>
                        <form
                          onSubmit={deactivateForm.handleSubmit(async (values) => {
                            try {
                              await deactivate.mutateAsync(deactivateStaffRequest.parse(values));
                              await refetch();
                              onSuccess?.();
                            } catch (err) {
                              deactivateForm.setError('root', {
                                message: err instanceof Error ? err.message : 'Deactivation failed.',
                              });
                            }
                          })}
                          className="space-y-4"
                        >
                          {deactivateForm.formState.errors.root?.message && (
                            <Alert variant="destructive">
                              <AlertDescription>{deactivateForm.formState.errors.root.message}</AlertDescription>
                            </Alert>
                          )}
                          <FormField
                            control={deactivateForm.control}
                            name="reason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[11px]">Reason</FormLabel>
                                <FormControl>
                                  <Input className="border-neutral-200" {...field} />
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
                                <FormLabel className="text-[12px] font-normal leading-snug text-neutral-600">
                                  No replacement yet — I understand this critical role may be left
                                  vacant and will assign coverage soon
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeactivationPreview(!showDeactivationPreview)}
                            >
                              {showDeactivationPreview ? 'Hide impact' : 'Show impact'}
                            </Button>
                            <Button type="submit" variant="destructive" disabled={deactivate.isPending} size="sm">
                              <UserX aria-hidden className="mr-1.5 size-3" />
                              {deactivate.isPending ? 'Deactivating…' : 'Deactivate'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </div>

                    {showDeactivationPreview ? (
                      <DeactivationImpactPreview staff={staff} />
                    ) : null}
                  </div>
                ) : null}

                {/* Reactivate */}
                {canChangeRole && staff.status === 'deactivated' ? (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/10 p-5 space-y-4">
                    <div>
                      <h3 className="text-[13px] font-bold text-brand-800">Reactivate Account</h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Reactivation restores login access. Previous role assignments are not restored automatically.</p>
                    </div>
                    <Form {...reactivateForm}>
                      <form
                        onSubmit={reactivateForm.handleSubmit(async (values) => {
                          try {
                            await reactivate.mutateAsync(values);
                            await refetch();
                            onSuccess?.();
                          } catch (err) {
                            reactivateForm.setError('root', {
                              message: err instanceof Error ? err.message : 'Reactivation failed.',
                            });
                          }
                        })}
                        className="space-y-4"
                      >
                        {reactivateForm.formState.errors.root?.message && (
                          <Alert variant="destructive">
                            <AlertDescription>{reactivateForm.formState.errors.root.message}</AlertDescription>
                          </Alert>
                        )}
                        <FormField
                          control={reactivateForm.control}
                          name="reason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[11px]">Reason</FormLabel>
                              <FormControl>
                                <Input className="border-brand-200" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={reactivate.isPending} size="sm" variant="gradient">
                          <UserCheck aria-hidden className="mr-1.5 size-3" />
                          {reactivate.isPending ? 'Reactivating…' : 'Reactivate staff member'}
                        </Button>
                      </form>
                    </Form>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
