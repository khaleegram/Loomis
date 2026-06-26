import type { AcademicTermResponse, AcademicTermStatus } from '@loomis/contracts';

import type { AcademicHubMetrics } from './academic-metrics';

export const LIFECYCLE_PHASES = [
  { key: 'draft' as const, label: 'Upcoming', short: 'Next' },
  { key: 'open' as const, label: 'Current term', short: 'Live' },
  { key: 'census_locked' as const, label: 'Billing recorded', short: 'Billing' },
  { key: 'closed' as const, label: 'Completed', short: 'Done' },
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
      title: `${focusTerm.name} is live`,
      description: 'Enroll students, take attendance, and collect fees. Platform billing runs automatically on the scheduled date.',
      href: '/school/students',
      cta: 'Go to students',
      urgency: 'normal',
    };
  }

  if (focusTerm?.status === 'census_locked') {
    return {
      title: `End ${focusTerm.name} when ready`,
      description: 'After results are published, end the term. The next term opens on its start date automatically.',
      href: '/school/academic/sessions',
      cta: 'School year',
      urgency: 'attention',
    };
  }

  if (!metrics.activeYearLabel) {
    return {
      title: 'Start your school year',
      description: 'Name your year and pick the dates — Loomis creates three terms and opens the current one for you.',
      href: '/school/academic/sessions',
      cta: 'Set up now',
      urgency: 'attention',
    };
  }

  return {
    title: 'Your school calendar',
    description: 'Term dates and platform billing are set. Staff and parents see the calendar automatically.',
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
