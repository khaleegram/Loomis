import {
  Banknote,
  BookOpen,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface SchoolOwnerQuickAction {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

export const SCHOOL_OWNER_QUICK_ACTIONS: SchoolOwnerQuickAction[] = [
  {
    href: '/school/students/admissions',
    icon: GraduationCap,
    label: 'Admissions',
    description: 'Review applications and enroll new students.',
  },
  {
    href: '/school/finance/balances',
    icon: Banknote,
    label: 'Fee collections',
    description: 'Outstanding balances, reminders, and reconciliation.',
  },
  {
    href: '/school/staff',
    icon: Users,
    label: 'Staff',
    description: 'Roles, invitations, and leadership coverage.',
  },
  {
    href: '/school/academic/teaching',
    icon: GraduationCap,
    label: 'Teaching assignments',
    description: 'Assign class teachers and subject teachers to each class.',
  },
  {
    href: '/school/timetable',
    icon: CalendarClock,
    label: 'Timetable',
    description: 'Build periods, assign lessons, and publish the schedule.',
  },
  {
    href: '/school/academic',
    icon: BookOpen,
    label: 'Academic hub',
    description: 'School year, classes, calendar, and promotions.',
  },
];

export const SCHOOL_OWNER_WORKFLOW_ACTION: SchoolOwnerQuickAction = {
  href: '/school/workflows',
  icon: ClipboardList,
  label: 'Approvals inbox',
  description: 'Refunds, fee changes, and owner sign-offs.',
};
