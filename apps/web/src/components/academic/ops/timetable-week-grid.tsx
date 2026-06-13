'use client';

import type { BellScheduleSlot, TimetableEntryResponse } from '@loomis/contracts';
import { Badge, Skeleton, cn } from '@loomis/ui-web';
import { Clock, Plus, User } from 'lucide-react';

import { formatSubjectLabel } from '@/lib/academic/ops-labels';
import {
  DEFAULT_BELL_SCHEDULE_SLOTS,
  formatTimeRange,
  SCHOOL_WEEKDAYS,
} from '@/lib/timetable/timetable-utils';
import type { TimetableSlotTarget } from '@/components/academic/ops/timetable-add-period-sheet';

interface TimetableWeekGridProps {
  entries: TimetableEntryResponse[];
  scheduleSlots?: BellScheduleSlot[];
  isLoading?: boolean;
  showStatus?: boolean;
  onDeleteEntry?: (entryId: string) => void;
  onEmptySlotClick?: (slot: TimetableSlotTarget) => void;
  canEdit?: boolean;
  emptyMessage?: string;
  showTermStructure?: boolean;
}

function findEntryForSlot(
  entries: TimetableEntryResponse[],
  dayOfWeek: number,
  startMinute: number,
  endMinute: number,
): TimetableEntryResponse | undefined {
  return entries.find(
    (entry) =>
      entry.dayOfWeek === dayOfWeek &&
      entry.startMinute === startMinute &&
      entry.endMinute === endMinute,
  );
}

function TimetableSlot({
  entry,
  showStatus,
  canEdit,
  onDelete,
  compact = false,
}: {
  entry: TimetableEntryResponse;
  showStatus?: boolean;
  canEdit?: boolean;
  onDelete?: (entryId: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? 'h-full rounded-xl border border-brand-200/40 bg-gradient-to-br from-white via-brand-50/30 to-white p-2.5 shadow-sm ring-1 ring-brand-100/30'
          : 'rounded-xl border border-brand-100/50 bg-gradient-to-br from-white to-brand-50/20 p-3 shadow-sm transition hover:border-brand-200/80 hover:shadow-md'
      }
    >
      {!compact ? (
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
            {formatTimeRange(entry.startMinute, entry.endMinute)}
          </p>
          {showStatus && entry.status === 'draft' ? (
            <Badge variant="outline" className="border-gold-200 bg-gold-50/80 text-[10px] text-gold-800">
              Draft
            </Badge>
          ) : null}
        </div>
      ) : showStatus && entry.status === 'draft' ? (
        <Badge variant="outline" className="mb-1 border-gold-200 bg-gold-50/80 text-[9px] text-gold-800">
          Draft
        </Badge>
      ) : null}
      <p className={`font-bold text-neutral-900 ${compact ? 'text-[11px] leading-snug' : 'mt-1.5 text-sm'}`}>
        {formatSubjectLabel(entry.subjectId)}
      </p>
      {entry.teacherName ? (
        <p
          className={`flex items-center gap-1 font-medium text-neutral-600 ${compact ? 'mt-0.5 text-[10px]' : 'mt-1 text-[11px]'}`}
        >
          <User aria-hidden className={`shrink-0 text-brand-600 ${compact ? 'size-2.5' : 'size-3'}`} />
          <span className="truncate">{entry.teacherName}</span>
        </p>
      ) : null}
      {canEdit && onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className={`inline-flex items-center font-semibold text-red-600 hover:underline ${compact ? 'mt-1 text-[10px]' : 'mt-2 min-h-[44px] text-[11px] sm:min-h-0'}`}
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

function TermStructureGrid({
  entries,
  scheduleSlots,
  showStatus,
  canEdit,
  onDeleteEntry,
  onEmptySlotClick,
}: {
  entries: TimetableEntryResponse[];
  scheduleSlots: BellScheduleSlot[];
  showStatus?: boolean;
  canEdit?: boolean;
  onDeleteEntry?: (entryId: string) => void;
  onEmptySlotClick?: (slot: TimetableSlotTarget) => void;
}) {
  let lessonIndex = 0;

  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto rounded-2xl border border-brand-100/40 bg-white/80 p-2 shadow-inner sm:p-3">
        <div className="min-w-[680px]">
          <div
            className="grid gap-1.5 sm:gap-2"
            style={{ gridTemplateColumns: `minmax(7rem, 8rem) repeat(${SCHOOL_WEEKDAYS.length}, minmax(0, 1fr))` }}
          >
            <div className="rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 px-2 py-3 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
              Period
            </div>
            {SCHOOL_WEEKDAYS.map((day) => (
              <div
                key={day.value}
                className="rounded-xl bg-gradient-to-br from-brand-100/60 to-brand-50/40 px-2 py-3 text-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-900/70"
              >
                {day.short}
              </div>
            ))}

            {scheduleSlots.flatMap((slot, index) => {
              if (slot.type === 'break') {
                return [
                  <div
                    key={`break-label-${index}`}
                    className="flex flex-col justify-center rounded-xl border border-dashed border-neutral-200/80 bg-neutral-100/60 px-2.5 py-2"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Break</span>
                    <span className="text-[11px] font-semibold text-neutral-600">{slot.label}</span>
                  </div>,
                  <div
                    key={`break-span-${index}`}
                    className="col-span-5 flex min-h-[2.75rem] items-center justify-center rounded-xl bg-neutral-100/40 px-3"
                    style={{ gridColumn: '2 / -1' }}
                  >
                    <span className="text-[11px] font-medium text-neutral-400">
                      {formatTimeRange(slot.startMinute, slot.endMinute)}
                    </span>
                  </div>,
                ];
              }

              lessonIndex += 1;
              const periodNum = lessonIndex;

              return [
                <div
                  key={`period-label-${index}`}
                  className="flex flex-col justify-center rounded-xl border border-neutral-100/80 bg-neutral-50/80 px-2.5 py-2"
                >
                  <span className="text-[10px] font-bold text-brand-600/80">P{periodNum}</span>
                  <span className="text-[11px] font-semibold tabular-nums text-neutral-700">
                    {formatTimeRange(slot.startMinute, slot.endMinute)}
                  </span>
                </div>,
                ...SCHOOL_WEEKDAYS.map((day) => {
                  const entry = findEntryForSlot(
                    entries,
                    day.value,
                    slot.startMinute,
                    slot.endMinute,
                  );
                  const target: TimetableSlotTarget = {
                    dayOfWeek: day.value,
                    startMinute: slot.startMinute,
                    endMinute: slot.endMinute,
                    periodLabel: slot.label,
                  };

                  return (
                    <div key={`period-${index}-day-${day.value}`} className="min-h-[4.75rem]">
                      {entry ? (
                        <TimetableSlot
                          entry={entry}
                          showStatus={showStatus}
                          canEdit={canEdit}
                          onDelete={onDeleteEntry}
                          compact
                        />
                      ) : canEdit && onEmptySlotClick ? (
                        <button
                          type="button"
                          aria-label={`Add lesson on ${day.label} ${slot.label}`}
                          onClick={() => onEmptySlotClick(target)}
                          className="group flex h-full min-h-[4.75rem] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-200/50 bg-brand-50/10 transition hover:border-brand-400 hover:bg-brand-50/50 hover:shadow-sm active:scale-[0.98]"
                        >
                          <span className="flex size-9 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-brand-200/60 transition group-hover:bg-brand-600 group-hover:text-white">
                            <Plus aria-hidden className="size-4" />
                          </span>
                          <span className="mt-1.5 text-[10px] font-semibold text-brand-700/70 group-hover:text-brand-800">
                            Add
                          </span>
                        </button>
                      ) : (
                        <div className="flex h-full min-h-[4.75rem] items-center justify-center rounded-xl border border-dashed border-neutral-100 bg-neutral-50/30">
                          <span className="text-[10px] text-neutral-300">—</span>
                        </div>
                      )}
                    </div>
                  );
                }),
              ];
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TimetableWeekGrid({
  entries,
  scheduleSlots = DEFAULT_BELL_SCHEDULE_SLOTS,
  isLoading,
  showStatus = false,
  onDeleteEntry,
  onEmptySlotClick,
  canEdit = false,
  emptyMessage = 'No periods scheduled yet.',
  showTermStructure = false,
}: TimetableWeekGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-64 rounded" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (showTermStructure) {
    return (
      <TermStructureGrid
        entries={entries}
        scheduleSlots={scheduleSlots}
        showStatus={showStatus}
        canEdit={canEdit}
        onDeleteEntry={onDeleteEntry}
        onEmptySlotClick={onEmptySlotClick}
      />
    );
  }

  const hasEntries = entries.length > 0;

  if (!hasEntries) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 py-16">
        <Clock aria-hidden className="mb-2 size-8 text-neutral-300" />
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {SCHOOL_WEEKDAYS.map((day) => {
        const dayEntries = entries
          .filter((entry) => entry.dayOfWeek === day.value)
          .sort((a, b) => a.startMinute - b.startMinute);
        return (
          <div
            key={day.value}
            className="flex flex-col rounded-2xl border border-brand-100/40 bg-gradient-to-b from-brand-50/30 to-white p-3"
          >
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              {day.label}
            </p>
            <div className="flex flex-1 flex-col gap-2">
              {dayEntries.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-400">Free</p>
              ) : (
                dayEntries.map((entry) => (
                  <TimetableSlot
                    key={entry.id}
                    entry={entry}
                    showStatus={showStatus}
                    canEdit={canEdit}
                    onDelete={onDeleteEntry}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
