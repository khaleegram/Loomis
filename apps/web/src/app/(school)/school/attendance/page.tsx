'use client';

import { useAttendance, useGradebookEntries, useMarkAttendance, useStudents } from '@loomis/api-client';
import type { AttendanceStatus } from '@loomis/contracts';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useMemo, useState } from 'react';

import { AcademicTermSelectors } from '@/components/academic/ops/academic-term-selectors';
import {
  AttendanceWeekRoster,
  buildWeekDates,
  type AttendanceRosterRow,
} from '@/components/academic/ops/attendance-week-roster';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { todayCalendarDate } from '@/lib/academic/ops-labels';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AttendancePage() {
  const tenantId = useTenantId();
  const canMark = useCan('attendance.mark');
  const canView = useCanAny(['attendance.mark', 'attendance.view']);

  const ctx = useAcademicOpsContext(tenantId ?? '');
  const [selectedDate, setSelectedDate] = useState(todayCalendarDate());
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const weekDates = useMemo(() => buildWeekDates(selectedDate), [selectedDate]);

  const termClassFilters =
    ctx.termId && ctx.classArmId
      ? { termId: ctx.termId, classArmId: ctx.classArmId }
      : null;

  const weekAttendanceFilters = termClassFilters
    ? { ...termClassFilters, attendanceDate: selectedDate }
    : null;

  const dayAttendanceQuery = useAttendance(tenantId ?? '', weekAttendanceFilters);
  const termAttendanceQuery = useAttendance(tenantId ?? '', termClassFilters);
  const gradebookQuery = useGradebookEntries(tenantId ?? '', termClassFilters);
  const studentsQuery = useStudents(tenantId ?? '');

  const markAttendance = useMarkAttendance(tenantId ?? '', {
    termId: ctx.termId ?? '',
    classArmId: ctx.classArmId ?? '',
    attendanceDate: selectedDate,
  });

  const rosterRows: AttendanceRosterRow[] = useMemo(() => {
    const students = (studentsQuery.data?.students ?? []).filter(
      (s) => s.status === 'enrolled' || s.status === 'admitted',
    );
    const studentIds = new Set<string>();
    for (const s of students) studentIds.add(s.id);
    for (const r of termAttendanceQuery.data?.records ?? []) studentIds.add(r.studentId);
    for (const e of gradebookQuery.data?.entries ?? []) studentIds.add(e.studentId);

    const recordByStudent = new Map(
      (dayAttendanceQuery.data?.records ?? []).map((r) => [r.studentId, r]),
    );

    return [...studentIds]
      .map((id) => {
        const student = students.find((s) => s.id === id);
        if (!student) return null;
        return { student, record: recordByStudent.get(id) ?? null };
      })
      .filter(Boolean)
      .sort((a, b) => a!.student.admissionNo.localeCompare(b!.student.admissionNo)) as AttendanceRosterRow[];
  }, [
    studentsQuery.data,
    termAttendanceQuery.data,
    gradebookQuery.data,
    dayAttendanceQuery.data,
  ]);

  const canMarkToday = canMark && ctx.activeTerm?.status === 'open';

  if (!tenantId) {
    return (
      <>
        <PageHeader title="Attendance" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context. Sign in again.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!canView) {
    return (
      <>
        <PageHeader title="Attendance" />
        <PageBody>
          <Alert>
            <AlertDescription>You do not have permission to view attendance.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Daily roll call with week strip navigation (US-ACA-005). Class teachers only."
      />
      <PageBody>
        <div className="space-y-6">
        <AcademicTermSelectors
          years={ctx.sortedYears}
          terms={ctx.terms}
          classArmOptions={classArmOptions(ctx.arms, ctx.levels)}
          yearId={ctx.yearId}
          termId={ctx.termId}
          classArmId={ctx.classArmId}
          onYearChange={(id) => {
            ctx.setYearId(id);
            ctx.setTermId(null);
          }}
          onTermChange={ctx.setTermId}
          onClassArmChange={ctx.setClassArmId}
        />

        <AttendanceWeekRoster
          weekDates={weekDates}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setDraftStatuses({});
            setSubmitError(null);
          }}
          rows={rosterRows}
          draftStatuses={draftStatuses}
          onDraftChange={(studentId, status) =>
            setDraftStatuses((prev) => ({ ...prev, [studentId]: status }))
          }
          focusedStudentId={focusedStudentId}
          onFocusStudent={setFocusedStudentId}
          isLoading={
            dayAttendanceQuery.isLoading ||
            studentsQuery.isLoading ||
            termAttendanceQuery.isLoading
          }
          canMarkToday={canMarkToday}
          isSubmitting={markAttendance.isPending}
          errorMessage={submitError}
          onSubmit={async () => {
            if (!ctx.termId || !ctx.classArmId) return;
            setSubmitError(null);
            try {
              await markAttendance.mutateAsync({
                termId: ctx.termId,
                classArmId: ctx.classArmId,
                attendanceDate: selectedDate,
                session: 'full_day',
                entries: rosterRows.map((row) => ({
                  studentId: row.student.id,
                  status:
                    draftStatuses[row.student.id] ??
                    row.record?.status ??
                    ('present' as AttendanceStatus),
                })),
              });
              setDraftStatuses({});
            } catch (err) {
              setSubmitError(academicErrorMessage(err));
            }
          }}
        />
        </div>
      </PageBody>
    </>
  );
}
