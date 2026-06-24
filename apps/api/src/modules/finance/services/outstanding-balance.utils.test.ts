import { describe, expect, it } from 'vitest';

import { aggregateOutstandingByScope } from './outstanding-balance.utils.js';

const reference = {
  id: 'term-2',
  termStartDate: '2025-09-01',
  termSequence: 2,
  academicYearId: 'year-1',
};

describe('aggregateOutstandingByScope', () => {
  const slices = [
    {
      invoiceId: 'inv-1',
      studentId: 'stu-1',
      classLevelId: 'cls-1',
      status: 'partially_paid',
      amountChargedMinor: 100_000,
      amountPaidMinor: 40_000,
      balanceMinor: 60_000,
      termId: 'term-1',
      termStartDate: '2025-04-01',
      termSequence: 1,
      academicYearId: 'year-1',
    },
    {
      invoiceId: 'inv-2',
      studentId: 'stu-1',
      classLevelId: 'cls-1',
      status: 'issued',
      amountChargedMinor: 150_000,
      amountPaidMinor: 0,
      balanceMinor: 150_000,
      termId: 'term-2',
      termStartDate: '2025-09-01',
      termSequence: 2,
      academicYearId: 'year-1',
    },
  ];

  it('aggregates all owed per student', () => {
    const rows = aggregateOutstandingByScope(slices, reference, 'all', {});
    expect(rows).toHaveLength(1);
    expect(rows[0]?.arrearsBalanceMinor).toBe(60_000);
    expect(rows[0]?.termBalanceMinor).toBe(150_000);
    expect(rows[0]?.totalBalanceMinor).toBe(210_000);
  });

  it('lists arrears only', () => {
    const rows = aggregateOutstandingByScope(slices, reference, 'arrears', {});
    expect(rows).toHaveLength(1);
    expect(rows[0]?.balanceMinor).toBe(60_000);
  });
});
