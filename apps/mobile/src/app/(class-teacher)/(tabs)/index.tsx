import { router } from 'expo-router';
import { useAcademicTerms, useAcademicYears, useTeachingStaffContext } from '@loomis/api-client';
import { HomeHub } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';
import { pickOpenTermId } from '@/lib/use-parent-child-context';

export default function ClassTeacherHomeScreen() {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? '';
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYearId = years.find((y) => y.status === 'active')?.id ?? years[0]?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, activeYearId ?? '');
  const termId = pickOpenTermId(termsQuery.data?.terms);
  const contextQuery = useTeachingStaffContext(tenantId, termId);

  const classLabel = contextQuery.data?.classTeacherAssignment?.classArmLabel ?? 'Your class';

  return (
    <HomeHub
      consoleLabel="Class Teacher"
      userName={session?.displayName}
      description="Mark attendance offline and sync when back online."
      loading={contextQuery.isLoading}
      statChips={[{ id: 'class', label: 'Class', value: classLabel }]}
      actions={[
        {
          id: 'attendance',
          label: 'Mark attendance',
          onPress: () => router.push('/(class-teacher)/(tabs)/attendance'),
        },
      ]}
    />
  );
}
