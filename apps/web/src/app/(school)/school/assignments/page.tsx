'use client';

import {
  useAssignmentSubmissions,
  useAssignments,
  useCreateAssignment,
  useGradeSubmission,
  usePublishAssignment,
} from '@loomis/api-client';
import type { AssignmentResponse } from '@loomis/contracts';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { AssignmentCreateSheet, AssignmentDetailSheet } from '@/components/academic/ops/assignment-sheets';
import type { AssignmentTeachingSlot } from '@/components/academic/ops/assignment-subject-rail';
import { AssignmentsHero, AssignmentsList } from '@/components/academic/ops/assignments-panel';
import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useCan, useCanAny, useRole } from '@/lib/auth/use-capability';
import { isClassTeacherRole, isTeachingStaffRole } from '@/lib/timetable/is-teaching-staff';
import { useTeachingStaffScope } from '@/lib/timetable/use-teaching-staff-scope';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AssignmentsPage() {
  const tenantId = useTenantId();
  const role = useRole();
  const canCreate = useCan('gradebook.write') || isClassTeacherRole(role);
  const canView = useCanAny(['gradebook.write', 'gradebook.read']);

  const adminCtx = useAcademicOpsContext(tenantId ?? '');
  const teacherCtx = useTeachingStaffScope(tenantId ?? '');
  const ctx = isTeachingStaffRole(role) ? teacherCtx : adminCtx;
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentResponse | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filters =
    ctx.termId && ctx.classArmId ? { termId: ctx.termId, classArmId: ctx.classArmId } : null;

  const assignmentsQuery = useAssignments(tenantId ?? '', filters);

  const teachingSlots = useMemo((): AssignmentTeachingSlot[] => {
    if (!isTeachingStaffRole(role)) return [];
    const assignments = teacherCtx.teachingQuery.data?.subjectAssignments ?? [];
    const termLabel =
      teacherCtx.activeTerm?.name ??
      teacherCtx.terms.find((term) => term.id === teacherCtx.termId)?.name ??
      'Term';
    return assignments.map((assignment) => ({
      assignmentId: assignment.assignmentId,
      termId: assignment.termId,
      classArmId: assignment.classArmId,
      subjectId: assignment.subjectId,
      subjectLabel: formatSubjectLabel(assignment.subjectId),
      classLabel: assignment.classArmLabel,
      termLabel,
    }));
  }, [
    role,
    teacherCtx.teachingQuery.data?.subjectAssignments,
    teacherCtx.activeTerm?.name,
    teacherCtx.terms,
    teacherCtx.termId,
  ]);

  const createAssignment = useCreateAssignment(tenantId ?? '');
  const publishAssignment = usePublishAssignment(tenantId ?? '');
  const gradeSubmission = useGradeSubmission(tenantId ?? '');
  const submissionsQuery = useAssignmentSubmissions(tenantId ?? '', selectedAssignment?.id ?? null);

  const assignments = assignmentsQuery.data?.assignments ?? [];
  const classLabelByArmId = useMemo(() => {
    const map = new Map<string, string>();
    const options = isTeachingStaffRole(role)
      ? teacherCtx.teachingClassArmOptions
      : classArmOptions(ctx.arms, ctx.levels);
    for (const option of options) {
      map.set(option.id, option.label);
    }
    return map;
  }, [role, teacherCtx.teachingClassArmOptions, ctx.arms, ctx.levels]);

  const classLabel = classLabelByArmId.get(ctx.classArmId ?? '') ?? null;
  const termLabel = ctx.activeTerm?.name ?? null;
  const publishedCount = assignments.filter((item) => item.status === 'published').length;

  if (!tenantId) {
    return (
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">
        <Alert>
          <AlertDescription>You do not have permission to view assignments.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">
      <div className="space-y-6">
        <AssignmentsHero
          classLabel={classLabel}
          termLabel={termLabel}
          assignmentCount={assignments.length}
          publishedCount={publishedCount}
          canCreate={canCreate}
          onCreateClick={() => setCreateOpen(true)}
          isLoading={assignmentsQuery.isLoading}
        />

        <AcademicScopePicker
          classArmOptions={
            isTeachingStaffRole(role)
              ? teacherCtx.teachingClassArmOptions
              : classArmOptions(ctx.arms, ctx.levels)
          }
          classArmId={ctx.classArmId}
          onClassArmChange={ctx.setClassArmId}
          hideClassSelection={isTeachingStaffRole(role) ? teacherCtx.hideClassSelection : false}
        />

        {actionError ? (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {!filters ? (
          <div className={`${ACADEMIC_UI.dataPanel} p-8 text-center`}>
            <p className="text-[13px] text-neutral-500">Choose a class to view assignments.</p>
          </div>
        ) : (
          <AssignmentsList
            assignments={assignments}
            classLabelByArmId={classLabelByArmId}
            isLoading={assignmentsQuery.isLoading}
            canManage={canCreate}
            publishingId={publishingId}
            onOpen={setSelectedAssignment}
            onPublish={async (assignmentId) => {
              setActionError(null);
              setPublishingId(assignmentId);
              try {
                await publishAssignment.mutateAsync(assignmentId);
              } catch (err) {
                setActionError(academicErrorMessage(err));
              } finally {
                setPublishingId(null);
              }
            }}
          />
        )}
      </div>

      <AssignmentCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        teachingSlots={teachingSlots}
        isSubmitting={createAssignment.isPending}
        onSubmit={async (_values, slot) => {
          setActionError(null);
          try {
            await createAssignment.mutateAsync({
              termId: slot.termId,
              classArmId: slot.classArmId,
              subjectId: slot.subjectId,
              title: _values.title,
              instructions: _values.instructions,
              dueAt: new Date(_values.dueAt).toISOString(),
              maxScore: _values.maxScore,
            });
            ctx.setClassArmId(slot.classArmId);
          } catch (err) {
            setActionError(academicErrorMessage(err));
            throw err;
          }
        }}
      />

      <AssignmentDetailSheet
        open={Boolean(selectedAssignment)}
        onOpenChange={(open) => {
          if (!open) setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        submissions={submissionsQuery.data?.submissions ?? []}
        canGrade={canCreate}
        gradingSubmissionId={gradingId}
        onGrade={async (submissionId, values) => {
          setActionError(null);
          setGradingId(submissionId);
          try {
            await gradeSubmission.mutateAsync({
              submissionId,
              score: values.score,
              feedback: values.feedback,
            });
          } catch (err) {
            setActionError(academicErrorMessage(err));
          } finally {
            setGradingId(null);
          }
        }}
      />
    </PageBody>
  );
}
