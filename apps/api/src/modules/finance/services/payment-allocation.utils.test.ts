import { describe, expect, it } from 'vitest';

import { buildFifoAllocations } from './payment-allocation.utils.js';

describe('buildFifoAllocations', () => {
  const invoices = [
    {
      invoiceId: 'inv-old',
      termId: 'term-1',
      balanceMinor: 60_000,
      termStartDate: '2025-04-01',
      termSequence: 1,
    },
    {
      invoiceId: 'inv-new',
      termId: 'term-2',
      balanceMinor: 150_000,
      termStartDate: '2025-09-01',
      termSequence: 2,
    },
  ];

  it('pays arrears before current term', () => {
    const allocations = buildFifoAllocations(invoices, 60_000);
    expect(allocations).toEqual([
      { invoiceId: 'inv-old', termId: 'term-1', amountMinor: 60_000 },
    ]);
  });

  it('splits across invoices when amount covers more than arrears', () => {
    const allocations = buildFifoAllocations(invoices, 100_000);
    expect(allocations).toEqual([
      { invoiceId: 'inv-old', termId: 'term-1', amountMinor: 60_000 },
      { invoiceId: 'inv-new', termId: 'term-2', amountMinor: 40_000 },
    ]);
  });
});
