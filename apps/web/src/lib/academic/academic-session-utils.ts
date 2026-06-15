import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';

/** Active academic year for school operations (ASM). */
export function pickActiveYear(years: AcademicYearResponse[]): AcademicYearResponse | null {
  return years.find((y) => y.status === 'active') ?? years.find((y) => y.status === 'draft') ?? years[0] ?? null;
}

/** Current working term — open term when the school is operating. */
export function pickOpenTerm(terms: AcademicTermResponse[]): AcademicTermResponse | null {
  return (
    terms.find((t) => t.status === 'open') ??
    terms.find((t) => t.status === 'census_locked') ??
    terms.find((t) => t.status === 'draft') ??
    terms[0] ??
    null
  );
}

/** @deprecated Use pickActiveYear */
export const pickDefaultYear = pickActiveYear;

/** @deprecated Use pickOpenTerm */
export const pickDefaultTerm = pickOpenTerm;

export function sortYearsDesc(years: AcademicYearResponse[]): AcademicYearResponse[] {
  return [...years].sort((a, b) => b.startDate.localeCompare(a.startDate));
}
