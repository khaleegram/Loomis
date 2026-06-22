import type { StaffDirectoryEntryResponse } from '@loomis/contracts';

export type SplitFinanceStaffStatus = {
  hasCashier: boolean;
  hasAccountant: boolean;
  isComplete: boolean;
  cashierName: string | null;
  accountantName: string | null;
};

/** Active or pending staff holding split finance primary roles. */
export function splitFinanceStaffStatus(
  staff: StaffDirectoryEntryResponse[] | undefined,
): SplitFinanceStaffStatus {
  const roster = (staff ?? []).filter(
    (member) => member.status === 'active' || member.status === 'pending',
  );

  const cashier = roster.find((member) => member.primaryRole === 'cashier');
  const accountant = roster.find((member) => member.primaryRole === 'accountant');

  return {
    hasCashier: Boolean(cashier),
    hasAccountant: Boolean(accountant),
    isComplete: Boolean(cashier && accountant),
    cashierName: cashier?.fullName ?? null,
    accountantName: accountant?.fullName ?? null,
  };
}
