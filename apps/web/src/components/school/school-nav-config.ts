import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Percent,
  ScrollText,
  ShieldCheck,
  Users,
  UserCheck,
  Settings,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import type { Capability } from '@loomis/core';
import type { Role } from '@loomis/contracts';

export interface SchoolNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  capabilities?: Capability[];
  always?: boolean;
  /** Hide for roles that only need a single focused workspace (e.g. timetable officer). */
  hideForRoles?: Role[];
  /** Groups sidebar items under Ledger Flows when set to ledger. */
  section?: 'workspace' | 'ledger';
}

/** Roles that use the focused teacher workspace — hide school-wide admin nav noise. */
const TEACHING_STAFF_ROLES: Role[] = ['teacher', 'class_teacher'];

export const SCHOOL_NAV: SchoolNavItem[] = [
  {
    label: 'Dashboard',
    href: '/school/dashboard',
    icon: LayoutDashboard,
    always: true,
    hideForRoles: ['timetable_officer'],
  },
  { label: 'Staff', href: '/school/staff', icon: Users, capabilities: ['staff.onboard'], hideForRoles: TEACHING_STAFF_ROLES },
  {
    label: 'Students',
    href: '/school/students',
    icon: GraduationCap,
    capabilities: ['admissions.manage', 'admissions.approve', 'student.promote'],
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
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
    label: 'Timetable',
    href: '/school/timetable',
    icon: BookOpen,
    capabilities: ['timetable.manage', 'timetable.view'],
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
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
    label: 'PSF Obligations',
    href: '/school/finance/psf',
    icon: ShieldCheck,
    section: 'ledger',
    capabilities: ['fee.configure'],
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
    label: 'Exams',
    href: '/school/exams',
    icon: ClipboardList,
    capabilities: ['grading_scheme.configure', 'result.publish', 'gradebook.read'],
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
    label: 'Gradebook',
    href: '/school/gradebook',
    icon: BookOpen,
    capabilities: ['gradebook.write', 'gradebook.read'],
  },
  {
    label: 'Report cards',
    href: '/school/report-cards',
    icon: ScrollText,
    capabilities: ['gradebook.read', 'gradebook.write'],
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
    hideForRoles: TEACHING_STAFF_ROLES,
  },
  {
    label: 'Communications',
    href: '/school/comms',
    icon: Users,
    capabilities: ['staff.onboard', 'attendance.mark', 'gradebook.read'],
    hideForRoles: ['teacher'],
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

export function schoolNavLabel(item: SchoolNavItem, role: Role): string {
  if (item.href === '/school/dashboard' && role === 'class_teacher') {
    return 'My Class';
  }
  if (item.href === '/school/timetable') {
    if (role === 'teacher' || role === 'class_teacher') return 'My Schedule';
  }
  if (item.href === '/school/gradebook' && role === 'class_teacher') {
    return 'Class Gradebook';
  }
  return item.label;
}
