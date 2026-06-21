import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  useParentAttendance,
  useParentResults,
  useParentTimetable,
} from '@loomis/api-client';
import {
  DaySchedule,
  SegmentedTabs,
  SummaryDetail,
} from '@loomis/ui-mobile';
import { ParentAttendancePanel } from '@/components/parent/parent-attendance-panel';
import { ParentScopedScreen } from '@/components/parent/parent-scoped-screen';
import {
  formatSubjectLabel,
  weekdayLabel,
  formatTimeRange,
} from '@/lib/parent/labels';

type AcademicsTab = 'attendance' | 'results' | 'timetable';

const ACADEMICS_TABS = [
  { id: 'attendance' as const, label: 'Attendance' },
  { id: 'results' as const, label: 'Results' },
  { id: 'timetable' as const, label: 'Timetable' },
];

export default function ParentAcademicsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<AcademicsTab>('attendance');

  useEffect(() => {
    if (params.tab === 'attendance' || params.tab === 'results' || params.tab === 'timetable') {
      setTab(params.tab);
    }
  }, [params.tab]);

  return (
    <ParentScopedScreen>
      {({ tenantId, studentId, termId, termLabel, termLoading }) => (
        <View className="min-h-0 flex-1">
          <SegmentedTabs options={ACADEMICS_TABS} value={tab} onChange={setTab} className="mt-2" />

          {tab === 'attendance' ? (
            <AttendancePanel
              tenantId={tenantId}
              studentId={studentId}
              termId={termId}
              termLabel={termLabel}
              loading={termLoading}
            />
          ) : null}
          {tab === 'results' ? (
            <ResultsPanel
              tenantId={tenantId}
              studentId={studentId}
              termId={termId}
              loading={termLoading}
            />
          ) : null}
          {tab === 'timetable' ? (
            <TimetablePanel
              tenantId={tenantId}
              studentId={studentId}
              termId={termId}
              loading={termLoading}
            />
          ) : null}
        </View>
      )}
    </ParentScopedScreen>
  );
}

function AttendancePanel({
  tenantId,
  studentId,
  termId,
  termLabel,
  loading,
}: {
  tenantId: string;
  studentId: string;
  termId: string | null;
  termLabel: string | null;
  loading: boolean;
}) {
  const query = useParentAttendance(tenantId, studentId, termId);

  return (
    <ParentAttendancePanel
      query={query}
      termLabel={termLabel}
      loading={loading}
    />
  );
}

function ResultsPanel({
  tenantId,
  studentId,
  termId,
  loading,
}: {
  tenantId: string;
  studentId: string;
  termId: string | null;
  loading: boolean;
}) {
  const query = useParentResults(tenantId, studentId, termId);
  const data = query.data;

  const rows =
    data?.subjects.map((subject) => ({
      id: subject.subjectId,
      label: formatSubjectLabel(subject.subjectId),
      value: `${subject.totalScore}%`,
      subValue: `Grade ${subject.grade}${subject.remark ? ` · ${subject.remark}` : ''}`,
    })) ?? [];

  return (
    <SummaryDetail
      title="Published results"
      summaryLabel="Term average"
      summaryValue={data?.averageScore != null ? `${data.averageScore}%` : '—'}
      rows={data?.published ? rows : []}
      loading={loading || query.isLoading}
      errorMessage={query.isError ? 'Could not load results. Pull to refresh and try again.' : undefined}
      emptyTitle={
        !data?.published
          ? 'Results not published yet for this term'
          : rows.length === 0
            ? 'No subject scores in this term'
            : undefined
      }
    />
  );
}

function TimetablePanel({
  tenantId,
  studentId,
  termId,
  loading,
}: {
  tenantId: string;
  studentId: string;
  termId: string | null;
  loading: boolean;
}) {
  const query = useParentTimetable(tenantId, studentId, termId ?? '');
  const days = useMemo(() => {
    const entries = (query.data?.entries ?? []).filter((e) => e.status === 'published');
    return [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      id: String(dayOfWeek),
      label: weekdayLabel(dayOfWeek).slice(0, 3),
      periods: entries
        .filter((e) => e.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startMinute - b.startMinute)
        .map((entry) => ({
          id: entry.id,
          subject: formatSubjectLabel(entry.subjectId),
          teacher: entry.teacherName ?? undefined,
          startTime: formatTimeRange(entry.startMinute, entry.endMinute).split(' – ')[0] ?? '',
          endTime: formatTimeRange(entry.startMinute, entry.endMinute).split(' – ')[1] ?? '',
        })),
    }));
  }, [query.data?.entries]);

  return (
    <DaySchedule
      days={days}
      loading={loading || query.isLoading || !termId}
    />
  );
}
