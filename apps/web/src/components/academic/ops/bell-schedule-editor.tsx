'use client';

import type { BellScheduleSlot } from '@loomis/contracts';
import { cn } from '@loomis/ui-web';
import { Coffee, GripVertical, Plus, Trash2 } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatTimeRange, minuteFromTimeInput, timeInputFromMinute } from '@/lib/timetable/timetable-utils';

interface BellScheduleEditorProps {
  slots: BellScheduleSlot[];
  onChange: (slots: BellScheduleSlot[]) => void;
  disabled?: boolean;
}

export function BellScheduleEditor({ slots, onChange, disabled }: BellScheduleEditorProps) {
  function updateSlot(index: number, patch: Partial<BellScheduleSlot>) {
    onChange(slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function addSlot(type: BellScheduleSlot['type']) {
    const last = slots[slots.length - 1];
    const start = last ? last.endMinute : 480;
    onChange([
      ...slots,
      {
        label: type === 'break' ? 'Break' : `Period ${slots.filter((s) => s.type === 'lesson').length + 1}`,
        type,
        startMinute: start,
        endMinute: start + (type === 'break' ? 20 : 40),
      },
    ]);
  }

  function removeSlot(index: number) {
    onChange(slots.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-[1.125rem] top-4 bottom-4 w-0.5 bg-gradient-to-b from-brand-300 via-brand-200 to-brand-100" aria-hidden />

        <div className="space-y-3">
          {slots.map((slot, index) => {
            const isBreak = slot.type === 'break';
            return (
              <div key={`${slot.label}-${index}`} className="relative flex gap-3 pl-1">
                <span
                  className={cn(
                    'relative z-10 mt-4 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm',
                    isBreak ? 'bg-neutral-200 text-neutral-600' : 'bg-brand-600 text-white',
                  )}
                >
                  {isBreak ? <Coffee aria-hidden className="size-4" /> : index + 1}
                </span>

                <div
                  className={cn(
                    'card flex-1 rounded-2xl border p-4 transition',
                    isBreak ? 'border-neutral-200/80 bg-neutral-50/50' : 'border-brand-100/60 bg-white',
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GripVertical aria-hidden className="size-4 text-neutral-300" />
                      <input
                        type="text"
                        value={slot.label}
                        disabled={disabled}
                        onChange={(e) => updateSlot(index, { label: e.target.value })}
                        className="min-w-0 flex-1 bg-transparent text-[14px] font-extrabold text-neutral-900 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => updateSlot(index, { type: isBreak ? 'lesson' : 'break' })}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition',
                          isBreak
                            ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                            : 'bg-brand-100 text-brand-800 hover:bg-brand-200',
                        )}
                      >
                        {isBreak ? 'Break' : 'Lesson'}
                      </button>
                      <button
                        type="button"
                        disabled={disabled || slots.length <= 1}
                        onClick={() => removeSlot(index)}
                        className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove slot"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className={ACADEMIC_UI.sectionLabel}>Starts</span>
                      <input
                        type="time"
                        disabled={disabled}
                        value={timeInputFromMinute(slot.startMinute)}
                        onChange={(e) => updateSlot(index, { startMinute: minuteFromTimeInput(e.target.value) })}
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] font-semibold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={ACADEMIC_UI.sectionLabel}>Ends</span>
                      <input
                        type="time"
                        disabled={disabled}
                        value={timeInputFromMinute(slot.endMinute)}
                        onChange={(e) => updateSlot(index, { endMinute: minuteFromTimeInput(e.target.value) })}
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] font-semibold"
                      />
                    </label>
                  </div>

                  <p className="mt-2 text-[11px] font-medium text-neutral-400">
                    {formatTimeRange(slot.startMinute, slot.endMinute)}
                    {isBreak ? ' · non-teaching' : ' · assignable in timetable grid'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => addSlot('lesson')}
          className={cn(ACADEMIC_UI.btnSecondary, 'min-h-[44px]')}
        >
          <Plus aria-hidden className="size-4" />
          Add lesson period
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => addSlot('break')}
          className={cn(ACADEMIC_UI.btnSecondary, 'min-h-[44px]')}
        >
          <Coffee aria-hidden className="size-4" />
          Add break
        </button>
      </div>
    </div>
  );
}
