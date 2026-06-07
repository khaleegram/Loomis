import {
  LayoutDashboard,
  School,
  Share2,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@loomis/contracts';

export interface RegionalNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, only these roles see the item. */
  roles?: Role[];
}

/** Regional console navigation (US-REG-001..005). */
export const REGIONAL_NAV: RegionalNavItem[] = [
  { label: 'Dashboard', href: '/regional/dashboard', icon: LayoutDashboard },
  { label: 'Onboard School', href: '/regional/onboarding', icon: School },
  {
    label: 'Subordinates',
    href: '/regional/subordinates',
    icon: Users,
    roles: ['regional_manager'],
  },
  { label: 'Referral Earnings', href: '/regional/earnings', icon: Share2 },
];

export function regionalNavForRole(role: Role): RegionalNavItem[] {
  return REGIONAL_NAV.filter((item) => !item.roles || item.roles.includes(role));
}
