import type { ConfigureTermRequest } from '@loomis/contracts';

const TERM_NAMES = ['First Term', 'Second Term', 'Third Term', 'Fourth Term', 'Fifth Term', 'Sixth Term'];

export function defaultTermName(sequence: number): string {
  return TERM_NAMES[sequence - 1] ?? `Term ${sequence}`;
}

function parseCalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function formatCalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayCalDate(): string {
  return formatCalDate(new Date());
}

export function addCalendarDays(iso: string, days: number): string {
  const d = parseCalDate(iso);
  d.setDate(d.getDate() + days);
  return formatCalDate(d);
}

function minCalDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export interface TermScheduleSegment {
  sequence: number;
  name: string;
  startDate: string;
  endDate: string;
}

/**
 * Splits a school year into equal calendar terms (Nigerian schools typically use 3).
 */
export function splitYearIntoTermSchedules(
  yearStart: string,
  yearEnd: string,
  termCount: number,
): TermScheduleSegment[] {
  const end = parseCalDate(yearEnd);
  let cursor = parseCalDate(yearStart);
  const totalDays =
    Math.floor((end.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const baseDays = Math.floor(totalDays / termCount);
  const segments: TermScheduleSegment[] = [];

  for (let i = 0; i < termCount; i++) {
    const startDate = formatCalDate(cursor);
    let termEnd: Date;
    if (i === termCount - 1) {
      termEnd = end;
    } else {
      termEnd = new Date(cursor);
      termEnd.setDate(termEnd.getDate() + baseDays - 1);
    }
    segments.push({
      sequence: i + 1,
      name: defaultTermName(i + 1),
      startDate,
      endDate: formatCalDate(termEnd),
    });
    cursor = new Date(termEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  return segments;
}

/** Smart defaults — enrollment closes ~2 weeks after term start; billing snapshot same day. */
export function termScheduleToConfigureInput(segment: TermScheduleSegment): ConfigureTermRequest {
  const enrollmentClose = minCalDate(addCalendarDays(segment.startDate, 14), segment.endDate);
  const censusSnapshotDate = enrollmentClose;
  const examEnd = segment.endDate;
  const examStartCandidate = addCalendarDays(segment.endDate, -14);
  const examStart =
    examStartCandidate >= segment.startDate ? examStartCandidate : segment.startDate;

  return {
    name: segment.name,
    startDate: segment.startDate,
    endDate: segment.endDate,
    enrollmentWindowOpenDate: segment.startDate,
    enrollmentWindowCloseDate: enrollmentClose,
    censusSnapshotDate,
    examStartDate: examStart,
    examEndDate: examEnd,
  };
}

/**
 * Which term should be live today. If the year has not started, First Term is opened
 * so admissions and fee setup can begin immediately.
 */
export function pickTermSequenceToOpen(segments: TermScheduleSegment[], asOfDate?: string): number {
  const today = asOfDate ?? todayCalDate();
  if (segments.length === 0) return 1;

  for (const seg of segments) {
    if (today >= seg.startDate && today <= seg.endDate) {
      return seg.sequence;
    }
  }

  if (today < segments[0]!.startDate) {
    return 1;
  }

  return segments[segments.length - 1]!.sequence;
}
