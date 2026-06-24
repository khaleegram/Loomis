import type { ClassArmResponse, ClassLevelResponse, GradeBand } from '@loomis/contracts';

/** Default Nigerian-style grade bands used by scheme templates. */
export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { minScore: 70, maxScore: 100, grade: 'A', remark: 'Excellent' },
  { minScore: 60, maxScore: 69, grade: 'B', remark: 'Very Good' },
  { minScore: 50, maxScore: 59, grade: 'C', remark: 'Good' },
  { minScore: 45, maxScore: 49, grade: 'D', remark: 'Pass' },
  { minScore: 0, maxScore: 44, grade: 'F', remark: 'Fail' },
];

export interface GradingSchemeTemplate {
  id: string;
  label: string;
  continuousAssessmentWeight: number;
  examWeight: number;
  passMark: number;
  gradeBands: GradeBand[];
}

/** US-ACA-001 pre-built templates. */
export const GRADING_SCHEME_TEMPLATES: GradingSchemeTemplate[] = [
  {
    id: 'standard-40-60',
    label: 'Standard 40 / 60',
    continuousAssessmentWeight: 40,
    examWeight: 60,
    passMark: 40,
    gradeBands: DEFAULT_GRADE_BANDS,
  },
  {
    id: 'balanced-50-50',
    label: 'Balanced 50 / 50',
    continuousAssessmentWeight: 50,
    examWeight: 50,
    passMark: 40,
    gradeBands: DEFAULT_GRADE_BANDS,
  },
  {
    id: 'ca-heavy-60-40',
    label: 'CA-heavy 60 / 40',
    continuousAssessmentWeight: 60,
    examWeight: 40,
    passMark: 40,
    gradeBands: DEFAULT_GRADE_BANDS,
  },
];

export function formatClassArmLabel(
  arm: ClassArmResponse,
  levels: ClassLevelResponse[],
): string {
  const level = levels.find((l) => l.id === arm.classLevelId);
  return `${level?.code ?? 'Class'} ${arm.name}`;
}

/** Subject catalogue — opaque IDs until subjects module ships. */
const SUBJECT_LABELS: Record<string, string> = {
  '019c0000-0000-7000-8000-000000000001': 'Mathematics',
  '019c0000-0000-7000-8000-000000000002': 'English Language',
  '019c0000-0000-7000-8000-000000000003': 'Basic Science',
  '019c0000-0000-7000-8000-000000000004': 'Social Studies',
  '019c0000-0000-7000-8000-000000000005': 'Civic Education',
  '019c0000-0000-7000-8000-000000000006': 'Computer Studies',
  '019c0000-0000-7000-8000-000000000007': 'Physical & Health Education',
  '019c0000-0000-7000-8000-000000000008': 'Christian Religious Studies',
};

export const SCHOOL_SUBJECT_OPTIONS = Object.entries(SUBJECT_LABELS).map(([id, label]) => ({
  id,
  label,
}));

export function formatSubjectLabel(subjectId: string): string {
  return SUBJECT_LABELS[subjectId] ?? 'Subject';
}

export function formatTermLabel(
  termId: string,
  terms: Array<{ id: string; name?: string | null }>,
): string {
  const term = terms.find((t) => t.id === termId);
  return term?.name?.trim() || 'Term';
}

export function todayCalendarDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Monday-start week containing `anchor` (YYYY-MM-DD). */
export function weekDatesContaining(anchor: string): string[] {
  const [y, m, d] = anchor.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return Array.from({ length: 5 }, (_, i) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + i);
    return copy.toISOString().slice(0, 10);
  });
}

export function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString('en-NG', { weekday: 'short' });
}

export function shortDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}
