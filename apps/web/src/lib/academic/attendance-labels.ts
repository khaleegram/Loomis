import type { AttendanceStatus } from '@loomis/contracts';
import { CheckCircle2, Clock, UserCheck, UserX } from 'lucide-react';

import { SURFACES } from '@/lib/design/surfaces';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus,
  {
    label: string;
    short: string;
    shortcut: string;
    icon: typeof CheckCircle2;
    gradient: string;
    activeClass: string;
    inactiveClass: string;
    textClass: string;
    dotClass: string;
  }
> = {
  present: {
    label: 'Present',
    short: 'P',
    shortcut: '1',
    icon: CheckCircle2,
    gradient: SURFACES.kpi.g2,
    activeClass: 'border-accent-green-300 bg-accent-green-50 text-accent-green-800 ring-2 ring-accent-green-200',
    inactiveClass: 'border-neutral-200 bg-white text-neutral-600 hover:border-accent-green-200 hover:bg-accent-green-50/50',
    textClass: 'text-accent-green-700',
    dotClass: 'bg-accent-green-500',
  },
  absent: {
    label: 'Absent',
    short: 'A',
    shortcut: '2',
    icon: UserX,
    gradient: SURFACES.kpi.g4,
    activeClass: 'border-red-300 bg-red-50 text-red-800 ring-2 ring-red-200',
    inactiveClass: 'border-neutral-200 bg-white text-neutral-600 hover:border-red-200 hover:bg-red-50/50',
    textClass: 'text-red-600',
    dotClass: 'bg-red-500',
  },
  late: {
    label: 'Late',
    short: 'L',
    shortcut: '3',
    icon: Clock,
    gradient: SURFACES.kpi.g3,
    activeClass: 'border-amber-300 bg-amber-50 text-amber-900 ring-2 ring-amber-200',
    inactiveClass: 'border-neutral-200 bg-white text-neutral-600 hover:border-amber-200 hover:bg-amber-50/50',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
  },
  excused: {
    label: 'Excused',
    short: 'E',
    shortcut: '4',
    icon: UserCheck,
    gradient: SURFACES.kpi.g1,
    activeClass: 'border-brand-300 bg-brand-50 text-brand-900 ring-2 ring-brand-200',
    inactiveClass: 'border-neutral-200 bg-white text-neutral-600 hover:border-brand-200 hover:bg-brand-50/50',
    textClass: 'text-brand-700',
    dotClass: 'bg-brand-500',
  },
};

export function attendanceRatePercent(summary: {
  present: number;
  absent: number;
  late: number;
  excused: number;
}): number {
  const total = summary.present + summary.absent + summary.late + summary.excused;
  if (total === 0) return 0;
  return Math.round(((summary.present + summary.late) / total) * 100);
}

export function studentInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export interface AttendanceMonthGroup {
  monthKey: string;
  label: string;
  summary: { present: number; absent: number; late: number; excused: number };
  records: Array<{ id: string; attendanceDate: string; status: AttendanceStatus }>;
}

export function groupAttendanceByMonth(
  records: Array<{ id: string; attendanceDate: string; status: AttendanceStatus }>,
): AttendanceMonthGroup[] {
  const byMonth = new Map<string, AttendanceMonthGroup>();

  for (const record of [...records].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))) {
    const monthKey = record.attendanceDate.slice(0, 7);
    const label = new Date(`${record.attendanceDate}T12:00:00`).toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric',
    });
    const group =
      byMonth.get(monthKey) ??
      ({
        monthKey,
        label,
        summary: { present: 0, absent: 0, late: 0, excused: 0 },
        records: [],
      } satisfies AttendanceMonthGroup);

    group.records.push(record);
    if (record.status === 'present') group.summary.present += 1;
    if (record.status === 'absent') group.summary.absent += 1;
    if (record.status === 'late') group.summary.late += 1;
    if (record.status === 'excused') group.summary.excused += 1;
    byMonth.set(monthKey, group);
  }

  return [...byMonth.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
