'use client';

import type { TimetableEntryResponse } from '@loomis/contracts';
import type { BellScheduleSlot } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';
import { CalendarRange } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { TimetableWeekGrid } from '@/components/academic/ops/timetable-week-grid';
import type { TimetableSlotTarget } from '@/components/academic/ops/timetable-add-period-sheet';
import { DEFAULT_BELL_SCHEDULE_SLOTS } from '@/lib/timetable/timetable-utils';

interface TimetableScheduleCanvasProps {
  classLabel: string | null;
  termLabel: string | null;
  entries: TimetableEntryResponse[];
  scheduleSlots?: BellScheduleSlot[];
  isLoading?: boolean;
  showStatus?: boolean;
  canEdit?: boolean;
  onDeleteEntry?: (entryId: string) => void;
  onEmptySlotClick?: (slot: TimetableSlotTarget) => void;
  emptyMessage?: string;
}

export function TimetableScheduleCanvas({
  classLabel,
  termLabel,
  entries,
  scheduleSlots = DEFAULT_BELL_SCHEDULE_SLOTS,
  isLoading,
  showStatus,
  canEdit,
  onDeleteEntry,
  onEmptySlotClick,
  emptyMessage,
}: TimetableScheduleCanvasProps) {
  const lessonCount = scheduleSlots.filter((s) => s.type === 'lesson').length;

  if (!classLabel) {
    return (
      <div
        id="timetable-schedule"
        className={`${ACADEMIC_UI.dataPanel} flex flex-col items-center justify-center px-6 py-24 text-center`}
      >
        <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <CalendarRange aria-hidden className="size-7" />
        </span>
        <p className="text-[16px] font-extrabold text-neutral-900">Select a class above</p>
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-neutral-500">
          Tap <strong>+</strong> on any empty cell to assign a subject — {lessonCount} periods × Mon–Fri.
        </p>
      </div>
    );
  }

  return (
    <div id="timetable-schedule" className={`${ACADEMIC_UI.dataPanel} scroll-mt-24`}>
      <div className="relative overflow-hidden border-b border-brand-100/50 px-4 py-5 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-50/80 via-white to-brand-50/30"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Weekly schedule</p>
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl">{classLabel}</h2>
            {termLabel ? (
              <p className="mt-0.5 text-[13px] font-semibold text-neutral-500">{termLabel}</p>
            ) : null}
          </div>
          <span className="rounded-full border border-brand-200/60 bg-white/80 px-3 py-1 text-[11px] font-bold text-brand-800">
            {lessonCount} periods · tap + to assign
          </span>
        </div>
      </div>
      <div className="bg-gradient-to-b from-neutral-50/30 to-white p-4 sm:p-6">
        {isLoading ? (
          <Skeleton className="h-[28rem] w-full rounded-2xl" />
        ) : (
          <TimetableWeekGrid
            entries={entries}
            scheduleSlots={scheduleSlots}
            showStatus={showStatus}
            canEdit={canEdit}
            showTermStructure
            onDeleteEntry={onDeleteEntry}
            onEmptySlotClick={onEmptySlotClick}
            emptyMessage={emptyMessage}
          />
        )}
      </div>
    </div>
  );
}
