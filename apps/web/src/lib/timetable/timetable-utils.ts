import type { BellScheduleSlot } from '@loomis/contracts';
import { DEFAULT_BELL_SCHEDULE_SLOTS } from '@loomis/contracts';

export { DEFAULT_BELL_SCHEDULE_SLOTS };
export type { BellScheduleSlot };

/** ISO weekday: 1 = Monday … 5 = Friday (school week). */
export const SCHOOL_WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
] as const;

/** @deprecated Use bell schedule API slots; kept as fallback shape. */
export const PERIOD_PRESETS = DEFAULT_BELL_SCHEDULE_SLOTS.filter((s) => s.type === 'lesson').map(
  (slot) => ({
    label: formatTimeRange(slot.startMinute, slot.endMinute),
    startMinute: slot.startMinute,
    endMinute: slot.endMinute,
  }),
);

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

export function minuteFromTimeInput(value: string): number {
  const [hours, mins] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
}

export function timeInputFromMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const mins = minute % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function weekdayLabel(dayOfWeek: number): string {
  return SCHOOL_WEEKDAYS.find((d) => d.value === dayOfWeek)?.label ?? `Day ${dayOfWeek}`;
}

export function lessonSlotsFromSchedule(slots: BellScheduleSlot[]): BellScheduleSlot[] {
  return slots.filter((slot) => slot.type === 'lesson');
}

export function subjectOptionKey(subjectId: string, teacherStaffProfileId: string): string {
  return `${subjectId}:${teacherStaffProfileId}`;
}
