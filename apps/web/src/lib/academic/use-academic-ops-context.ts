'use client';

import type { AcademicTermResponse, AcademicYearResponse, ClassArmResponse, ClassLevelResponse } from '@loomis/contracts';
import { useAcademicTerms, useAcademicYears, useClassStructure } from '@loomis/api-client';
import { useMemo, useState } from 'react';

function pickDefaultYear(years: AcademicYearResponse[]): AcademicYearResponse | null {
  return years.find((y) => y.status === 'active') ?? years.find((y) => y.status === 'draft') ?? years[0] ?? null;
}

function pickDefaultTerm(terms: AcademicTermResponse[]): AcademicTermResponse | null {
  return terms.find((t) => t.status === 'open') ?? terms.find((t) => t.status === 'census_locked') ?? terms[0] ?? null;
}

/** Shared term / year / class-arm context for academic ops screens. */
export function useAcademicOpsContext(tenantId: string) {
  const yearsQuery = useAcademicYears(tenantId);
  const years = yearsQuery.data?.academicYears ?? [];

  const [yearId, setYearId] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [classArmId, setClassArmId] = useState<string | null>(null);

  const resolvedYearId = yearId ?? pickDefaultYear(years)?.id ?? null;
  const termsQuery = useAcademicTerms(tenantId, resolvedYearId ?? '');
  const terms = termsQuery.data?.terms ?? [];
  const resolvedTermId = termId ?? pickDefaultTerm(terms)?.id ?? null;

  const structureQuery = useClassStructure(tenantId, resolvedYearId ?? '');
  const levels = structureQuery.data?.levels ?? [];
  const arms = structureQuery.data?.arms ?? [];

  const resolvedClassArmId = classArmId ?? arms[0]?.id ?? null;

  const activeYear = years.find((y) => y.id === resolvedYearId) ?? null;
  const activeTerm = terms.find((t) => t.id === resolvedTermId) ?? null;
  const activeClassArm = arms.find((a) => a.id === resolvedClassArmId) ?? null;

  const sortedYears = useMemo(
    () => [...years].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [years],
  );

  return {
    yearsQuery,
    termsQuery,
    structureQuery,
    sortedYears,
    terms,
    levels,
    arms,
    yearId: resolvedYearId,
    termId: resolvedTermId,
    classArmId: resolvedClassArmId,
    setYearId,
    setTermId,
    setClassArmId,
    activeYear,
    activeTerm,
    activeClassArm,
  };
}

export type AcademicOpsContext = ReturnType<typeof useAcademicOpsContext>;

export function classArmOptions(
  arms: ClassArmResponse[],
  levels: ClassLevelResponse[],
): Array<{ id: string; label: string }> {
  return arms.map((arm) => {
    const level = levels.find((l) => l.id === arm.classLevelId);
    return { id: arm.id, label: `${level?.code ?? 'Class'} ${arm.name}` };
  });
}
