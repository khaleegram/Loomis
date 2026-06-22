import { describe, expect, it } from 'vitest';

import { splitFinanceStaffStatus } from '@/lib/finance/split-finance-status';

describe('splitFinanceStaffStatus', () => {
  it('requires both active finance roles', () => {
    const staff = [
      {
        fullName: 'Cashier One',
        primaryRole: 'cashier' as const,
        status: 'active' as const,
      },
    ] as Parameters<typeof splitFinanceStaffStatus>[0];

    const partial = splitFinanceStaffStatus(staff);
    expect(partial.hasCashier).toBe(true);
    expect(partial.hasAccountant).toBe(false);
    expect(partial.isComplete).toBe(false);

    const complete = splitFinanceStaffStatus([
      ...staff,
      {
        fullName: 'Acct One',
        primaryRole: 'accountant' as const,
        status: 'active' as const,
      },
    ] as Parameters<typeof splitFinanceStaffStatus>[0]);
    expect(complete.isComplete).toBe(true);
  });
});
