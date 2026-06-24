import type { AcademicTermResponse, AcademicTermStatus } from '@loomis/contracts';

import type { AcademicHubMetrics } from './academic-metrics';

export const LIFECYCLE_PHASES = [
  { key: 'draft' as const, label: 'Configure', short: 'Setup' },
  { key: 'open' as const, label: 'Open', short: 'Live' },
  { key: 'census_locked' as const, label: 'Platform fee recorded', short: 'Recorded' },
  { key: 'closed' as const, label: 'Close', short: 'Done' },
];

const STATUS_INDEX: Record<AcademicTermStatus, number> = {
  draft: 0,
  open: 1,
  census_locked: 2,
  closed: 3,
};

export function termLifecycleProgress(status: AcademicTermStatus): number {
  return ((STATUS_INDEX[status] + 1) / LIFECYCLE_PHASES.length) * 100;
}

export function termPhaseIndex(status: AcademicTermStatus): number {
  return STATUS_INDEX[status];
}

export interface AcademicNextAction {
  title: string;
  description: string;
  href: string;
  cta: string;
  urgency: 'normal' | 'attention' | 'ready';
}

export function resolveNextAcademicAction(
  metrics: AcademicHubMetrics,
  terms: AcademicTermResponse[],
  yearId: string | null,
  focusTerm: AcademicTermResponse | null,
): AcademicNextAction {
  const termId = focusTerm?.id ?? null;

  if (metrics.stagedPromotions > 0) {
    return {
      title: 'Promotions awaiting your sign-off',
      description: `${metrics.stagedPromotions} staged record${metrics.stagedPromotions === 1 ? '' : 's'} need Principal confirmation before year-end.`,
      href: '/school/academic/promotions',
      cta: 'Review promotions',
      urgency: 'attention',
    };
  }

  if (focusTerm?.status === 'open' && yearId && termId) {
    return {
      title: 'Term is live',
      description: 'Platform fee is recorded automatically on the billing date. Manage school fee balances under Finance.',
      href: '/school/finance/balances',
      cta: 'View balances',
      urgency: 'normal',
    };
  }

  if (focusTerm?.status === 'census_locked') {
    return {
      title: 'Close the term',
      description: 'Platform fee is recorded. Resolve gate checks and close the term when ready.',
      href: '/school/academic/sessions',
      cta: 'Go to sessions',
      urgency: 'attention',
    };
  }

  if (focusTerm?.status === 'draft') {
    return {
      title: 'Configure and open the term',
      description: 'Set dates, enrollment window, and exam periods — then open the term for school operations.',
      href: '/school/academic/sessions',
      cta: 'Open term studio',
      urgency: 'normal',
    };
  }

  const draftTerm = terms.find((t) => t.status === 'draft');
  if (draftTerm) {
    return {
      title: `Prepare ${draftTerm.name}`,
      description: 'A draft term is waiting for configuration before the school calendar can go live.',
      href: '/school/academic/sessions',
      cta: 'Configure term',
      urgency: 'normal',
    };
  }

  if (!metrics.activeYearLabel) {
    return {
      title: 'Create your first academic year',
      description: 'Start the session lifecycle by defining the school calendar period.',
      href: '/school/academic/sessions',
      cta: 'Create year',
      urgency: 'normal',
    };
  }

  return {
    title: 'Review the academic calendar',
    description: 'Key dates for enrollment, exams, and platform fee billing are visible to staff once configured.',
    href: '/school/academic/calendar',
    cta: 'View calendar',
    urgency: 'normal',
  };
}

export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const [y, m, d] = dateIso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
