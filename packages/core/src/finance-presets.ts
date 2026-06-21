import type { FinanceMode, Role } from '@loomis/contracts';
import { roleCapabilities, type Capability } from './capabilities.js';

/** Combined Finance Officer preset (ROLE_EXPERIENCE_TIER_PLAN.md §2.1). */
export const COMBINED_FINANCE_CAPABILITIES: readonly Capability[] = [
  'payment.log',
  'payment.verify',
  'refund.initiate',
  'fee.configure',
  'finance.balances.view',
  'ledger.view',
];

const FINANCE_ROLES = new Set<Role>(['accountant', 'cashier']);

/**
 * Effective capabilities after applying tenant finance mode presets.
 * Combined mode grants the full finance desk preset to accountant/cashier JWT roles.
 */
export function effectiveCapabilities(
  role: Role,
  financeMode: FinanceMode = 'combined',
): ReadonlySet<Capability> {
  const base = roleCapabilities[role] ?? new Set<Capability>();
  if (financeMode === 'combined' && FINANCE_ROLES.has(role)) {
    return new Set<Capability>([...base, ...COMBINED_FINANCE_CAPABILITIES]);
  }
  return base;
}

export function effectiveCan(
  role: Role,
  capability: Capability,
  financeMode: FinanceMode = 'combined',
): boolean {
  return effectiveCapabilities(role, financeMode).has(capability);
}
