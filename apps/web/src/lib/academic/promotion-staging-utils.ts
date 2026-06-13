import type {
  ClassArmResponse,
  ProgressionResponse,
  PromotionDecision,
  PromotionOutcome,
  TermEnrollmentRosterEntry,
} from '@loomis/contracts';

export interface StagingRowState {
  studentId: string;
  fromClassLevelId: string;
  fromClassArmId: string;
  outcome: PromotionOutcome;
  toClassLevelId: string | null;
  toClassArmId: string | null;
  heldBackReason: string;
}

export function defaultStagingRow(
  entry: TermEnrollmentRosterEntry,
  progressions: ProgressionResponse[],
  destinationArms: ClassArmResponse[],
): StagingRowState {
  const progression = progressions.find((p) => p.fromClassLevelId === entry.classLevelId);

  if (progression?.isTerminal) {
    return {
      studentId: entry.studentId,
      fromClassLevelId: entry.classLevelId,
      fromClassArmId: entry.classArmId,
      outcome: 'graduated',
      toClassLevelId: null,
      toClassArmId: null,
      heldBackReason: '',
    };
  }

  const toLevelId = progression?.toClassLevelId ?? null;
  const defaultArm =
    toLevelId != null
      ? destinationArms.find((arm) => arm.classLevelId === toLevelId)
      : undefined;

  return {
    studentId: entry.studentId,
    fromClassLevelId: entry.classLevelId,
    fromClassArmId: entry.classArmId,
    outcome: 'promoted',
    toClassLevelId: toLevelId,
    toClassArmId: defaultArm?.id ?? null,
    heldBackReason: '',
  };
}

export function buildStagingRows(
  roster: TermEnrollmentRosterEntry[],
  progressions: ProgressionResponse[],
  destinationArms: ClassArmResponse[],
): StagingRowState[] {
  return roster.map((entry) => defaultStagingRow(entry, progressions, destinationArms));
}

export function stagingRowToDecision(row: StagingRowState): PromotionDecision {
  if (row.outcome === 'graduated') {
    return {
      studentId: row.studentId,
      fromClassLevelId: row.fromClassLevelId,
      fromClassArmId: row.fromClassArmId,
      outcome: 'graduated',
      toClassLevelId: null,
      toClassArmId: null,
    };
  }

  if (row.outcome === 'held_back') {
    return {
      studentId: row.studentId,
      fromClassLevelId: row.fromClassLevelId,
      fromClassArmId: row.fromClassArmId,
      outcome: 'held_back',
      toClassLevelId: row.fromClassLevelId,
      toClassArmId: row.fromClassArmId,
      heldBackReason: row.heldBackReason.trim(),
    };
  }

  return {
    studentId: row.studentId,
    fromClassLevelId: row.fromClassLevelId,
    fromClassArmId: row.fromClassArmId,
    outcome: 'promoted',
    toClassLevelId: row.toClassLevelId,
    toClassArmId: row.toClassArmId,
  };
}

export function validateStagingRows(rows: StagingRowState[]): string | null {
  for (const row of rows) {
    if (row.outcome === 'held_back') {
      if (row.heldBackReason.trim().length < 3) {
        return 'Each held-back student needs a documented reason (min 3 characters).';
      }
      continue;
    }

    if (row.outcome === 'graduated') continue;

    if (!row.toClassLevelId || !row.toClassArmId) {
      return 'Promoted students need a destination class arm in the next year.';
    }
  }

  return null;
}
