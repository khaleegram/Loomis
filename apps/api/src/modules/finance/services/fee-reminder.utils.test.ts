import { describe, expect, it } from 'vitest';

import { evaluateFeeReminderTriggers } from './fee-reminder.utils.js';

describe('evaluateFeeReminderTriggers', () => {
  it('fires month_plus_week 28 days after term start', () => {
    expect(
      evaluateFeeReminderTriggers({
        today: '2025-10-29',
        termStartDate: '2025-10-01',
        dueDate: null,
      }),
    ).toContain('month_plus_week');
  });

  it('fires due_soon three days before due date', () => {
    expect(
      evaluateFeeReminderTriggers({
        today: '2025-11-12',
        termStartDate: '2025-09-01',
        dueDate: '2025-11-15',
      }),
    ).toContain('due_soon');
  });

  it('fires overdue seven days after due date', () => {
    expect(
      evaluateFeeReminderTriggers({
        today: '2025-11-22',
        termStartDate: '2025-09-01',
        dueDate: '2025-11-15',
      }),
    ).toContain('overdue');
  });

  it('returns no triggers for minimal preset', () => {
    expect(
      evaluateFeeReminderTriggers({
        today: '2025-10-29',
        termStartDate: '2025-10-01',
        dueDate: '2025-11-15',
        preset: 'minimal',
      }),
    ).toEqual([]);
  });

  it('skips month_plus_week for due_date_only preset', () => {
    const triggers = evaluateFeeReminderTriggers({
      today: '2025-10-29',
      termStartDate: '2025-10-01',
      dueDate: '2025-11-15',
      preset: 'due_date_only',
    });
    expect(triggers).not.toContain('month_plus_week');
  });
});
