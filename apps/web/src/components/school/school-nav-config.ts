import type { Capability } from '@loomis/core';

export interface SchoolNavItem {
  label: string;
  href: string;
  /** When set, the item is shown if the role has any of these capabilities. */
  capabilities?: Capability[];
  /** When true, always shown to authenticated school users. */
  always?: boolean;
}

/**
 * School console navigation (Frontend Architecture §7.1).
 * Each item is gated by the capability map (§9) — never by raw role checks.
 */
export const SCHOOL_NAV: SchoolNavItem[] = [
  { label: 'Dashboard', href: '/school/dashboard', always: true },
  {
    label: 'Staff',
    href: '/school/staff',
    capabilities: ['staff.onboard'],
  },
  {
    label: 'Students',
    href: '/school/students',
    capabilities: ['admissions.manage', 'admissions.approve', 'student.promote'],
  },
  {
    label: 'Academic',
    href: '/school/sessions',
    capabilities: ['academic_year.manage', 'term.manage', 'census.lock'],
  },
  {
    label: 'Finance',
    href: '/school/finance',
    capabilities: ['fee.configure', 'payment.log', 'payment.verify'],
  },
  {
    label: 'Exams',
    href: '/school/exams',
    capabilities: ['grading_scheme.configure', 'result.publish', 'gradebook.read'],
  },
  {
    label: 'Gradebook',
    href: '/school/gradebook',
    capabilities: ['gradebook.write', 'gradebook.read'],
  },
  {
    label: 'Attendance',
    href: '/school/attendance',
    capabilities: ['attendance.mark', 'attendance.view'],
  },
  {
    label: 'Settings',
    href: '/school/settings',
    always: true,
  },
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
