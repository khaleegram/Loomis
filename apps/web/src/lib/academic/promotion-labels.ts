import type { ClassLevelResponse, PromotionRecordResponse } from '@loomis/contracts';

export function classLevelName(
  levels: ClassLevelResponse[],
  levelId: string | null | undefined,
): string {
  if (!levelId) return '—';
  const level = levels.find((l) => l.id === levelId);
  return level ? `${level.name} (${level.code})` : levelId.slice(0, 8);
}

export function promotionOutcomeLabel(outcome: PromotionRecordResponse['outcome']): string {
  switch (outcome) {
    case 'promoted':
      return 'Promoted';
    case 'held_back':
      return 'Held back';
    case 'graduated':
      return 'Graduating';
    default:
      return outcome;
  }
}

export function promotionStatusLabel(status: PromotionRecordResponse['status']): string {
  return status === 'confirmed' ? 'Confirmed' : 'Awaiting review';
}
