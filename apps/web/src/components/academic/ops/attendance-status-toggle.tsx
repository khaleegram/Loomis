'use client';

import type { AttendanceStatus } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';

import { ATTENDANCE_STATUSES, ATTENDANCE_STATUS_META } from '@/lib/academic/attendance-labels';

interface AttendanceStatusToggleProps {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
  compact?: boolean;
  'aria-label'?: string;
}

export function AttendanceStatusToggle({
  value,
  onChange,
  disabled,
  compact,
  'aria-label': ariaLabel,
}: AttendanceStatusToggleProps) {
  return (
    <div
      className={cn('inline-flex gap-1 rounded-xl border border-neutral-100 bg-neutral-50/80 p-1', compact && 'gap-0.5 p-0.5')}
      role="group"
      aria-label={ariaLabel}
    >
      {ATTENDANCE_STATUSES.map((status) => {
        const meta = ATTENDANCE_STATUS_META[status];
        const active = value === status;
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            title={`${meta.label} (${meta.shortcut})`}
            className={cn(
              'inline-flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-center transition-all duration-150 sm:min-h-0 sm:min-w-[3.25rem] sm:flex-none sm:px-2.5',
              active ? meta.activeClass : meta.inactiveClass,
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className="text-[13px] font-bold leading-none">{meta.short}</span>
            {!compact ? (
              <span className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-wide sm:inline">
                {meta.label}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
