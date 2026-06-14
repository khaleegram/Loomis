import type { GradebookEntryResponse } from '@loomis/contracts';

export interface GradebookProgress {
  complete: number;
  locked: number;
  pendingCorrection: number;
  incomplete: number;
  total: number;
}

export function computeGradebookProgress(
  entries: GradebookEntryResponse[],
  rosterCount: number,
): GradebookProgress {
  const complete = entries.filter(
    (entry) => entry.continuousAssessmentScore != null && entry.examScore != null,
  ).length;
  const locked = entries.filter((entry) => entry.status === 'submitted').length;
  const pendingCorrection = entries.filter((entry) => entry.status === 'correction_pending').length;
  const incomplete = Math.max(0, rosterCount - complete);

  return {
    complete,
    locked,
    pendingCorrection,
    incomplete,
    total: rosterCount,
  };
}

export function gradebookCompletionPercent(progress: GradebookProgress): number {
  if (progress.total === 0) return 0;
  return Math.round((progress.complete / progress.total) * 100);
}

export function isGradebookFullyLocked(progress: GradebookProgress): boolean {
  return progress.total > 0 && progress.locked >= progress.total;
}
