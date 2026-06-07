import {
  GraduationCap,
  LayoutDashboard,
  CreditCard,
  Settings,
  BookOpen,
  Calendar,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import type { Capability } from '@loomis/core';

export interface ParentNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  always?: boolean;
}

export const PARENT_NAV: ParentNavItem[] = [
  { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard, always: true },
  { label: 'Attendance', href: '/parent/attendance', icon: Calendar, roles: ['parent'] },
  { label: 'Results', href: '/parent/results', icon: BookOpen, always: true },
  { label: 'Fees', href: '/parent/fees', icon: CreditCard, roles: ['parent'] },
  { label: 'Settings', href: '/parent/contact', icon: Settings, always: true },
];

export const STUDENT_NAV: ParentNavItem[] = [
  { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard, always: true },
  { label: 'Results', href: '/parent/results', icon: BookOpen, always: true },
  { label: 'Timetable', href: '/parent/results', icon: Calendar, always: true },
  { label: 'Assignments', href: '/parent/results', icon: ClipboardList, always: true },
  { label: 'Attendance', href: '/parent/attendance', icon: Calendar, always: true },
];
