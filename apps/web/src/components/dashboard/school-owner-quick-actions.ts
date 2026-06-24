import {
  Banknote,
  BookOpen,
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
    href: '/school/academic',
    icon: BookOpen,
    label: 'Academic hub',
    description: 'Sessions, census, promotions, and calendar.',
  },
];

export const SCHOOL_OWNER_WORKFLOW_ACTION: SchoolOwnerQuickAction = {
  href: '/school/workflows',
  icon: ClipboardList,
  label: 'Approvals inbox',
  description: 'Refunds, fee changes, and owner sign-offs.',
};
