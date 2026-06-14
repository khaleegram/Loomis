/** CA and exam scores are entered on their weight scale (e.g. /40 + /60 = /100). */

export function computeGradebookTotal(ca: number, exam: number): number {
  return ca + exam;
}

export function isValidComponentScore(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

export function componentScoreError(value: number, max: number, label: string): string | null {
  if (Number.isNaN(value) || value < 0) return `${label} cannot be negative.`;
  if (value > max) return `${label} cannot exceed ${max}.`;
  return null;
}

export function formatScoreColumnLabel(label: 'CA' | 'Exam', max: number): string {
  return `${label} (/${max})`;
}
