import { useMemo } from 'react';
import { useAcademicTerms, useAcademicYears, useMyTimetable } from '@loomis/api-client';
import { DaySchedule } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';
import { pickOpenTermId } from '@/lib/use-parent-child-context';
import { formatMinuteOfDay } from '@/lib/time-format';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function StudentTimetableScreen() {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const termId = pickOpenTermId(termsQuery.data?.terms);
  const timetableQuery = useMyTimetable(tenantId, termId);

  const days = useMemo(() => {
    const entries = timetableQuery.data?.entries ?? [];
    return DAY_LABELS.map((label, index) => ({
      id: String(index + 1),
      label,
      periods: entries
        .filter((entry) => entry.dayOfWeek === index + 1)
        .map((entry) => ({
          id: entry.id,
          subject: entry.subjectId.slice(0, 8),
          teacher: entry.teacherStaffProfileId?.slice(0, 8),
          room: undefined,
          startTime: formatMinuteOfDay(entry.startMinute),
          endTime: formatMinuteOfDay(entry.endMinute),
        })),
    }));
  }, [timetableQuery.data?.entries]);

  return <DaySchedule days={days} loading={timetableQuery.isLoading} />;
}
