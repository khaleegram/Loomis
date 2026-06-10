import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Percent,
  ShieldCheck,
  Users,
  UserCheck,
  Settings,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import type { Capability } from '@loomis/core';

export interface SchoolNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  capabilities?: Capability[];
  always?: boolean;
  /** Groups sidebar items under Ledger Flows when set to ledger. */
  section?: 'workspace' | 'ledger';
}

export const SCHOOL_NAV: SchoolNavItem[] = [
  { label: 'Dashboard', href: '/school/dashboard', icon: LayoutDashboard, always: true },
  { label: 'Staff', href: '/school/staff', icon: Users, capabilities: ['staff.onboard'] },
  {
    label: 'Students',
    href: '/school/students',
    icon: GraduationCap,
    capabilities: ['admissions.manage', 'admissions.approve', 'student.promote'],
  },
  {
    label: 'Academic',
    href: '/school/sessions',
    icon: BookOpen,
    capabilities: ['academic_year.manage', 'term.manage', 'census.lock'],
  },
  {
    label: 'Timetable',
    href: '/school/timetable',
    icon: BookOpen,
    capabilities: ['academic_year.manage', 'term.manage'],
  },
  {
    label: 'Assignments',
    href: '/school/assignments',
    icon: ClipboardList,
    capabilities: ['gradebook.write', 'gradebook.read'],
  },
  {
    label: 'Finance',
    href: '/school/finance',
    icon: Percent,
    section: 'ledger',
    capabilities: ['fee.configure', 'payment.log', 'payment.verify', 'refund.initiate', 'refund.approve'],
  },
  {
    label: 'PSF Obligations',
    href: '/school/finance/psf',
    icon: ShieldCheck,
    section: 'ledger',
    capabilities: ['fee.configure'],
  },
  {
    label: 'Exams',
    href: '/school/exams',
    icon: ClipboardList,
    capabilities: ['grading_scheme.configure', 'result.publish', 'gradebook.read'],
  },
  {
    label: 'Gradebook',
    href: '/school/gradebook',
    icon: BookOpen,
    capabilities: ['gradebook.write', 'gradebook.read'],
  },
  {
    label: 'Attendance',
    href: '/school/attendance',
    icon: UserCheck,
    capabilities: ['attendance.mark', 'attendance.view'],
  },
  {
    label: 'Workflows',
    href: '/school/workflows',
    icon: ShieldCheck,
    capabilities: ['staff.onboard', 'refund.approve', 'result.publish'],
  },
  {
    label: 'Communications',
    href: '/school/comms',
    icon: Users,
    capabilities: ['staff.onboard', 'attendance.mark', 'gradebook.read'],
  },
  { label: 'Settings', href: '/school/settings', icon: Settings, always: true },
];

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

export function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return '—';
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
