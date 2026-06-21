import { router } from 'expo-router';
import {
  useAcademicTerms,
  useAcademicYears,
  useMyAssignments,
  useMyAttendance,
  useMyResults,
  useMyTimetable,
} from '@loomis/api-client';
import { HomeHub } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';
import { pickOpenTermId } from '@/lib/use-parent-child-context';
import { Text, View } from 'react-native';

export default function StudentHomeScreen() {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const termId = pickOpenTermId(termsQuery.data?.terms ?? []);

  const attendanceQuery = useMyAttendance(tenantId, termId);
  const resultsQuery = useMyResults(tenantId, termId);
  const assignmentsQuery = useMyAssignments(tenantId, termId);
  const timetableQuery = useMyTimetable(tenantId, termId);

  const summary = attendanceQuery.data?.summary;
  const attendancePct =
    summary && summary.present + summary.absent + summary.late > 0
      ? Math.round(
          (summary.present / (summary.present + summary.absent + summary.late)) * 100,
        )
      : null;

  const assignments = assignmentsQuery.data?.assignments ?? [];
  const dueCount = assignments.filter((a) => !a.mySubmission).length;

  const todayEntries = timetableQuery.data?.entries?.slice(0, 2) ?? [];

  return (
    <HomeHub
      consoleLabel="Student Portal"
      userName={session?.displayName}
      description="Your timetable, assignments, and results."
      loading={
        attendanceQuery.isLoading ||
        resultsQuery.isLoading ||
        assignmentsQuery.isLoading
      }
      statChips={[
        { id: 'attendance', label: 'Attendance', value: attendancePct != null ? `${attendancePct}%` : '—' },
        {
          id: 'results',
          label: 'Term avg',
          value:
            resultsQuery.data?.averageScore != null
              ? `${resultsQuery.data.averageScore}%`
              : '—',
        },
        { id: 'due', label: 'Due assignments', value: String(dueCount) },
      ]}
      actions={[
        { id: 'schedule', label: 'Timetable', onPress: () => router.push('/(student)/(tabs)/timetable') },
        { id: 'academics', label: 'Results', onPress: () => router.push('/(student)/(tabs)/academics') },
        {
          id: 'assignments',
          label: 'Assignments',
          onPress: () => router.push('/(student)/(tabs)/assignments'),
        },
        { id: 'attendance', label: 'Attendance', onPress: () => router.push('/(student)/(tabs)/academics') },
      ]}
      preview={
        todayEntries.length > 0 ? (
          <View className="gap-2">
            {todayEntries.map((entry) => (
              <Text key={entry.id} className="text-sm text-neutral-700 dark:text-neutral-200">
                Period: {entry.subjectId.slice(0, 8)}…
              </Text>
            ))}
          </View>
        ) : undefined
      }
    />
  );
}
