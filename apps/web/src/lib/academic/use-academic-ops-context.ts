'use client';

import type { ClassArmResponse, ClassLevelResponse } from '@loomis/contracts';
import { useClassStructure } from '@loomis/api-client';
import { useMemo, useState, useCallback, type SetStateAction } from 'react';

import { useSchoolAcademic } from '@/lib/academic/school-academic-context';

function classArmStorageKey(tenantId: string): string {
  return `loomis:ops-class-arm:${tenantId}`;
}

export function classArmOptions(
  arms: ClassArmResponse[],
  levels: ClassLevelResponse[],
): Array<{ id: string; label: string }> {
  return sortClassArms(arms, levels).map((arm) => {
    const level = levels.find((l) => l.id === arm.classLevelId);
    return { id: arm.id, label: `${level?.code ?? 'Class'} ${arm.name}` };
  });
}

/** Stable class order for defaults (JSS1 A before JSS3 B, etc.). */
export function sortClassArms(
  arms: ClassArmResponse[],
  levels: ClassLevelResponse[],
): ClassArmResponse[] {
  return [...arms].sort((a, b) => {
    const levelA = levels.find((l) => l.id === a.classLevelId);
    const levelB = levels.find((l) => l.id === b.classLevelId);
    const rankDiff = (levelA?.rank ?? 0) - (levelB?.rank ?? 0);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Operational scope for class-based screens.
 * Year and term come from the global school session — only class arm is local.
 */
export function useAcademicOpsContext(_tenantId: string) {
  const session = useSchoolAcademic();
  const storageKey = classArmStorageKey(_tenantId);
  const [classArmId, setClassArmIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined' || !_tenantId) return null;
    return sessionStorage.getItem(storageKey);
  });

  const setClassArmId = useCallback(
    (value: SetStateAction<string | null>) => {
      setClassArmIdState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (typeof window !== 'undefined' && _tenantId) {
          if (next) sessionStorage.setItem(storageKey, next);
          else sessionStorage.removeItem(storageKey);
        }
        return next;
      });
    },
    [_tenantId, storageKey],
  );

  const structureQuery = useClassStructure(_tenantId, session.yearId ?? '');
  const levels = structureQuery.data?.levels ?? [];
  const arms = useMemo(
    () => sortClassArms(structureQuery.data?.arms ?? [], levels),
    [structureQuery.data?.arms, levels],
  );
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
    openTerm: session.openTerm,
    activeClassArm,
    isHistoricalView: session.isHistoricalView,
    hasWorkingTerm: session.hasWorkingTerm,
  };
}

export type AcademicOpsContext = ReturnType<typeof useAcademicOpsContext>;
