export type FeeReminderTrigger =
  | 'month_plus_week'
  | 'due_soon'
  | 'overdue'
  | 'overdue_repeat'
  | 'manual';

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

function diffDaysUtc(fromIso: string, toIso: string): number {
  const from = parseIsoDate(fromIso).getTime();
  const to = parseIsoDate(toIso).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/** Standard preset triggers for school fee reminders (no per-school config in v1). */
export function evaluateFeeReminderTriggers(input: {
  today: string;
  termStartDate: string | null;
  dueDate: string | null;
}): FeeReminderTrigger[] {
  const triggers: FeeReminderTrigger[] = [];

  if (input.termStartDate) {
    const monthPlusWeek = addDaysUtc(input.termStartDate, 28);
    if (monthPlusWeek === input.today) {
      triggers.push('month_plus_week');
    }
  }

  if (input.dueDate) {
    const dueSoon = addDaysUtc(input.dueDate, -3);
    const overdue = addDaysUtc(input.dueDate, 7);
    if (dueSoon === input.today) {
      triggers.push('due_soon');
    }
    if (overdue === input.today) {
      triggers.push('overdue');
    }
    const daysSinceOverdueStart = diffDaysUtc(overdue, input.today);
    if (daysSinceOverdueStart > 0 && daysSinceOverdueStart % 14 === 0) {
      triggers.push('overdue_repeat');
    }
  }

  return triggers;
}

export function reminderChannelsForTrigger(
  trigger: FeeReminderTrigger,
): Array<'push' | 'email' | 'sms'> {
  if (trigger === 'overdue' || trigger === 'overdue_repeat') {
    return ['push', 'email', 'sms'];
  }
  if (trigger === 'manual') {
    return ['push', 'email', 'sms'];
  }
  return ['push', 'email'];
}
