'use client';

import type { FinanceMode } from '@loomis/contracts';
import { ChevronDown } from 'lucide-react';

import { formatRoleLabel } from '@/components/school/school-nav-config';
import { cn } from '@loomis/ui-web';

const ROLE_GROUPS = [
  { label: 'Administration', roles: ['principal', 'admin_officer'] as const },
  {
    label: 'Academic',
    roles: ['teacher', 'exam_officer', 'deputy_exam_officer', 'timetable_officer'] as const,
  },
  { label: 'Finance', roles: ['accountant', 'cashier'] as const },
] as const;

export const staffFormInputClass =
  'h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px] text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-neutral-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-200';

interface StaffPrimaryRoleSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  /** Combined mode shows "Finance Officer" for accountant/cashier options. */
  financeMode?: FinanceMode;
  /** In split mode, hide roles already held by this user (future) or restrict selection. */
  lockedRoles?: string[];
  /** Advanced optional roles — hidden when false (Sprint 11). */
  enableTimetableOfficer?: boolean;
  enableDeputyExamOfficer?: boolean;
}

/** Native select — stable dropdown without Radix portal/clipping issues. */
export function StaffPrimaryRoleSelect({
  value,
  onValueChange,
  disabled,
  id,
  financeMode = 'combined',
  lockedRoles = [],
  enableTimetableOfficer = false,
  enableDeputyExamOfficer = false,
}: StaffPrimaryRoleSelectProps) {
  const optionalRoleEnabled = (role: string) => {
    if (role === 'timetable_officer') return enableTimetableOfficer;
    if (role === 'deputy_exam_officer') return enableDeputyExamOfficer;
    return true;
  };

  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          staffFormInputClass,
          'cursor-pointer appearance-none pr-10',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {ROLE_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.roles
              .filter((role) => !lockedRoles.includes(role))
              .filter((role) => optionalRoleEnabled(role))
              .map((role) => (
              <option key={role} value={role}>
                {formatRoleLabel(role, financeMode)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
      />
    </div>
  );
}
