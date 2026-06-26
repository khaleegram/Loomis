/**
 * The standard Nigerian school class ladder, used as the prefilled default in the
 * question-based academic setup. Schools toggle which levels they offer (many stop
 * at Primary 5 or JSS3, or don't run a nursery section) — the wizard never forces a
 * level the school doesn't have.
 *
 * Stages let the wizard group the questions ("Do you run a nursery section?" etc.)
 * instead of showing a flat list of 14 checkboxes.
 */
export type LadderStage = 'nursery' | 'primary' | 'junior' | 'senior';

export interface LadderLevel {
  /** Stable code stored on the class level (<=30 chars). */
  code: string;
  /** Friendly display name. */
  name: string;
  /** Short label used on chips. */
  short: string;
  stage: LadderStage;
  /**
   * Less common levels (e.g. Pre-Nursery, Nursery 3) that are offered as options
   * but left unchecked in the smart default. Schools opt in if they run them.
   */
  defaultOff?: boolean;
}

export const LADDER_STAGES: { id: LadderStage; label: string; question: string }[] = [
  { id: 'nursery', label: 'Nursery / Pre-school', question: 'Do you run a nursery section?' },
  { id: 'primary', label: 'Primary', question: 'Which primary classes do you run?' },
  { id: 'junior', label: 'Junior Secondary (JSS)', question: 'Do you run junior secondary?' },
  { id: 'senior', label: 'Senior Secondary (SS)', question: 'Do you run senior secondary?' },
];

/** Full default ladder in progression order (rank is assigned from this order). */
export const DEFAULT_CLASS_LADDER: LadderLevel[] = [
  { code: 'PRENUR', name: 'Pre-Nursery', short: 'Pre-Nursery', stage: 'nursery', defaultOff: true },
  { code: 'NUR1', name: 'Nursery 1', short: 'Nursery 1', stage: 'nursery' },
  { code: 'NUR2', name: 'Nursery 2', short: 'Nursery 2', stage: 'nursery' },
  { code: 'NUR3', name: 'Nursery 3', short: 'Nursery 3', stage: 'nursery', defaultOff: true },
  { code: 'PRY1', name: 'Primary 1', short: 'Primary 1', stage: 'primary' },
  { code: 'PRY2', name: 'Primary 2', short: 'Primary 2', stage: 'primary' },
  { code: 'PRY3', name: 'Primary 3', short: 'Primary 3', stage: 'primary' },
  { code: 'PRY4', name: 'Primary 4', short: 'Primary 4', stage: 'primary' },
  { code: 'PRY5', name: 'Primary 5', short: 'Primary 5', stage: 'primary' },
  { code: 'PRY6', name: 'Primary 6', short: 'Primary 6', stage: 'primary' },
  { code: 'JSS1', name: 'JSS 1', short: 'JSS 1', stage: 'junior' },
  { code: 'JSS2', name: 'JSS 2', short: 'JSS 2', stage: 'junior' },
  { code: 'JSS3', name: 'JSS 3', short: 'JSS 3', stage: 'junior' },
  { code: 'SS1', name: 'SS 1', short: 'SS 1', stage: 'senior' },
  { code: 'SS2', name: 'SS 2', short: 'SS 2', stage: 'senior' },
  { code: 'SS3', name: 'SS 3', short: 'SS 3', stage: 'senior' },
];

/** Letters offered when picking arms (A–H covers any realistic stream count). */
export const ARM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

/**
 * Turns the set of selected level codes into a ranked, contract-ready payload.
 * Rank follows ladder order; the last selected level is marked terminal (graduation).
 */
export function buildLevelsPayload(selectedCodes: Set<string>): {
  code: string;
  name: string;
  rank: number;
  isTerminal: boolean;
}[] {
  const ordered = DEFAULT_CLASS_LADDER.filter((l) => selectedCodes.has(l.code));
  return ordered.map((level, index) => ({
    code: level.code,
    name: level.name,
    rank: index + 1,
    isTerminal: index === ordered.length - 1,
  }));
}
