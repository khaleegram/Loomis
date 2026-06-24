'use client';

import {
  useAcademicYears,
  useClassStructure,
  useStudent,
  useStudentProfile,
  useSetStudentPhoto,
} from '@loomis/api-client';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@loomis/ui-web';
import Link from 'next/link';
import { use, useCallback, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { EnrollStudentDialog } from '@/components/student/enroll-student-dialog';
import { InitiateParentLinkDialog } from '@/components/student/initiate-parent-link-dialog';
import { RecordAttestationDialog } from '@/components/student/record-attestation-dialog';
import {
  StudentProfileActionButton,
  StudentProfileHeader,
  StudentProfileHeaderSkeleton,
} from '@/components/student/student-profile-header';
import { StudentAttendanceTab } from '@/components/student/student-attendance-tab';
import { StudentTimeline } from '@/components/student/student-timeline';
import { TransferStudentDialog } from '@/components/student/transfer-student-dialog';
import { PageBody } from '@/components/school/school-shell';
import { PhotoUpload } from '@/components/shared/photo-upload';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import {
  attestationTypeLabel,
  computeAgeYears,
  enrollmentStatusLabel,
  formatCalendarDate,
  formatDateTime,
  maskEmail,
  maskPhone,
  parentLinkStatusLabel,
  relationshipLabel,
  studentDisplayName,
} from '@/lib/student/student-labels';

interface StudentProfilePageProps {
  params: Promise<{ id: string }>;
}

function pickActiveYearId(years: { id: string; status: string }[]): string | null {
  return years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
}

export default function StudentProfilePage({ params }: StudentProfilePageProps) {
  const { id: studentId } = use(params);
  const tenantId = useTenantId();
  const canViewFullProfile = useCan('audit.view');
  const canViewAttendance = useCan('attendance.view');
  const canManage = useCan('admissions.manage');
  const canTransfer = useCanAny(['admissions.approve', 'student.promote']);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [parentLinkOpen, setParentLinkOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [attestationOpen, setAttestationOpen] = useState(false);

  const studentQuery = useStudent(tenantId ?? '', studentId);
  const profileQuery = useStudentProfile(
    tenantId ?? '',
    canViewFullProfile ? studentId : '',
  );
  const setPhotoMutation = useSetStudentPhoto(tenantId ?? '');

  const handlePhotoSet = useCallback(
    (storageObjectId: string) => {
      if (storageObjectId) {
        setPhotoMutation.mutate({ studentId, storageObjectId });
      }
    },
    [setPhotoMutation, studentId],
  );
  const yearsQuery = useAcademicYears(tenantId ?? '');
  const activeYearId = pickActiveYearId(yearsQuery.data?.academicYears ?? []);
  const structureQuery = useClassStructure(tenantId ?? '', activeYearId ?? '');

  const student = studentQuery.data;
  const profile = canViewFullProfile && profileQuery.isSuccess ? profileQuery.data : null;

  const currentClassLabel = useMemo(() => {
    if (!profile) return null;
    const active = profile.enrollments.find(
      (e) => e.status === 'active' || e.status === 'active_billable',
    );
    if (!active) return null;
    const arm = structureQuery.data?.arms.find((a) => a.id === active.classArmId);
    const level = structureQuery.data?.levels.find((l) => l.id === arm?.classLevelId);
    if (level && arm) return `${level.name} — ${arm.name}`;
    return arm?.name ?? null;
  }, [profile, structureQuery.data]);

  if (!tenantId) {
    return (
      <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <p className="text-sm text-destructive">No tenant context. Sign in again.</p>
      </PageBody>
    );
  }

  const isLoading = studentQuery.isLoading;
  const isError = studentQuery.isError;

  const studentName = student
    ? studentDisplayName(student.firstName, student.lastName)
    : 'Student';

  const headerActions =
    student && student.status !== 'transferred_out' && student.status !== 'withdrawn' ? (
      <>
        {canManage && (student.status === 'admitted' || student.status === 'enrolled') ? (
          <StudentProfileActionButton onClick={() => setEnrollOpen(true)}>
            Enroll
          </StudentProfileActionButton>
        ) : null}
        {canManage ? (
          <StudentProfileActionButton variant="outline" onClick={() => setParentLinkOpen(true)}>
            Link parent
          </StudentProfileActionButton>
        ) : null}
        {canTransfer && student.status === 'enrolled' ? (
          <StudentProfileActionButton variant="outline" onClick={() => setTransferOpen(true)}>
            Transfer out
          </StudentProfileActionButton>
        ) : null}
      </>
    ) : null;

  return (
    <PageBody className="max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            <Link href="/school/students" className="hover:text-brand-600 transition-colors">
              Student registry
            </Link>
            <span className="text-neutral-200">/</span>
            <span className="text-neutral-500">{isLoading ? 'Loading…' : studentName}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[12px] text-neutral-600" asChild>
            <Link href="/school/students">
              <ArrowLeft className="size-3.5" aria-hidden />
              Back
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <StudentProfileHeaderSkeleton />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : isError || !student ? (
          <div className="flex flex-col items-center justify-center py-20">
            <h2 className="text-lg font-bold text-neutral-800">Student not found</h2>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              The student profile you&rsquo;re looking for doesn&rsquo;t exist or has been removed.
            </p>
            <Button variant="outline" size="sm" className="mt-5" asChild>
              <Link href="/school/students">Return to registry</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <StudentProfileHeader
              student={student}
              currentClassLabel={currentClassLabel}
              actions={headerActions}
            />

            {/* Compulsory student photo — passport-style */}
            <div className={`card rounded-2xl p-5 ${student.photoStorageObjectId ? 'border-brand-100/40' : 'border-2 border-amber-300 bg-amber-50/20'}`}>
              <PhotoUpload
                ownerResourceId={studentId}
                ownerResourceType="student"
                classification="child_pii"
                photoStorageObjectId={student.photoStorageObjectId}
                fullName={studentDisplayName(student.firstName, student.lastName)}
                onPhotoSet={handlePhotoSet}
                required
                uploadLabel="Upload passport photo"
                size={88}
              />
              {!student.photoStorageObjectId ? (
                <p className="mt-2 text-center text-[11px] text-amber-600">
                  A clear passport-style photo is required. Face must be visible.
                </p>
              ) : null}
            </div>

            {student.status === 'admitted' ? (
              <Alert variant="warning" className="rounded-2xl border-l-4 border-l-amber-500">
                <AlertDescription>
                  This student is admitted but not yet enrolled for the current term. Use Enroll to
                  assign a class arm.
                </AlertDescription>
              </Alert>
            ) : null}

            <Tabs defaultValue="overview" className="space-y-5">
              {/* Premium tab bar */}
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-auto gap-1 rounded-xl border border-brand-100 bg-brand-50/30 p-1">
                  <TabsTrigger
                    value="overview"
                    className="rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="enrollments"
                    className="rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                  >
                    Enrollments
                  </TabsTrigger>
                  <TabsTrigger
                    value="parents"
                    className="rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                  >
                    Parents
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                  >
                    Documents
                  </TabsTrigger>
                  {canViewAttendance ? (
                    <TabsTrigger
                      value="attendance"
                      className="rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                    >
                      Attendance
                    </TabsTrigger>
                  ) : null}
                  <TabsTrigger
                    value="transfer"
                    className="rounded-lg px-4 py-2 text-[12px] font-semibold transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-brand-800 data-[state=active]:shadow-sm"
                  >
                    Transfer
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="card group rounded-2xl p-5 transition-all duration-300 hover:shadow-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Enrollment status</p>
                    <p className="mt-1 text-xl font-extrabold tracking-tight text-brand-700">
                      {currentClassLabel ?? 'Not enrolled'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {profile?.enrollments.length ?? 0} historical enrollment{(profile?.enrollments.length ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="card group rounded-2xl p-5 transition-all duration-300 hover:shadow-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Parent links</p>
                    <p className="mt-1 text-xl font-extrabold tracking-tight text-gold-700">
                      {profile?.parentLinks.filter((l) => l.status === 'active').length ?? 0}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400">Active verified links</p>
                  </div>
                  <div className="card group rounded-2xl p-5 transition-all duration-300 hover:shadow-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">Identity attestation</p>
                    <p className="mt-1 text-[13px] font-semibold text-neutral-800">
                      {student.identityAttestationType
                        ? attestationTypeLabel(student.identityAttestationType)
                        : 'Not recorded'}
                    </p>
                    {student.identityAttestedAt ? (
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        Recorded {formatDateTime(student.identityAttestedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {profile?.admission ? (
                  <div className="card rounded-2xl p-6">
                    <h3 className="text-[13px] font-bold text-neutral-800">Admission record</h3>
                    <p className="mt-1 text-[12px] text-neutral-400">
                      Ref {profile.admission.referenceNumber} · Submitted{' '}
                      {formatCalendarDate(profile.admission.createdAt.slice(0, 10))}
                    </p>
                    <p className="mt-3 text-[12px] text-neutral-500">
                      Guardian on application: {profile.admission.guardianName} (
                      {relationshipLabel(profile.admission.guardianRelationship)})
                    </p>
                  </div>
                ) : null}

                {!canViewFullProfile ? (
                  <Alert className="rounded-2xl">
                    <AlertDescription>
                      Extended profile history is available to the Principal and School Owner.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </TabsContent>

              <TabsContent value="enrollments">
                {!profile ? (
                  <ProfileTabPlaceholder loading={profileQuery.isLoading} />
                ) : profile.enrollments.length === 0 ? (
                  <div className="card rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
                    <p className="text-[13px] font-medium text-neutral-400">No enrollment records yet.</p>
                    {canManage ? (
                      <button
                        type="button"
                        className="mt-2 text-[12px] font-medium text-brand-600 underline"
                        onClick={() => setEnrollOpen(true)}
                      >
                        Enroll now
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.enrollments.map((enrollment) => {
                      const arm = structureQuery.data?.arms.find(
                        (a) => a.id === enrollment.classArmId,
                      );
                      const level = structureQuery.data?.levels.find(
                        (l) => l.id === arm?.classLevelId,
                      );
                      const label =
                        level && arm ? `${level.name} — ${arm.name}` : (arm?.name ?? 'Class arm');
                      return (
                        <div
                          key={enrollment.id}
                          className="card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                        >
                          <div>
                            <p className="font-semibold text-neutral-800">{label}</p>
                            <p className="text-[11px] text-neutral-400">
                              Enrolled {formatDateTime(enrollment.enrolledAt)}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {enrollmentStatusLabel(enrollment.status)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="parents">
                {!profile ? (
                  <ProfileTabPlaceholder loading={profileQuery.isLoading} />
                ) : profile.parentLinks.length === 0 ? (
                  <div className="card rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
                    <p className="text-[13px] font-medium text-neutral-400">No parent links initiated.</p>
                    {canManage ? (
                      <button
                        type="button"
                        className="mt-2 text-[12px] font-medium text-brand-600 underline"
                        onClick={() => setParentLinkOpen(true)}
                      >
                        Initiate a link
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.parentLinks.map((link) => (
                      <div key={link.id} className="card rounded-2xl p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-neutral-800">
                              {link.parentIdentity.fullName}
                            </p>
                            <p className="text-[12px] text-neutral-400">
                              {relationshipLabel(link.relationship)} ·{' '}
                              {maskEmail(link.parentIdentity.emailNormalized)}
                              {link.parentIdentity.phoneE164
                                ? ` · ${maskPhone(link.parentIdentity.phoneE164)}`
                                : null}
                            </p>
                            <p className="mt-1 text-[11px] text-neutral-400">
                              Expires {formatDateTime(link.expiresAt)}
                            </p>
                          </div>
                          <Badge
                            variant={link.status === 'active' ? 'default' : 'secondary'}
                          >
                            {parentLinkStatusLabel(link.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {canViewAttendance && tenantId && student ? (
                <TabsContent value="attendance">
                  <StudentAttendanceTab
                    tenantId={tenantId}
                    studentId={studentId}
                    firstName={student.firstName}
                    lastName={student.lastName}
                  />
                </TabsContent>
              ) : null}

              <TabsContent value="documents" className="space-y-4">
                <div className="card rounded-2xl p-6">
                  <h3 className="text-[13px] font-bold text-neutral-800">Identity attestation</h3>
                  <p className="mt-1 text-[12px] text-neutral-400">
                    Required before a student counts toward platform fee billing.
                  </p>
                  <div className="mt-4 space-y-4">
                    {student.identityAttestationType ? (
                      <div className="rounded-xl border border-brand-100 bg-brand-50/20 p-4">
                        <p className="font-semibold text-neutral-800">
                          {attestationTypeLabel(student.identityAttestationType)}
                        </p>
                        <p className="text-[12px] text-neutral-400">
                          Recorded {formatDateTime(student.identityAttestedAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[13px] text-neutral-400">
                        No attestation on file. Record one before enrolling for billing purposes.
                      </p>
                    )}
                    {canManage && !student.identityAttestationType ? (
                      <Button size="sm" variant="gradient" onClick={() => setAttestationOpen(true)}>
                        Record attestation
                      </Button>
                    ) : null}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="transfer" className="space-y-4">
                <Alert variant="warning" className="rounded-2xl border-l-4 border-l-amber-500">
                  <AlertDescription>
                    Transfer out ends enrollment and generates a transfer certificate. Principal
                    approval is required.
                  </AlertDescription>
                </Alert>
                {student.status === 'transferred_out' ? (
                  <div className="card rounded-2xl p-6">
                    <p className="text-[13px] text-neutral-400">This student has been transferred out of the school.</p>
                  </div>
                ) : canTransfer ? (
                  <Button variant="destructive" size="sm" onClick={() => setTransferOpen(true)}>
                    Process transfer out
                  </Button>
                ) : (
                  <p className="text-[13px] text-neutral-400">
                    Contact the Principal to process a transfer.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {/* Activity Timeline */}
            <StudentTimeline student={student} />
          </div>
        )}
      </div>

      {student ? (
        <>
          <EnrollStudentDialog
            tenantId={tenantId}
            studentId={studentId}
            studentName={studentName}
            hasAttestation={Boolean(student.identityAttestationType)}
            open={enrollOpen}
            onOpenChange={setEnrollOpen}
          />
          <InitiateParentLinkDialog
            tenantId={tenantId}
            studentId={studentId}
            studentName={studentName}
            open={parentLinkOpen}
            onOpenChange={setParentLinkOpen}
          />
          <TransferStudentDialog
            tenantId={tenantId}
            studentId={studentId}
            studentName={studentName}
            open={transferOpen}
            onOpenChange={setTransferOpen}
          />
          <RecordAttestationDialog
            tenantId={tenantId}
            studentId={studentId}
            open={attestationOpen}
            onOpenChange={setAttestationOpen}
          />
        </>
      ) : null}
    </PageBody>
  );
}

function ProfileTabPlaceholder({ loading }: { loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }
  return (
    <Alert className="rounded-2xl">
      <AlertDescription>
        Full enrollment and parent history is available to the Principal and School Owner.
      </AlertDescription>
    </Alert>
  );
}
