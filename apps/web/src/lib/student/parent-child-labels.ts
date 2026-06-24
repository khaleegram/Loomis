import type { ParentChildCardResponse } from '@loomis/contracts';

import { studentDisplayName } from '@/lib/student/student-labels';

type ParentChildNameFields = Pick<
  ParentChildCardResponse,
  'studentFirstName' | 'studentLastName' | 'studentDisplayName' | 'schoolName'
>;

export function parentChildName(card: ParentChildNameFields): string {
  if (card.studentDisplayName?.trim()) {
    return card.studentDisplayName.trim();
  }
  return studentDisplayName(card.studentFirstName, card.studentLastName ?? '');
}

export function parentChildSelectorLabel(card: ParentChildNameFields): string {
  return `${parentChildName(card)} · ${card.schoolName}`;
}
