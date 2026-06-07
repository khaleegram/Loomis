import {
  BookOpen,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  Scale,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@loomis/contracts';

export interface ComplianceNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** DPO compliance console navigation (US-AUD-001..005). */
export const COMPLIANCE_NAV: ComplianceNavItem[] = [
  { label: 'Compliance Posture', href: '/platform/compliance', icon: LayoutDashboard },
  { label: 'DSAR Queue', href: '/platform/compliance/dsar', icon: ClipboardList },
  { label: 'Breach Records', href: '/platform/compliance/breaches', icon: Shield },
  { label: 'Retention & Consent', href: '/platform/compliance/retention', icon: BookOpen },
  { label: 'Audit Log', href: '/platform/compliance/audit', icon: FileSearch },
];

const DPO_ROLES = new Set<Role>(['dpo']);
const PLATFORM_OPS_ROLES = new Set<Role>(['platform_owner', 'platform_admin']);

export function isDpoOnlyRole(role: Role): boolean {
  return DPO_ROLES.has(role);
}

export function canAccessCompliance(role: Role): boolean {
  return DPO_ROLES.has(role) || PLATFORM_OPS_ROLES.has(role);
}

export function complianceNavForRole(role: Role): ComplianceNavItem[] {
  if (!canAccessCompliance(role)) return [];
  return COMPLIANCE_NAV;
}
