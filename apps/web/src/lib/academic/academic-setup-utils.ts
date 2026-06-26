import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';

import { pickOpenTerm } from '@/lib/academic/academic-session-utils';

export type SchoolYearStepMode = 'create' | 'finalize' | 'ready';

export type AcademicSetupWizardStep =
  | 'school-year'
  | 'levels'
  | 'arms-question'
  | 'arms-picker'
  | 'calendar'
  | 'done';

export function pickStrictActiveYear(years: AcademicYearResponse[]): AcademicYearResponse | null {
  return years.find((y) => y.status === 'active') ?? null;
}

export function pickDraftYear(years: AcademicYearResponse[]): AcademicYearResponse | null {
  return years.find((y) => y.status === 'draft') ?? null;
}

/** Year record used for arms and calendar (active preferred, else draft). */
export function pickWorkingYear(years: AcademicYearResponse[]): AcademicYearResponse | null {
  return pickStrictActiveYear(years) ?? pickDraftYear(years) ?? years[0] ?? null;
}

export function resolveSchoolYearStepMode(
  activeYear: AcademicYearResponse | null,
  draftYear: AcademicYearResponse | null,
  terms: AcademicTermResponse[],
): SchoolYearStepMode {
  if (draftYear && !activeYear) return 'finalize';
  if (activeYear) {
    const openTerm = pickOpenTerm(terms);
    if (openTerm && (openTerm.status === 'open' || openTerm.status === 'census_locked')) {
      return 'ready';
    }
  }
  return 'create';
}

export function resolveInitialSetupStep(input: {
  years: AcademicYearResponse[];
  terms: AcademicTermResponse[];
  classLevelCount: number;
}): AcademicSetupWizardStep {
  const activeYear = pickStrictActiveYear(input.years);
  const draftYear = pickDraftYear(input.years);
  const yearMode = resolveSchoolYearStepMode(activeYear, draftYear, input.terms);

  if (!activeYear && !draftYear) return 'school-year';
  if (yearMode === 'finalize') return 'school-year';
  if (yearMode === 'create' && !activeYear) return 'school-year';
  if (input.classLevelCount === 0) return 'levels';
  return 'levels';
}

export function isAcademicSetupIncomplete(input: {
  years: AcademicYearResponse[];
  terms: AcademicTermResponse[];
  classLevelCount: number;
}): boolean {
  const activeYear = pickStrictActiveYear(input.years);
  const draftYear = pickDraftYear(input.years);
  if (!activeYear && !draftYear) return true;
  if (draftYear && !activeYear) return true;
  const openTerm = pickOpenTerm(input.terms);
  if (activeYear && !openTerm) return true;
  if (input.classLevelCount === 0) return true;
  return false;
}
