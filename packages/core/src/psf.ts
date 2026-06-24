import type { FeeItemCategory } from '@loomis/contracts';

/** Platform default PSF until school fee structure informs a suggestion (₦1,000). */
export const DEFAULT_PSF_RATE_MINOR = 100_000;

/** Fee line categories used to derive the suggested PSF band (full school fees, excl. transport/uniform). */
export const PSF_BILLABLE_FEE_CATEGORIES: readonly FeeItemCategory[] = [
  'tuition',
  'development_levy',
  'materials',
  'books',
  'exam',
  'technology',
] as const;

export interface ProductTierSpec {
  code: string;
  name: string;
  description: string;
  defaultPsfRateMinor: number;
  maxStudents: number | null;
  experienceTier: 'core' | 'advanced' | 'enterprise';
}

/** Commercial pricing tiers shown in the platform console (not dev "demo"). */
export const PRODUCT_TIER_SPECS: readonly ProductTierSpec[] = [
  {
    code: 'core',
    name: 'Core',
    description: 'Essential school operations — admissions, finance, attendance, gradebook, and parent portal.',
    defaultPsfRateMinor: DEFAULT_PSF_RATE_MINOR,
    maxStudents: 500,
    experienceTier: 'core',
  },
  {
    code: 'advanced',
    name: 'Advanced',
    description: 'Core plus workflows inbox, deputy exam officer, and expanded finance controls.',
    defaultPsfRateMinor: DEFAULT_PSF_RATE_MINOR,
    maxStudents: 2_000,
    experienceTier: 'advanced',
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Full platform capabilities, higher enrollment caps, and enterprise MFA policies.',
    defaultPsfRateMinor: DEFAULT_PSF_RATE_MINOR,
    maxStudents: null,
    experienceTier: 'enterprise',
  },
] as const;

/**
 * Suggested PSF (kobo) from total billable school fees per student (highest class level).
 * Bands align with typical Nigerian private-school tuition tiers.
 */
export function calculateSuggestedPsfRateMinor(totalBillableFeesMinor: number): number {
  if (totalBillableFeesMinor <= 0) return DEFAULT_PSF_RATE_MINOR;
  if (totalBillableFeesMinor <= 500_000) return DEFAULT_PSF_RATE_MINOR;
  if (totalBillableFeesMinor <= 2_000_000) return 250_000;
  if (totalBillableFeesMinor <= 5_000_000) return 500_000;
  return 750_000;
}

export function sumBillableFeeItemsMinor(
  items: ReadonlyArray<{ category: FeeItemCategory; amountMinor: number }>,
): number {
  const billable = new Set<string>(PSF_BILLABLE_FEE_CATEGORIES);
  return items.reduce(
    (sum, item) => (billable.has(item.category) ? sum + item.amountMinor : sum),
    0,
  );
}
