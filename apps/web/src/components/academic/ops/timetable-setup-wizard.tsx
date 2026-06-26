'use client';

import { useMemo, useState } from 'react';
import { useUpsertBellSchedule } from '@loomis/api-client';
import type { BellScheduleSlot } from '@loomis/contracts';
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { SEMANTIC } from '@/lib/design/surfaces';

interface TimetableSetupWizardProps {
  tenantId: string;
  academicYearId: string | null;
  onSaved?: () => void;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function buildSlots(input: {
  startTime: string;
  endTime: string;
  periodMinutes: number;
  hasBreak: boolean;
}): BellScheduleSlot[] {
  const slots: BellScheduleSlot[] = [];
  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  const breakStart = start + input.periodMinutes * 3;
  const breakEnd = breakStart + 20;
  let cursor = start;
  let period = 1;

  while (cursor + input.periodMinutes <= end && slots.length < 18) {
    if (input.hasBreak && cursor === breakStart && breakEnd < end) {
      slots.push({ label: 'Break', type: 'break', startMinute: breakStart, endMinute: breakEnd });
      cursor = breakEnd;
      continue;
    }
    slots.push({
      label: `Period ${period}`,
      type: 'lesson',
      startMinute: cursor,
      endMinute: cursor + input.periodMinutes,
    });
    cursor += input.periodMinutes;
    period += 1;
  }
  return slots;
}

export function TimetableSetupWizard({ tenantId, academicYearId, onSaved }: TimetableSetupWizardProps) {
  const save = useUpsertBellSchedule(tenantId);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('14:30');
  const [periodMinutes, setPeriodMinutes] = useState(40);
  const [hasBreak, setHasBreak] = useState(true);
  const [schoolDays, setSchoolDays] = useState(new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']));
  const [error, setError] = useState<string | null>(null);

  const slots = useMemo(
    () => buildSlots({ startTime, endTime, periodMinutes, hasBreak }),
    [startTime, endTime, periodMinutes, hasBreak],
  );

  async function saveSchedule() {
    if (!academicYearId) {
      setError('Start your school year before setting the timetable.');
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({ academicYearId, slots });
      onSaved?.();
    } catch (err) {
      setError(academicErrorMessage(err));
    }
  }

  function toggleDay(day: string) {
    setSchoolDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <section className="card space-y-5 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Clock aria-hidden className="size-5" />
        </span>
        <div>
          <p className={ACADEMIC_UI.sectionLabel}>Timetable setup</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-neutral-900">
            Build your school day first
          </h2>
          <p className="mt-1 text-[13px] text-neutral-500">
            Answer these once. Loomis creates empty periods, then you tap slots to assign subject and teacher.
          </p>
        </div>
      </div>

      {error ? <div className={`rounded-xl border p-3 text-sm ${SEMANTIC.danger.surface}`}>{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1.5 text-[12px] font-semibold text-neutral-600">
          School starts
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-[14px]"
          />
        </label>
        <label className="space-y-1.5 text-[12px] font-semibold text-neutral-600">
          School closes
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-[14px]"
          />
        </label>
        <label className="space-y-1.5 text-[12px] font-semibold text-neutral-600">
          One period
          <select
            value={periodMinutes}
            onChange={(e) => setPeriodMinutes(Number(e.target.value))}
            className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-[14px]"
          >
            <option value={30}>30 minutes</option>
            <option value={35}>35 minutes</option>
            <option value={40}>40 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-neutral-600">Which days do you teach?</p>
        <div className="flex flex-wrap gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
            const selected = schoolDays.has(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-[12px] font-bold',
                  selected ? 'border-brand-400 bg-brand-50 text-brand-900' : 'border-neutral-200 text-neutral-500',
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-[13px] text-neutral-600">
        <input
          type="checkbox"
          checked={hasBreak}
          onChange={(e) => setHasBreak(e.target.checked)}
          className="mt-0.5 size-4"
        />
        <span>
          <strong className="text-neutral-900">Add a break after Period 3.</strong> You can fine-tune break and lunch on the bell schedule page.
        </span>
      </label>

      <div className="rounded-xl bg-neutral-50 p-3 text-[12px] text-neutral-600">
        Preview: {slots.filter((slot) => slot.type === 'lesson').length} lesson periods
        {hasBreak ? ' + break' : ''}, {minutesToTime(timeToMinutes(startTime))} to {minutesToTime(timeToMinutes(endTime))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <a href="/school/timetable/bell-schedule" className="text-[12px] font-semibold text-brand-700 hover:underline">
          Fine-tune bell schedule
        </a>
        <button
          type="button"
          disabled={save.isPending || !academicYearId || slots.length === 0}
          onClick={() => void saveSchedule()}
          className={cn(ACADEMIC_UI.btnPrimary, 'justify-center')}
        >
          {save.isPending ? 'Saving…' : 'Create empty periods'}
          <ArrowRight aria-hidden className="size-4" />
        </button>
      </div>
    </section>
  );
}
