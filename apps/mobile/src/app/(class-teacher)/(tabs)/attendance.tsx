import { useEffect, useMemo, useState } from 'react';
import {
  useAcademicTerms,
  useAcademicYears,
  useTeachingStaffContext,
  useTermEnrollmentRoster,
} from '@loomis/api-client';
import { QuickMarkGrid, type AttendanceMark, type MarkStudent } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';
import { pickOpenTermId } from '@/lib/use-parent-child-context';
import { getDeviceId, setDeviceId } from '@/lib/api-client';
import { enqueueAttendanceDraft } from '@/offline/queue';
import { uuidv7 } from 'uuidv7';
import { secureGet, secureSet } from '@/lib/secure-store';

export default function ClassTeacherAttendanceScreen() {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const termId = pickOpenTermId(termsQuery.data?.terms);
  const contextQuery = useTeachingStaffContext(tenantId, termId);
  const classArmId = contextQuery.data?.classTeacherAssignment?.classArmId ?? null;
  const rosterQuery = useTermEnrollmentRoster(tenantId, termId ?? '');

  const today = new Date().toISOString().slice(0, 10);
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      let id = getDeviceId();
      if (!id) {
        id = await secureGet('device_id');
        if (!id) {
          id = uuidv7();
          await secureSet('device_id', id);
        }
        setDeviceId(id);
      }
    })();
  }, []);

  const roster = useMemo(
    () =>
      (rosterQuery.data?.entries ?? []).filter(
        (entry) => !classArmId || entry.classArmId === classArmId,
      ),
    [rosterQuery.data?.entries, classArmId],
  );

  const students: MarkStudent[] = useMemo(
    () =>
      roster.map((student) => ({
        id: student.studentId,
        name: `${student.firstName} ${student.lastName}`,
        status: marks[student.studentId] ?? null,
      })),
    [roster, marks],
  );

  async function handleSubmit() {
    if (!tenantId || !termId || !classArmId) return;
    const deviceId = getDeviceId();
    if (!deviceId) return;
    setSubmitting(true);
    try {
      const capturedAt = new Date().toISOString();
      for (const [studentId, status] of Object.entries(marks)) {
        await enqueueAttendanceDraft(deviceId, {
          originTenantId: tenantId,
          termId,
          classArmId,
          studentId,
          attendanceDate: today,
          session: 'full_day',
          status,
          capturedAt,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <QuickMarkGrid
      students={students}
      dateLabel={today}
      loading={contextQuery.isLoading || rosterQuery.isLoading}
      onMark={(studentId, status) => setMarks((prev) => ({ ...prev, [studentId]: status }))}
      onSubmit={() => void handleSubmit()}
      submitting={submitting}
    />
  );
}
