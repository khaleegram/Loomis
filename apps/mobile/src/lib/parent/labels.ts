const SUBJECT_LABELS: Record<string, string> = {
  '019c0000-0000-7000-8000-000000000001': 'Mathematics',
  '019c0000-0000-7000-8000-000000000002': 'English Language',
  '019c0000-0000-7000-8000-000000000003': 'Basic Science',
  '019c0000-0000-7000-8000-000000000004': 'Social Studies',
  '019c0000-0000-7000-8000-000000000005': 'Civic Education',
  '019c0000-0000-7000-8000-000000000006': 'Computer Studies',
  '019c0000-0000-7000-8000-000000000007': 'Physical & Health Education',
  '019c0000-0000-7000-8000-000000000008': 'Christian Religious Studies',
};

export function formatSubjectLabel(subjectId: string): string {
  return SUBJECT_LABELS[subjectId] ?? `Subject ···${subjectId.slice(-8)}`;
}

export function formatAttendanceStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function attendanceRatePercent(summary: {
  present: number;
  absent: number;
  late: number;
  excused: number;
}): number {
  const total = summary.present + summary.absent + summary.late + summary.excused;
  if (total === 0) return 0;
  return Math.round(((summary.present + summary.late) / total) * 100);
}

export function shortDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!);
  return date.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function monthSectionLabel(isoMonth: string): string {
  const [y, m] = isoMonth.split('-').map(Number);
  const date = new Date(y!, m! - 1, 1);
  return date.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
}

export const SCHOOL_WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
] as const;

export function weekdayLabel(dayOfWeek: number): string {
  return SCHOOL_WEEKDAYS.find((d) => d.value === dayOfWeek)?.label ?? `Day ${dayOfWeek}`;
}

export function formatMinuteLabel(minute: number): string {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(mins).padStart(2, '0')} ${period}`;
}

export function formatTimeRange(startMinute: number, endMinute: number): string {
  return `${formatMinuteLabel(startMinute)} – ${formatMinuteLabel(endMinute)}`;
}
