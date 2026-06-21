import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  useAcademicTerms,
  useAcademicYears,
  useGradebookEntries,
  useTeachingStaffContext,
  useUpsertGradebookEntry,
} from '@loomis/api-client';
import { Card, EmptyState, GradeEntrySheet, SectionLabel, Skeleton } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';
import { pickOpenTermId } from '@/lib/use-parent-child-context';

export default function TeacherGradebookScreen() {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const termId = pickOpenTermId(termsQuery.data?.terms);
  const contextQuery = useTeachingStaffContext(tenantId, termId);
  const assignment = contextQuery.data?.subjectAssignments[0] ?? null;

  const filters =
    assignment && termId
      ? { termId, classArmId: assignment.classArmId, subjectId: assignment.subjectId }
      : null;

  const gradebookQuery = useGradebookEntries(tenantId, filters);
  const upsert = useUpsertGradebookEntry(tenantId, filters ?? { termId: '', classArmId: '' });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState<{ studentId: string; name: string } | null>(
    null,
  );

  const entries = gradebookQuery.data?.entries ?? [];

  const rows = useMemo(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        studentId: entry.studentId,
        label: entry.studentId.slice(0, 8),
        total: entry.totalScore,
      })),
    [entries],
  );

  return (
    <View className="flex-1 bg-neutral-50 px-5 pt-4 dark:bg-forest-950">
      <SectionLabel>Gradebook drafts</SectionLabel>
      {gradebookQuery.isLoading ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title="No gradebook entries" description="Select a class with published exam config." />
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => {
              setActiveEntry({ studentId: row.studentId, name: row.label });
              setSheetOpen(true);
            }}
          >
            <Card className="mb-3 mt-3">
              <Text className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
                Student {row.label}
              </Text>
              <Text className="text-xs text-neutral-500">Total: {row.total ?? '—'}</Text>
            </Card>
          </Pressable>
        ))
      )}

      <GradeEntrySheet
        visible={sheetOpen}
        studentName={activeEntry?.name ?? ''}
        componentLabel="Continuous assessment"
        maxScore={100}
        onClose={() => setSheetOpen(false)}
        saving={upsert.isPending}
        onSave={(score) => {
          if (!activeEntry || !assignment) return;
          const entry = entries.find((e) => e.studentId === activeEntry.studentId);
          if (!entry) return;
          void upsert
            .mutateAsync({
              examConfigId: entry.examConfigId,
              studentId: activeEntry.studentId,
              continuousAssessmentScore: score,
              examScore: entry.examScore,
            })
            .then(() => setSheetOpen(false));
        }}
      />
    </View>
  );
}
