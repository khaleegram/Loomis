'use client';

import {
  useAmendAttendance,
  useAttendance,
  useMarkAttendance,
  useTermEnrollmentRoster,
} from '@loomis/api-client';
import type { AttendanceStatus, StudentResponse } from '@loomis/contracts';
import { Alert, AlertDescription } from '@loomis/ui-web';
import { useCallback, useMemo, useState } from 'react';

import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
import { AttendanceAmendSheet } from '@/components/academic/ops/attendance-amend-sheet';
import { AttendanceHero } from '@/components/academic/ops/attendance-hero';
import {
  AttendanceWeekRoster,
  buildWeekDates,
  type AttendanceRosterRow,
} from '@/components/academic/ops/attendance-week-roster';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { shortDateLabel, todayCalendarDate, weekdayLabel } from '@/lib/academic/ops-labels';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useCan, useCanAny, useRole } from '@/lib/auth/use-capability';
import { isClassTeacherRole } from '@/lib/timetable/is-teaching-staff';
import { useTeachingStaffScope } from '@/lib/timetable/use-teaching-staff-scope';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function rosterStudentFromEnrollment(entry: {
  studentId: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
}): StudentResponse {
  return {
    id: entry.studentId,
    tenantId: '',
    admissionNo: entry.admissionNo,
    firstName: entry.firstName,
    lastName: entry.lastName,
    status: 'enrolled',
    gender: 'male',
    dateOfBirth: '2010-01-01',
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  } as StudentResponse;
}

export default function AttendancePage() {
  const tenantId = useTenantId();
  const role = useRole();
  const canMark = useCan('attendance.mark');
  const canView = useCanAny(['attendance.mark', 'attendance.view']);

  const adminCtx = useAcademicOpsContext(tenantId ?? '');
  const teacherCtx = useTeachingStaffScope(tenantId ?? '', { mode: 'classTeacherClass' });
  const ctx = isClassTeacherRole(role) ? teacherCtx : adminCtx;
  const [selectedDate, setSelectedDate] = useState(todayCalendarDate());
  const [draftStatuses, setDraftStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [focusedStudentId, setFocusedStudentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [amendRow, setAmendRow] = useState<AttendanceRosterRow | null>(null);

  const weekDates = useMemo(() => buildWeekDates(selectedDate), [selectedDate]);

  const termClassFilters =
    ctx.termId && ctx.classArmId
      ? { termId: ctx.termId, classArmId: ctx.classArmId }
      : null;

  const weekAttendanceFilters = termClassFilters
    ? { ...termClassFilters, attendanceDate: selectedDate }
    : null;

  const rosterQuery = useTermEnrollmentRoster(tenantId ?? '', ctx.termId ?? '');
  const dayAttendanceQuery = useAttendance(tenantId ?? '', weekAttendanceFilters);
  const markAttendance = useMarkAttendance(tenantId ?? '', {
    termId: ctx.termId ?? '',
    classArmId: ctx.classArmId ?? '',
    attendanceDate: selectedDate,
  });
  const amendAttendance = useAmendAttendance(tenantId ?? '', {
    termId: ctx.termId ?? '',
    classArmId: ctx.classArmId ?? '',
    attendanceDate: selectedDate,
  });

  const rosterRows: AttendanceRosterRow[] = useMemo(() => {
    const enrolled = (rosterQuery.data?.entries ?? []).filter(
      (entry) =>
        entry.classArmId === ctx.classArmId &&
        (entry.status === 'active' || entry.status === 'active_billable' || entry.status === 'suspended'),
    );
    const recordByStudent = new Map(
      (dayAttendanceQuery.data?.records ?? []).map((record) => [record.studentId, record]),
    );

    return enrolled
      .map((entry) => ({
        student: rosterStudentFromEnrollment(entry),
        record: recordByStudent.get(entry.studentId) ?? null,
      }))
      .sort((a, b) => a.student.admissionNo.localeCompare(b.student.admissionNo));
  }, [rosterQuery.data, dayAttendanceQuery.data, ctx.classArmId]);

  const summary = useMemo(() => {
    const totals = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const row of rosterRows) {
      const status = draftStatuses[row.student.id] ?? row.record?.status ?? 'present';
      if (status === 'present') totals.present += 1;
      if (status === 'absent') totals.absent += 1;
      if (status === 'late') totals.late += 1;
      if (status === 'excused') totals.excused += 1;
    }
    return totals;
  }, [draftStatuses, rosterRows]);

  const submittedCount = useMemo(
    () => rosterRows.filter((row) => row.record !== null).length,
    [rosterRows],
  );

  const pendingChanges = useMemo(
    () =>
      rosterRows.filter((row) => {
        const draft = draftStatuses[row.student.id];
        return draft !== undefined && draft !== (row.record?.status ?? 'present');
      }).length,
    [draftStatuses, rosterRows],
  );

  const markAllPresent = useCallback(() => {
    const next: Record<string, AttendanceStatus> = {};
    for (const row of rosterRows) {
      next[row.student.id] = 'present';
    }
    setDraftStatuses(next);
    setSubmitError(null);
  }, [rosterRows]);

  const canMarkToday = canMark && ctx.activeTerm?.status === 'open';
  const classLabel =
    (isClassTeacherRole(role) ? teacherCtx.classTeacherClassArmLabel : null) ??
    classArmOptions(ctx.arms, ctx.levels).find((arm) => arm.id === ctx.classArmId)?.label ??
    null;
  const termLabel = ctx.activeTerm?.name ?? null;
  const selectedDateLabel = `${weekdayLabel(selectedDate)} · ${shortDateLabel(selectedDate)}`;

  if (!tenantId) {
    return (
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
        <Alert>
          <AlertDescription>You do not have permission to view attendance.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8">
      <div className="space-y-2">
        <AttendanceHero
          classLabel={classLabel}
          termLabel={termLabel}
          selectedDateLabel={selectedDateLabel}
          canMark={canMark}
          canMarkToday={canMarkToday}
          summary={summary}
          rosterCount={rosterRows.length}
          submittedCount={submittedCount}
          pendingChanges={pendingChanges}
          isLoading={rosterQuery.isLoading || dayAttendanceQuery.isLoading}
          onMarkAllPresent={canMarkToday ? markAllPresent : undefined}
        />

        <div className="pt-2">
          <AcademicScopePicker
            years={ctx.sortedYears}
            terms={ctx.terms}
            classArmOptions={
              isClassTeacherRole(role) ? teacherCtx.teachingClassArmOptions : classArmOptions(ctx.arms, ctx.levels)
            }
            yearId={ctx.yearId}
            termId={ctx.termId}
            classArmId={ctx.classArmId}
            onYearChange={(id) => {
              ctx.setYearId(id);
              ctx.setTermId(null);
            }}
            onTermChange={ctx.setTermId}
            onClassArmChange={ctx.setClassArmId}
            hideClassSelection={isClassTeacherRole(role) ? teacherCtx.hideClassSelection : false}
          />
        </div>

        {!ctx.termId || !ctx.classArmId ? (
          <div className={`${ACADEMIC_UI.dataPanel} mt-6 p-10 text-center`}>
            <p className="text-[15px] font-semibold text-neutral-800">Choose your class to open the register</p>
            <p className="mt-2 text-[13px] text-neutral-500">
              Select year, term, and class in the scope bar above.
            </p>
          </div>
        ) : (
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
            onAmendRecord={canMarkToday ? setAmendRow : undefined}
            isLoading={rosterQuery.isLoading || dayAttendanceQuery.isLoading}
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
        )}
      </div>

      {amendRow?.record ? (
        <AttendanceAmendSheet
          open={Boolean(amendRow)}
          onOpenChange={(open) => {
            if (!open) setAmendRow(null);
          }}
          firstName={amendRow.student.firstName}
          lastName={amendRow.student.lastName}
          admissionNo={amendRow.student.admissionNo}
          currentStatus={amendRow.record.status}
          isSubmitting={amendAttendance.isPending}
          onSubmit={async (values) => {
            if (!amendRow.record) return;
            await amendAttendance.mutateAsync({
              recordId: amendRow.record.id,
              status: values.status,
              reason: values.reason,
            });
            setAmendRow(null);
          }}
        />
      ) : null}
    </PageBody>
  );
}
