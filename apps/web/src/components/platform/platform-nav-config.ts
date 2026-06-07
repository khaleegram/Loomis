import {
  Building2,
  CheckSquare2,
  LayoutDashboard,
  Percent,
  Share2,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PlatformNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Platform console navigation (US-PLT-001..007). All items visible to all platform roles. */
export const PLATFORM_NAV: PlatformNavItem[] = [
  { label: 'Dashboard', href: '/platform/dashboard', icon: LayoutDashboard },
  { label: 'Tenants', href: '/platform/tenants', icon: Building2 },
  { label: 'PSF Rates', href: '/platform/psf', icon: Percent },
  { label: 'Approvals', href: '/platform/approvals', icon: CheckSquare2 },
  { label: 'Risk Cases', href: '/platform/risk', icon: ShieldAlert },
  { label: 'Referrals', href: '/platform/referrals', icon: Share2 },
];
