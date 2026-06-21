import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  useAcademicTerms,
  useAcademicYears,
  useMyAttendance,
  useMyResults,
} from '@loomis/api-client';
import { SegmentedTabs, SummaryDetail, TimelineList } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';
import { formatSubjectLabel } from '@/lib/parent/labels';
import { useParentTermScope } from '@/lib/parent/use-parent-term-scope';
import { pickOpenTermId } from '@/lib/use-parent-child-context';

type Tab = 'attendance' | 'results';

const ACADEMICS_TABS = [
  { id: 'attendance' as const, label: 'Attendance' },
  { id: 'results' as const, label: 'Results' },
];

export default function StudentAcademicsScreen() {
  const [tab, setTab] = useState<Tab>('attendance');
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const termScope = useParentTermScope(tenantId);

  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const fallbackTermId = pickOpenTermId(termsQuery.data?.terms);
  const termId = termScope.termId ?? fallbackTermId;

  const attendanceQuery = useMyAttendance(tenantId, termId);
  const resultsQuery = useMyResults(tenantId, termId);

  const attendanceSections = useMemo(() => {
    const records = attendanceQuery.data?.records ?? [];
    return [
      {
        id: 'term',
        title: termScope.termLabel ?? 'This term',
        items: records.map((record) => ({
          id: record.id,
          label: record.attendanceDate,
          meta: record.status,
          status: record.status as 'present' | 'absent' | 'late',
        })),
      },
    ];
  }, [attendanceQuery.data?.records, termScope.termLabel]);

  const data = resultsQuery.data;
  const resultRows =
    data?.subjects.map((subject) => ({
      id: subject.subjectId,
      label: formatSubjectLabel(subject.subjectId),
      value: `${subject.totalScore}%`,
      subValue: `Grade ${subject.grade}${subject.remark ? ` · ${subject.remark}` : ''}`,
    })) ?? [];

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-forest-950">
      <View className="px-5 pt-3">
        <SegmentedTabs options={ACADEMICS_TABS} value={tab} onChange={setTab} />
        {termScope.terms.length > 1 ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {termScope.terms.map((term) => {
              const active = term.id === termId;
              return (
                <Pressable
                  key={term.id}
                  onPress={() => termScope.setTermId(term.id)}
                  className={`min-h-[36px] rounded-full px-3 py-2 ${
                    active ? 'bg-brand-500' : 'bg-white dark:bg-forest-900'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-neutral-900' : 'text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {term.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {tab === 'attendance' ? (
        <TimelineList sections={attendanceSections} loading={attendanceQuery.isLoading || termScope.isLoading} />
      ) : (
        <SummaryDetail
          title="Published results"
          summaryLabel="Term average"
          summaryValue={data?.averageScore != null ? `${data.averageScore}%` : '—'}
          rows={data?.published ? resultRows : []}
          loading={resultsQuery.isLoading || termScope.isLoading}
          errorMessage={
            resultsQuery.isError ? 'Could not load results. Pull to refresh and try again.' : undefined
          }
          emptyTitle={
            !data?.published
              ? 'Results not published yet for this term'
              : resultRows.length === 0
                ? 'No subject scores in this term'
                : undefined
          }
        />
      )}
    </View>
  );
}
