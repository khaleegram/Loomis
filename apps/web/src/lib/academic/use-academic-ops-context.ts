'use client';

import type { ClassArmResponse, ClassLevelResponse } from '@loomis/contracts';
import { useClassStructure } from '@loomis/api-client';
import { useMemo, useState } from 'react';

import { useSchoolAcademic } from '@/lib/academic/school-academic-context';

export function classArmOptions(
  arms: ClassArmResponse[],
  levels: ClassLevelResponse[],
): Array<{ id: string; label: string }> {
  return arms.map((arm) => {
    const level = levels.find((l) => l.id === arm.classLevelId);
    return { id: arm.id, label: `${level?.code ?? 'Class'} ${arm.name}` };
  });
}

/**
 * Operational scope for class-based screens.
 * Year and term come from the global school session — only class arm is local.
 */
export function useAcademicOpsContext(_tenantId: string) {
  const session = useSchoolAcademic();
  const [classArmId, setClassArmId] = useState<string | null>(null);

  const structureQuery = useClassStructure(_tenantId, session.yearId ?? '');
  const levels = structureQuery.data?.levels ?? [];
  const arms = structureQuery.data?.arms ?? [];
  const resolvedClassArmId = classArmId ?? arms[0]?.id ?? null;
  const activeClassArm = arms.find((a) => a.id === resolvedClassArmId) ?? null;

  return {
    yearsQuery: session.yearsQuery,
    termsQuery: session.termsQuery,
    structureQuery,
    sortedYears: session.sortedYears,
    terms: session.terms,
    levels,
    arms,
    yearId: session.yearId,
    termId: session.termId,
    classArmId: resolvedClassArmId,
    setClassArmId,
    activeYear: session.activeYear,
    activeTerm: session.activeTerm,
    activeClassArm,
    isHistoricalView: session.isHistoricalView,
    hasWorkingTerm: session.hasWorkingTerm,
  };
}

export type AcademicOpsContext = ReturnType<typeof useAcademicOpsContext>;
