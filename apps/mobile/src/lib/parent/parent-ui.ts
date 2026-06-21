import { LOOMIS } from '@loomis/ui-mobile';
import type { ParentChildCardResponse } from '@loomis/contracts';

/** Shared typography + elevation — matches web ACADEMIC_UI density. */
export const PARENT_UI = {
  display: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -1,
    lineHeight: 38,
    color: LOOMIS.neutral[900],
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    color: LOOMIS.neutral[900],
  },
  section: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.6,
    color: LOOMIS.neutral[400],
    textTransform: 'uppercase' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: LOOMIS.neutral[500],
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: LOOMIS.brand[700],
  },
  card: {
    shadowColor: LOOMIS.brand[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLg: {
    shadowColor: LOOMIS.brand[800],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  border: {
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.22)',
  },
  cta: {
    backgroundColor: '#c9a96e',
    borderRadius: 14,
    minHeight: 48,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: LOOMIS.neutral[900],
  },
} as const;

export function studentDisplayName(card: ParentChildCardResponse): string {
  const name = card.studentFirstName?.trim();
  if (name && name.toLowerCase() !== 'student') return name;
  return card.classArmLabel ? `${card.classArmLabel} ward` : 'Your child';
}

export function formatTodayLabel(date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function shortenSchoolName(name: string, max = 22): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1).trim()}…`;
}
