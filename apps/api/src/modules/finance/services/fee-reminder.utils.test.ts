import { describe, expect, it } from 'vitest';

import { evaluateFeeReminderTriggers, buildFeeReminderIdempotencyKey } from './fee-reminder.utils.js';

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

describe('buildFeeReminderIdempotencyKey', () => {
  const ids = {
    tenantId: '019ef49b-1f64-734c-bc4c-beada3071633',
    studentId: '019ef56a-71de-7c01-b4ae-0ef3cfda5df4',
    userId: '019ef98e-e14c-761c-a6f8-61bfe70f8a98',
  };

  it('stays within varchar(128) for bulk manual suffix', () => {
    const key = buildFeeReminderIdempotencyKey({
      trigger: 'manual',
      ...ids,
      suffix: `${ids.userId}:bulk:${Date.now()}:${ids.studentId}`,
    });
    expect(key.length).toBeLessThanOrEqual(128);
    expect(key.startsWith('fr:manual:')).toBe(true);
  });

  it('differs per parent user for the same student', () => {
    const suffix = 'actor:bulk:1:student';
    const a = buildFeeReminderIdempotencyKey({
      trigger: 'manual',
      ...ids,
      userId: '019ef49b-1f64-734c-bc4c-beada3071633',
      suffix,
    });
    const b = buildFeeReminderIdempotencyKey({
      trigger: 'manual',
      ...ids,
      userId: '019ef56a-71de-7c01-b4ae-0ef3cfda5df4',
      suffix,
    });
    expect(a).not.toBe(b);
  });
});
