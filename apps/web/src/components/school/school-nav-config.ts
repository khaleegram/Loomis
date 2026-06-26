import {
  BookOpen,
  GraduationCap,
  Globe,
  LayoutDashboard,
  Percent,
  ScrollText,
  ShieldCheck,
  Users,
  UserCheck,
  Settings,
  ClipboardList,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { effectiveCanForRoles, workflowsInboxEnabled, type Capability } from '@loomis/core';
import type { FinanceMode, Role } from '@loomis/contracts';

import type { SchoolNavContext } from '@/lib/school/school-nav-context';

export interface SchoolNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  capabilities?: Capability[];
  always?: boolean;
  hideForRoles?: Role[];
  section?: 'workspace' | 'ledger';
  /** Hidden on Core tier (e.g. Workflows, PSF top-level nav). */
  hideInCore?: boolean;
  /** Only when Advanced+ and workflowsInbox flag is on. */
  requiresWorkflowsInbox?: boolean;
  /** Enterprise tier only (attestations, mandatory TOTP surfaces). */
  requiresEnterpriseTier?: boolean;
  /** Shown instead of separate log/verify/structures in combined finance mode. */
  combinedFinanceDeskOnly?: boolean;
  /** Hidden when combined finance desk replaces granular ledger links. */
  hideInCombinedFinanceDesk?: boolean;
}

const TEACHING_STAFF_ROLES: Role[] = ['teacher', 'class_teacher'];
const ADMIN_OFFICER_ROLES: Role[] = ['admin_officer'];
const EXAM_OFFICER_ROLES: Role[] = ['exam_officer', 'deputy_exam_officer'];
const FINANCE_ROLES: Role[] = ['accountant', 'cashier'];
/** Leadership roles — no teaching/exam module nav (master plan §5.4). */
const LEADERSHIP_ROLES: Role[] = ['school_owner', 'principal', 'admin_officer'];

export const SCHOOL_NAV: SchoolNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/school/dashboard',
    icon: LayoutDashboard,
    always: true,
    hideForRoles: ['timetable_officer', ...EXAM_OFFICER_ROLES, ...FINANCE_ROLES],
  },
  {
    id: 'staff',
    label: 'Staff',
    href: '/school/staff',
    icon: Users,
    capabilities: ['staff.onboard'],
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
    id: 'students',
    label: 'Students',
    href: '/school/students',
    icon: GraduationCap,
    capabilities: ['admissions.manage', 'admissions.approve', 'student.promote'],
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
    id: 'admissions',
    label: 'Admissions',
    href: '/school/students/admissions',
    icon: ClipboardList,
    capabilities: ['admissions.manage', 'admissions.approve'],
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
    id: 'academic',
    label: 'Academic',
    href: '/school/academic',
    icon: BookOpen,
    capabilities: [
      'academic_year.manage',
      'term.manage',
      'census.lock',
      'student.promote',
      'student.graduate',
      'class_structure.manage',
    ],
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
    id: 'attestations',
    label: 'Platform fee history',
    href: '/school/academic/attestations',
    icon: ScrollText,
    capabilities: ['audit.view', 'census.lock'],
    hideForRoles: [...TEACHING_STAFF_ROLES, ...FINANCE_ROLES, ...EXAM_OFFICER_ROLES, 'admin_officer'],
    requiresEnterpriseTier: true,
  },
  {
    id: 'timetable',
    label: 'Timetable',
    href: '/school/timetable',
    icon: BookOpen,
    capabilities: ['timetable.manage', 'timetable.view'],
    hideForRoles: [
      'school_owner',
      'principal',
      ...EXAM_OFFICER_ROLES,
      ...ADMIN_OFFICER_ROLES,
    ],
  },
  {
    id: 'assignments',
    label: 'Assignments',
    href: '/school/assignments',
    icon: ClipboardList,
    capabilities: ['gradebook.write'],
    hideForRoles: [...EXAM_OFFICER_ROLES, ...LEADERSHIP_ROLES],
  },
  {
    id: 'finance-desk',
    label: 'Finance',
    href: '/school/finance/desk',
    icon: Wallet,
    section: 'ledger',
    capabilities: ['payment.log', 'payment.verify', 'fee.configure'],
    combinedFinanceDeskOnly: true,
  },
  {
    id: 'finance-balances',
    label: 'Balances',
    href: '/school/finance/balances',
    icon: Percent,
    section: 'ledger',
    capabilities: ['finance.balances.view'],
    hideForRoles: FINANCE_ROLES,
    hideInCombinedFinanceDesk: true,
  },
  {
    id: 'finance-register',
    label: 'Payment register',
    href: '/school/finance/payments/history',
    icon: ScrollText,
    section: 'ledger',
    capabilities: ['payment.log', 'payment.verify'],
    hideInCombinedFinanceDesk: true,
  },
  {
    id: 'finance-verify',
    label: 'Verify payments',
    href: '/school/finance/payments/verify',
    icon: ShieldCheck,
    section: 'ledger',
    capabilities: ['payment.verify'],
    hideInCombinedFinanceDesk: true,
  },
  {
    id: 'finance-log',
    label: 'Log payments',
    href: '/school/finance/payments/log',
    icon: ClipboardList,
    section: 'ledger',
    capabilities: ['payment.log'],
    hideInCombinedFinanceDesk: true,
  },
  {
    id: 'finance-structures',
    label: 'Fee structures',
    href: '/school/finance',
    icon: Percent,
    section: 'ledger',
    capabilities: ['fee.configure'],
    hideInCombinedFinanceDesk: true,
  },
  {
    id: 'finance-refunds',
    label: 'Refunds',
    href: '/school/finance/refunds',
    icon: ScrollText,
    section: 'ledger',
    capabilities: ['refund.initiate', 'refund.approve'],
  },
  {
    id: 'finance-reconciliation',
    label: 'Reconciliation',
    href: '/school/finance/reconciliation',
    icon: ShieldCheck,
    section: 'ledger',
    capabilities: ['payment.verify'],
    hideInCombinedFinanceDesk: true,
  },
  {
    id: 'finance-platform-fee',
    label: 'Platform fee',
    href: '/school/finance/platform-fee',
    icon: ShieldCheck,
    section: 'ledger',
    capabilities: ['census.lock'],
    hideForRoles: ['principal', 'cashier', 'accountant', ...TEACHING_STAFF_ROLES, ...EXAM_OFFICER_ROLES, 'admin_officer'],
  },
  {
    id: 'psf-obligations',
    label: 'PSF Obligations',
    href: '/school/finance/psf',
    icon: ShieldCheck,
    section: 'ledger',
    capabilities: ['ledger.view'],
    hideInCore: true,
    hideForRoles: ['principal', 'cashier', 'school_owner'],
  },
  {
    id: 'exams',
    label: 'Exams',
    href: '/school/exams',
    icon: ClipboardList,
    capabilities: ['grading_scheme.configure', 'result.publish'],
    hideForRoles: [...TEACHING_STAFF_ROLES, ...LEADERSHIP_ROLES],
  },
  {
    id: 'gradebook',
    label: 'Gradebook',
    href: '/school/gradebook',
    icon: BookOpen,
    capabilities: ['gradebook.write', 'gradebook.read'],
    hideForRoles: LEADERSHIP_ROLES,
  },
  {
    id: 'report-cards',
    label: 'Report cards',
    href: '/school/report-cards',
    icon: ScrollText,
    capabilities: ['gradebook.read', 'gradebook.write'],
    hideForRoles: LEADERSHIP_ROLES,
  },
  {
    id: 'attendance',
    label: 'Attendance',
    href: '/school/attendance',
    icon: UserCheck,
    capabilities: ['attendance.mark', 'attendance.view'],
    hideForRoles: EXAM_OFFICER_ROLES,
  },
  {
    id: 'workflows',
    label: 'Workflows',
    href: '/school/workflows',
    icon: ShieldCheck,
    capabilities: ['staff.onboard', 'refund.approve', 'result.publish', 'admissions.approve'],
    hideForRoles: [...EXAM_OFFICER_ROLES, ...TEACHING_STAFF_ROLES, ...ADMIN_OFFICER_ROLES],
    hideInCore: true,
    requiresWorkflowsInbox: true,
  },
  {
    id: 'website',
    label: 'Website',
    href: '/school/website',
    icon: Globe,
    capabilities: ['website.view', 'website.edit', 'website.publish'],
    hideForRoles: [
      ...TEACHING_STAFF_ROLES,
      ...EXAM_OFFICER_ROLES,
      ...FINANCE_ROLES,
      'timetable_officer',
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    href: '/school/comms',
    icon: Users,
    capabilities: ['parent.message', 'staff.onboard'],
    hideForRoles: ['teacher'],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/school/settings',
    icon: Settings,
    always: true,
  },
];

function isCombinedFinanceDesk(ctx: SchoolNavContext, role: Role): boolean {
  return ctx.financeMode === 'combined' && FINANCE_ROLES.includes(role);
}

/** Core tenants without Advanced optional-role flags — legacy accounts get minimal nav. */
function isCoreOptionalRoleWithoutFlag(role: Role, ctx: SchoolNavContext): boolean {
  if (ctx.experienceTier !== 'core') return false;
  if (role === 'timetable_officer' && !ctx.flags.timetableDedicatedOfficer) return true;
  if (role === 'deputy_exam_officer' && !ctx.flags.deputyExamEnabled) return true;
  return false;
}

/** Tier-, flag-, and finance-mode-aware nav visibility (ROLE_EXPERIENCE Sprint 3). */
export function isNavVisible(role: Role, item: SchoolNavItem, ctx: SchoolNavContext): boolean {
  if (item.hideForRoles?.includes(role)) return false;

  if (ctx.experienceTier === 'core' && item.hideInCore) return false;
  if (item.requiresEnterpriseTier && ctx.experienceTier !== 'enterprise') return false;

  if (item.requiresWorkflowsInbox && !workflowsInboxEnabled(ctx.experienceTier, ctx.flags)) {
    return false;
  }

  if (isCoreOptionalRoleWithoutFlag(role, ctx)) {
    if (item.id === 'settings') return true;
    if (role === 'timetable_officer' && item.id === 'academic') return true;
    return false;
  }

  const combinedDesk = isCombinedFinanceDesk(ctx, role);
  if (item.combinedFinanceDeskOnly && !combinedDesk) return false;
  if (item.hideInCombinedFinanceDesk && combinedDesk) return false;

  if (item.always) return true;
  if (!item.capabilities?.length) return false;

  const roles = ctx.effectiveRoles ?? [role];
  return item.capabilities.some((cap) => effectiveCanForRoles(roles, cap, ctx.financeMode));
}

export function resolveSchoolNav(role: Role, ctx: SchoolNavContext): SchoolNavItem[] {
  return SCHOOL_NAV.filter((item) => isNavVisible(role, item, ctx));
}

export const STAFF_PRIMARY_ROLE_LABELS: Record<string, string> = {
  principal: 'Principal',
  admin_officer: 'Admin Officer',
  accountant: 'Accountant',
  cashier: 'Cashier',
  exam_officer: 'Exam Officer',
  deputy_exam_officer: 'Deputy Exam Officer',
  timetable_officer: 'Timetable Officer',
  teacher: 'Teacher',
  school_owner: 'School Owner',
  class_teacher: 'Class Teacher',
};

export function formatRoleLabel(
  role: string | null | undefined,
  financeMode: FinanceMode = 'combined',
): string {
  if (!role) return '—';
  if (financeMode === 'combined' && (role === 'accountant' || role === 'cashier')) {
    return 'Finance Officer';
  }
  return STAFF_PRIMARY_ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

export function formatStaffStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending invitation';
    case 'active':
      return 'Active';
    case 'deactivated':
      return 'Deactivated';
    default:
      return status;
  }
}

export function schoolNavLabel(item: SchoolNavItem, role: Role, financeMode: FinanceMode = 'combined'): string {
  if (item.href === '/school/dashboard' && role === 'class_teacher') return 'My Class';
  if (item.href === '/school/dashboard' && role === 'admin_officer') return 'Registry';
  if (item.href === '/school/dashboard' && role === 'school_owner') return 'Overview';
  if (item.href === '/school/dashboard' && role === 'principal') return 'Operations';
  if (item.href === '/school/dashboard' && role === 'teacher') return 'My Desk';
  if (item.href === '/school/academic' && role === 'admin_officer') return 'Promotions & structure';
  if (item.href === '/school/timetable') {
    if (role === 'teacher' || role === 'class_teacher') return 'My Schedule';
  }
  if (item.href === '/school/gradebook' && role === 'class_teacher') return 'Class Gradebook';
  if (item.href === '/school/gradebook' && EXAM_OFFICER_ROLES.includes(role)) return 'Gradebook';
  if (item.href === '/school/exams' && EXAM_OFFICER_ROLES.includes(role)) return 'Exams';
  if (item.id === 'finance-desk' && financeMode === 'combined') return 'Finance';
  if (item.id === 'finance-verify' && financeMode === 'split') return 'Accountant';
  if (item.id === 'finance-log' && financeMode === 'split') return 'Cashier';
  return item.label;
}

/** Finance landing when visiting `/school/finance` without fee.configure intent. */
export function financeHomePath(role: Role, financeMode: FinanceMode): string {
  if (role === 'school_owner' || role === 'principal' || role === 'admin_officer') {
    return '/school/finance/balances';
  }
  if (role === 'cashier') {
    return financeMode === 'combined' ? '/school/finance/desk' : '/school/finance/payments/log';
  }
  if (role === 'accountant') {
    return financeMode === 'combined' ? '/school/finance/desk' : '/school/finance/payments/verify';
  }
  return '/school/finance/balances';
}
