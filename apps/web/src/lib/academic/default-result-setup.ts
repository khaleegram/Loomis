import type { CreateGradingSchemeRequest, GradeBand } from '@loomis/contracts';

/** Standard Nigerian CA + Exam split. */
export const DEFAULT_CA_WEIGHT = 40;
export const DEFAULT_EXAM_WEIGHT = 60;
export const DEFAULT_PASS_MARK = 40;

/** Standard A-F grade bands used by most Nigerian private schools. */
export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { minScore: 75, maxScore: 100, grade: 'A', remark: 'Excellent' },
  { minScore: 70, maxScore: 74, grade: 'B', remark: 'Very Good' },
  { minScore: 65, maxScore: 69, grade: 'C', remark: 'Good' },
  { minScore: 60, maxScore: 64, grade: 'D', remark: 'Credit' },
  { minScore: 50, maxScore: 59, grade: 'E', remark: 'Pass' },
  { minScore: 0, maxScore: 49, grade: 'F', remark: 'Fail' },
];

export interface ResultSetupPreferences {
  caWeight: number;
  examWeight: number;
  useGrades: boolean;
  calculatePosition: boolean;
  showPositionOnReport: boolean;
}

export const DEFAULT_RESULT_PREFERENCES: ResultSetupPreferences = {
  caWeight: DEFAULT_CA_WEIGHT,
  examWeight: DEFAULT_EXAM_WEIGHT,
  useGrades: true,
  calculatePosition: true,
  showPositionOnReport: true,
};

export function buildGradingSchemePayload(
  prefs: ResultSetupPreferences,
): CreateGradingSchemeRequest {
  return {
    name: 'Standard (CA + Exam)',
    continuousAssessmentWeight: prefs.caWeight,
    examWeight: prefs.examWeight,
    passMark: DEFAULT_PASS_MARK,
    gradeBands: prefs.useGrades ? DEFAULT_GRADE_BANDS : [{ minScore: 0, maxScore: 100, grade: 'N/A', remark: null }],
    isDefault: true,
  };
}
