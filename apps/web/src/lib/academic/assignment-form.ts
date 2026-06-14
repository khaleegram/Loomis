import type { ChipOption } from '@/components/shared/smart-form';

/** Converts a Date to `datetime-local` input value (local time). */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function atTime(base: Date, hour: number, minute: number): Date {
  const copy = new Date(base);
  copy.setHours(hour, minute, 0, 0);
  return copy;
}

function addDays(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Next occurrence of `weekday` (0=Sun … 6=Sat) at the given time. */
function nextWeekdayAt(weekday: number, hour: number, minute: number): Date {
  const now = new Date();
  const cursor = new Date(now);
  cursor.setHours(hour, minute, 0, 0);
  const delta = (weekday - cursor.getDay() + 7) % 7;
  if (delta === 0 && cursor <= now) {
    cursor.setDate(cursor.getDate() + 7);
  } else {
    cursor.setDate(cursor.getDate() + delta);
  }
  return cursor;
}

export const ASSIGNMENT_TITLE_PRESETS: ChipOption[] = [
  { value: 'Homework', label: 'Homework' },
  { value: 'Classwork', label: 'Classwork' },
  { value: 'Reading assignment', label: 'Reading' },
  { value: 'Project', label: 'Project' },
  { value: 'Quiz preparation', label: 'Quiz prep' },
];

export const ASSIGNMENT_MAX_SCORE_PRESETS: ChipOption[] = [
  { value: '10', label: '10 pts' },
  { value: '20', label: '20 pts' },
  { value: '50', label: '50 pts' },
  { value: '100', label: '100 pts' },
];

export function buildDueDatePresets(): Array<ChipOption & { iso: string }> {
  const tomorrow = addDays(new Date(), 1);
  const inThreeDays = addDays(new Date(), 3);
  const friday = nextWeekdayAt(5, 16, 0);
  const nextMonday = nextWeekdayAt(1, 8, 0);

  return [
    {
      value: 'tomorrow-4pm',
      label: 'Tomorrow · 4 PM',
      iso: toDateTimeLocalValue(atTime(tomorrow, 16, 0)),
    },
    {
      value: 'three-days',
      label: 'In 3 days · 4 PM',
      iso: toDateTimeLocalValue(atTime(inThreeDays, 16, 0)),
    },
    {
      value: 'friday-4pm',
      label: 'This Friday · 4 PM',
      iso: toDateTimeLocalValue(friday),
    },
    {
      value: 'monday-8am',
      label: 'Next Monday · 8 AM',
      iso: toDateTimeLocalValue(nextMonday),
    },
  ];
}

export function formatDuePreview(dueAtLocal: string): string | null {
  if (!dueAtLocal) return null;
  const parsed = new Date(dueAtLocal);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function duePresetKeyForValue(dueAtLocal: string, presets: ReturnType<typeof buildDueDatePresets>): string {
  const match = presets.find((preset) => preset.iso === dueAtLocal);
  return match?.value ?? 'custom';
}
