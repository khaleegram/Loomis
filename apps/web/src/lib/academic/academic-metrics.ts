import type { AcademicTermResponse, AcademicYearResponse, PromotionRecordResponse } from '@loomis/contracts';

import { pickActiveYear, pickOpenTerm } from '@/lib/academic/academic-session-utils';

export { pickActiveYear, pickOpenTerm } from '@/lib/academic/academic-session-utils';

export interface AcademicHubMetrics {
  yearCount: number;
  activeYearLabel: string | null;
  openTermName: string | null;
  termStatus: AcademicTermResponse['status'] | null;
  draftTermCount: number;
  censusLockedCount: number;
  closedTermCount: number;
  stagedPromotions: number;
  confirmedPromotions: number;
  graduatedCount: number;
}

export function computeAcademicMetrics(
  years: AcademicYearResponse[],
  terms: AcademicTermResponse[],
  promotions: PromotionRecordResponse[] = [],
): AcademicHubMetrics {
  const activeYear = pickActiveYear(years);
  const openTerm = pickOpenTerm(terms);

  return {
    yearCount: years.length,
    activeYearLabel: activeYear?.label ?? null,
    openTermName: openTerm?.name ?? null,
    termStatus: openTerm?.status ?? null,
    draftTermCount: terms.filter((t) => t.status === 'draft').length,
    censusLockedCount: terms.filter((t) => t.status === 'census_locked').length,
    closedTermCount: terms.filter((t) => t.status === 'closed').length,
    stagedPromotions: promotions.filter((p) => p.status === 'proposed').length,
    confirmedPromotions: promotions.filter((p) => p.status === 'confirmed').length,
    graduatedCount: promotions.filter((p) => p.outcome === 'graduated').length,
  };
}

export interface CalendarEvent {
  id: string;
  label: string;
  date: string;
  category: 'term' | 'enrollment' | 'census' | 'exam';
  description?: string;
}

export function buildTermCalendarEvents(term: AcademicTermResponse): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  if (term.startDate) {
    events.push({
      id: `${term.id}-start`,
      label: 'Term begins',
      date: term.startDate,
      category: 'term',
    });
  }
  if (term.enrollmentWindowOpenDate) {
    events.push({
      id: `${term.id}-enroll-open`,
      label: 'Enrollment opens',
      date: term.enrollmentWindowOpenDate,
      category: 'enrollment',
    });
  }
  if (term.enrollmentWindowCloseDate) {
    events.push({
      id: `${term.id}-enroll-close`,
      label: 'Enrollment closes',
      date: term.enrollmentWindowCloseDate,
      category: 'enrollment',
    });
  }
  if (term.censusSnapshotDate) {
    events.push({
      id: `${term.id}-census`,
      label: 'Platform billing date',
      date: term.censusSnapshotDate,
      category: 'census',
      description: 'Loomis records the platform fee automatically on this date.',
    });
  }
  if (term.examStartDate) {
    events.push({
      id: `${term.id}-exam-start`,
      label: 'Examinations begin',
      date: term.examStartDate,
      category: 'exam',
    });
  }
  if (term.examEndDate) {
    events.push({
      id: `${term.id}-exam-end`,
      label: 'Examinations end',
      date: term.examEndDate,
      category: 'exam',
    });
  }
  if (term.endDate) {
    events.push({
      id: `${term.id}-end`,
      label: 'Term ends',
      date: term.endDate,
      category: 'term',
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
