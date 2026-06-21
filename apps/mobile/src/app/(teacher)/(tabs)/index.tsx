import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useAcademicTerms, useAcademicYears, useTeachingStaffContext } from '@loomis/api-client';
import { HomeHub, Card, SectionLabel } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';
import { pickOpenTermId } from '@/lib/use-parent-child-context';

export default function TeacherHomeScreen() {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const termId = pickOpenTermId(termsQuery.data?.terms);
  const contextQuery = useTeachingStaffContext(tenantId, termId);

  const assignments = contextQuery.data?.subjectAssignments ?? [];

  return (
    <HomeHub
      consoleLabel="Teacher"
      userName={session?.displayName}
      description="Enter grades for your assigned subjects."
      loading={contextQuery.isLoading}
      statChips={[
        { id: 'subjects', label: 'Subjects', value: String(assignments.length) },
      ]}
      actions={[
        {
          id: 'gradebook',
          label: 'Open gradebook',
          onPress: () => router.push('/(teacher)/(tabs)/gradebook'),
        },
      ]}
      preview={
        assignments.length > 0 ? (
          <View className="gap-2">
            {assignments.map((item) => (
              <Card key={`${item.classArmId}:${item.subjectId}`} padded className="mb-0">
                <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                  {item.classArmLabel ?? item.classArmId.slice(0, 8)}
                </Text>
                <SectionLabel className="mt-1">Subject {item.subjectId.slice(0, 8)}</SectionLabel>
              </Card>
            ))}
          </View>
        ) : undefined
      }
    />
  );
}
