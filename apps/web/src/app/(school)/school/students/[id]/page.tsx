'use client';

import {
  useAcademicYears,
  useClassStructure,
  useStudent,
  useStudentProfile,
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
import { use, useMemo, useState } from 'react';

import { EnrollStudentDialog } from '@/components/student/enroll-student-dialog';
import { InitiateParentLinkDialog } from '@/components/student/initiate-parent-link-dialog';
import { RecordAttestationDialog } from '@/components/student/record-attestation-dialog';
import {
  StudentProfileActionButton,
  StudentProfileHeader,
} from '@/components/student/student-profile-header';
import { TransferStudentDialog } from '@/components/student/transfer-student-dialog';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import {
  attestationTypeLabel,
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
      <>
        <PageHeader title="Student profile" />
        <PageBody>
          <p className="text-sm text-destructive">No tenant context. Sign in again.</p>
        </PageBody>
      </>
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
    <>
      <PageHeader
        title="Student profile"
        description="Complete student record and linked family information (US-SIS-007)."
        breadcrumbs={
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/school/students" className="hover:text-foreground">
              Students
            </Link>
            <span aria-hidden>/</span>
            <span className="text-foreground">{studentName}</span>
          </nav>
        }
      />
      <PageBody>
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : isError || !student ? (
          <Alert variant="destructive">
            <AlertDescription>
              {(studentQuery.error as Error)?.message ?? 'Student not found.'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <StudentProfileHeader
              student={student}
              currentClassLabel={currentClassLabel}
              actions={headerActions}
            />

            {student.status === 'admitted' ? (
              <Alert variant="warning">
                <AlertDescription>
                  This student is admitted but not yet enrolled for the current term. Use Enroll to
                  assign a class arm.
                </AlertDescription>
              </Alert>
            ) : null}

            <Tabs defaultValue="overview" className="space-y-4">
              <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
                  <TabsTrigger value="parents">Parents</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="transfer">Transfer</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Card className="shadow-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Enrollment status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold tabular-nums text-brand-600 dark:text-mint-400">
                        {currentClassLabel ?? 'Not enrolled'}
                      </p>
                      <CardDescription className="mt-1">
                        {profile?.enrollments.length ?? 0} historical enrollment
                        {(profile?.enrollments.length ?? 0) === 1 ? '' : 's'}
                      </CardDescription>
                    </CardContent>
                  </Card>
                  <Card className="shadow-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Parent links</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold tabular-nums text-gold-600 dark:text-gold-300">
                        {profile?.parentLinks.filter((l) => l.status === 'active').length ?? 0}
                      </p>
                      <CardDescription className="mt-1">Active verified links</CardDescription>
                    </CardContent>
                  </Card>
                  <Card className="shadow-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Identity attestation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium text-foreground">
                        {student.identityAttestationType
                          ? attestationTypeLabel(student.identityAttestationType)
                          : 'Not recorded'}
                      </p>
                      {student.identityAttestedAt ? (
                        <CardDescription className="mt-1">
                          Recorded {formatDateTime(student.identityAttestedAt)}
                        </CardDescription>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>

                {profile?.admission ? (
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="font-serif text-base">Admission record</CardTitle>
                      <CardDescription>
                        Ref {profile.admission.referenceNumber} · Submitted{' '}
                        {formatCalendarDate(profile.admission.createdAt.slice(0, 10))}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Guardian on application: {profile.admission.guardianName} (
                      {relationshipLabel(profile.admission.guardianRelationship)})
                    </CardContent>
                  </Card>
                ) : null}

                {!canViewFullProfile ? (
                  <Alert>
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
                  <Card className="border-dashed shadow-none">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No enrollment records yet.
                      {canManage ? (
                        <>
                          {' '}
                          <button
                            type="button"
                            className="font-medium text-brand-600 underline dark:text-mint-400"
                            onClick={() => setEnrollOpen(true)}
                          >
                            Enroll now
                          </button>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>
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
                        <Card key={enrollment.id} className="shadow-card">
                          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                            <div>
                              <p className="font-medium text-foreground">{label}</p>
                              <p className="text-xs text-muted-foreground">
                                Enrolled {formatDateTime(enrollment.enrolledAt)}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {enrollmentStatusLabel(enrollment.status)}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="parents">
                {!profile ? (
                  <ProfileTabPlaceholder loading={profileQuery.isLoading} />
                ) : profile.parentLinks.length === 0 ? (
                  <Card className="border-dashed shadow-none">
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No parent links initiated.
                      {canManage ? (
                        <>
                          {' '}
                          <button
                            type="button"
                            className="font-medium text-brand-600 underline dark:text-mint-400"
                            onClick={() => setParentLinkOpen(true)}
                          >
                            Initiate a link
                          </button>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {profile.parentLinks.map((link) => (
                      <Card key={link.id} className="shadow-card">
                        <CardContent className="py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {link.parentIdentity.fullName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {relationshipLabel(link.relationship)} ·{' '}
                                {maskEmail(link.parentIdentity.emailNormalized)}
                                {link.parentIdentity.phoneE164
                                  ? ` · ${maskPhone(link.parentIdentity.phoneE164)}`
                                  : null}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Expires {formatDateTime(link.expiresAt)}
                              </p>
                            </div>
                            <Badge
                              variant={link.status === 'active' ? 'default' : 'secondary'}
                            >
                              {parentLinkStatusLabel(link.status)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="font-serif text-base">Identity attestation</CardTitle>
                    <CardDescription>
                      Required before billable enrollment and census lock (FR-SIS-002).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {student.identityAttestationType ? (
                      <div className="rounded-md border border-border bg-muted/40 p-4">
                        <p className="font-medium text-foreground">
                          {attestationTypeLabel(student.identityAttestationType)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Recorded {formatDateTime(student.identityAttestedAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No attestation on file. Record one before enrolling for billing purposes.
                      </p>
                    )}
                    {canManage && !student.identityAttestationType ? (
                      <Button onClick={() => setAttestationOpen(true)}>
                        Record attestation
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transfer" className="space-y-4">
                <Alert variant="warning">
                  <AlertDescription>
                    Transfer out ends enrollment and generates a transfer certificate. Principal
                    approval is required (US-SIS-006).
                  </AlertDescription>
                </Alert>
                {student.status === 'transferred_out' ? (
                  <Card className="shadow-card">
                    <CardContent className="py-6 text-sm text-muted-foreground">
                      This student has been transferred out of the school.
                    </CardContent>
                  </Card>
                ) : canTransfer ? (
                  <Button variant="destructive" onClick={() => setTransferOpen(true)}>
                    Process transfer out
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Contact the Principal to process a transfer.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </PageBody>

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
    </>
  );
}

function ProfileTabPlaceholder({ loading }: { loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }
  return (
    <Alert>
      <AlertDescription>
        Full enrollment and parent history is available to the Principal and School Owner.
      </AlertDescription>
    </Alert>
  );
}
