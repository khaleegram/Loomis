'use client';

import { useRole } from '@/lib/auth/use-capability';

/** Principal and School Owner confirm promotions — not Admin Officer (FR-ASM-007). */
export function useCanConfirmPromotions(): boolean {
  const role = useRole();
  return role === 'principal' || role === 'school_owner';
}
