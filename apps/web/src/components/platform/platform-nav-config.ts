import {
  Building2,
  CheckSquare2,
  ClipboardList,
  FileText,
  Layers,
  LayoutDashboard,
  Percent,
  Share2,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PlatformNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Platform console navigation (US-PLT-001..007). Order per master plan §5.1. */
export const PLATFORM_NAV: PlatformNavItem[] = [
  { label: 'Dashboard', href: '/platform/dashboard', icon: LayoutDashboard },
  { label: 'Tenants', href: '/platform/tenants', icon: Building2 },
  { label: 'Product tiers', href: '/platform/tiers', icon: Layers },
  { label: 'Approvals', href: '/platform/approvals', icon: CheckSquare2 },
  { label: 'Billing adjustments', href: '/platform/billing/adjustments', icon: ClipboardList },
  { label: 'Risk Cases', href: '/platform/risk', icon: ShieldAlert },
  { label: 'PSF Rates', href: '/platform/psf', icon: Percent },
  { label: 'Ledger', href: '/platform/ledger', icon: FileText },
  { label: 'Referrals', href: '/platform/referrals', icon: Share2 },
  { label: 'KYC Verifications', href: '/platform/referrals/kyc', icon: UserCheck },
];
