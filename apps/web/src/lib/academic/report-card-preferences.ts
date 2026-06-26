/**
 * Report card display preferences - answered once during setup, applied when
 * generating/previewing report cards for parents and students.
 */
export interface ReportCardPreferences {
  showScores: boolean;
  showGrade: boolean;
  showPosition: boolean;
  showAttendance: boolean;
  showTeacherComment: boolean;
  showPrincipalComment: boolean;
  useSchoolLogo: boolean;
}

export const DEFAULT_REPORT_CARD_PREFERENCES: ReportCardPreferences = {
  showScores: true,
  showGrade: true,
  showPosition: true,
  showAttendance: true,
  showTeacherComment: true,
  showPrincipalComment: true,
  useSchoolLogo: true,
};

