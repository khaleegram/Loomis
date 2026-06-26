/**
 * Calendar preferences answered during academic setup. Persisted through the
 * tenant-scoped Academic setup preferences API and used to enrich generated term
 * calendars without manual event entry.
 */
export interface CalendarPreferences {
  hasMidTermBreak: boolean;
  hasOpenDay: boolean;
  hasResultDay: boolean;
}

export const DEFAULT_CALENDAR_PREFERENCES: CalendarPreferences = {
  hasMidTermBreak: true,
  hasOpenDay: true,
  hasResultDay: true,
};

/** Mid-term break: Monday of the week at ~45% through the term. */
export function midTermBreakDate(termStart: string, termEnd: string): string {
  const start = new Date(`${termStart}T12:00:00`);
  const end = new Date(`${termEnd}T12:00:00`);
  const mid = new Date(start.getTime() + (end.getTime() - start.getTime()) * 0.45);
  const day = mid.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  mid.setDate(mid.getDate() + mondayOffset);
  return mid.toISOString().slice(0, 10);
}

/** Result day: 3 school days before term end. */
export function resultDayDate(termEnd: string): string {
  const end = new Date(`${termEnd}T12:00:00`);
  end.setDate(end.getDate() - 3);
  return end.toISOString().slice(0, 10);
}

/** Open day: 1 week before exams start, or 2 weeks before term end if no exam dates. */
export function openDayDate(
  termEnd: string,
  examStart: string | null | undefined,
): string {
  if (examStart) {
    const exam = new Date(`${examStart}T12:00:00`);
    exam.setDate(exam.getDate() - 7);
    return exam.toISOString().slice(0, 10);
  }
  const end = new Date(`${termEnd}T12:00:00`);
  end.setDate(end.getDate() - 14);
  return end.toISOString().slice(0, 10);
}
