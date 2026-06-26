import type {
  AcademicTermResponse,
  AcademicYearResponse,
  CalendarEventResponse,
  PromotionRecordResponse,
} from '@loomis/contracts';

import { pickActiveYear, pickOpenTerm } from '@/lib/academic/academic-session-utils';
import {
  midTermBreakDate,
  openDayDate,
  resultDayDate,
  type CalendarPreferences,
} from '@/lib/academic/calendar-preferences';

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
  category: 'term' | 'enrollment' | 'census' | 'exam' | 'custom';
  description?: string;
  /** Set for school-added events so the UI can offer a delete action. */
  eventDbId?: string;
}

/**
 * Maps school-added calendar events into the timeline `CalendarEvent` shape.
 * Multi-day events note their range in the description; the start date drives
 * placement on the timeline.
 */
export function mapCustomCalendarEvents(events: CalendarEventResponse[]): CalendarEvent[] {
  return events.map((event) => ({
    id: `custom-${event.id}`,
    eventDbId: event.id,
    label: event.title,
    date: event.startDate,
    category: 'custom' as const,
    description:
      event.endDate && event.endDate !== event.startDate
        ? `${event.description ? `${event.description} ` : ''}(until ${event.endDate})`.trim()
        : event.description ?? undefined,
  }));
}

export function buildTermCalendarEvents(
  term: AcademicTermResponse,
  prefs?: CalendarPreferences,
): CalendarEvent[] {
  const calendarPrefs = prefs ?? null;
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

  if (calendarPrefs && term.startDate && term.endDate) {
    if (calendarPrefs.hasMidTermBreak) {
      events.push({
        id: `${term.id}-midterm`,
        label: 'Mid-term break',
        date: midTermBreakDate(term.startDate, term.endDate),
        category: 'term',
        description: 'School closed for mid-term break.',
      });
    }
    if (calendarPrefs.hasOpenDay) {
      events.push({
        id: `${term.id}-open-day`,
        label: 'Open day / PTA',
        date: openDayDate(term.endDate, term.examStartDate),
        category: 'term',
        description: 'Parents visit to see student progress.',
      });
    }
    if (calendarPrefs.hasResultDay) {
      events.push({
        id: `${term.id}-result-day`,
        label: 'Result day',
        date: resultDayDate(term.endDate),
        category: 'exam',
        description: 'Report cards available to parents after publish.',
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
