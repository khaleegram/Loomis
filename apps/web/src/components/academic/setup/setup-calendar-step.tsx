'use client';

import { useEffect, useState } from 'react';
import { useAcademicSetupPreferences, useUpsertAcademicSetupPreferences } from '@loomis/api-client';
import { ArrowLeft, ArrowRight, CalendarDays, Check } from 'lucide-react';
import { cn } from '@loomis/ui-web';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import {
  DEFAULT_CALENDAR_PREFERENCES,
  type CalendarPreferences,
} from '@/lib/academic/calendar-preferences';

interface SetupCalendarStepProps {
  tenantId: string;
  onBack: () => void;
  onComplete: () => void;
}

export function SetupCalendarStep({ tenantId, onBack, onComplete }: SetupCalendarStepProps) {
  const preferencesQuery = useAcademicSetupPreferences(tenantId);
  const upsertPreferences = useUpsertAcademicSetupPreferences(tenantId);
  const [prefs, setPrefs] = useState<CalendarPreferences>(
    preferencesQuery.data?.calendar ?? DEFAULT_CALENDAR_PREFERENCES,
  );

  useEffect(() => {
    if (preferencesQuery.data?.calendar) {
      setPrefs(preferencesQuery.data.calendar);
    }
  }, [preferencesQuery.data]);

  function toggle(key: keyof CalendarPreferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    await upsertPreferences.mutateAsync({ calendar: prefs });
    onComplete();
  }

  const questions: { key: keyof CalendarPreferences; label: string; hint: string }[] = [
    {
      key: 'hasMidTermBreak',
      label: 'Do you have a mid-term break?',
      hint: 'Most schools close for one week around the middle of each term.',
    },
    {
      key: 'hasOpenDay',
      label: 'Do you have an open day or PTA?',
      hint: 'Parents visit to see student work - usually a week before exams.',
    },
    {
      key: 'hasResultDay',
      label: 'Do you have a result day?',
      hint: 'When parents collect report cards - usually a few days before term ends.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className={ACADEMIC_UI.sectionLabel}>Calendar</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900">
          Key dates for your school
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
          We add these to your calendar automatically from your term dates. Staff, parents, and
          students can see them - you don&apos;t need to create events manually.
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q) => {
          const on = prefs[q.key];
          return (
            <button
              key={q.key}
              type="button"
              onClick={() => toggle(q.key)}
              className={cn(
                'flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition',
                on
                  ? 'border-brand-400 bg-brand-50/60 ring-1 ring-brand-200/60'
                  : 'border-neutral-200 bg-white hover:border-brand-200',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
                  on ? 'bg-brand-600 text-white' : 'border border-neutral-300 bg-white',
                )}
              >
                {on ? <Check aria-hidden className="size-3.5" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-neutral-900">{q.label}</p>
                <p className="mt-0.5 text-[12px] text-neutral-500">{q.hint}</p>
              </div>
              <CalendarDays aria-hidden className="size-5 shrink-0 text-neutral-300" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-400 hover:text-neutral-600"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back
        </button>
        <button
          type="button"
          disabled={upsertPreferences.isPending}
          onClick={() => void handleSave()}
          className={cn(ACADEMIC_UI.btnPrimary, 'justify-center')}
        >
          {upsertPreferences.isPending ? 'Saving…' : 'Save calendar & finish'}
          <ArrowRight aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
