'use client';

import type { AcademicTermResponse, AcademicYearResponse } from '@loomis/contracts';
import { Badge, cn } from '@loomis/ui-web';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { formatCalendarDate } from '@/lib/academic/term-labels';

interface FinanceScopePickerProps {
  years: AcademicYearResponse[];
  terms: AcademicTermResponse[];
  yearId: string | null;
  termId: string | null;
  onYearChange: (id: string) => void;
  onTermChange: (id: string) => void;
  termMeta?: string | null;
}

function termStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'census_locked':
      return 'Snapshot taken';
    case 'closed':
      return 'Closed';
    default:
      return 'Draft';
  }
}

function termStatusClass(status: string): string {
  switch (status) {
    case 'open':
      return 'border-accent-green-100 bg-accent-green-50 text-accent-green-700';
    case 'census_locked':
      return 'border-gold-200 bg-gold-50 text-gold-800';
    case 'closed':
      return 'border-neutral-200 bg-neutral-100 text-neutral-600';
    default:
      return 'border-brand-200 bg-brand-50 text-brand-800';
  }
}

export function FinanceScopePicker({
  years,
  terms,
  yearId,
  termId,
  onYearChange,
  onTermChange,
  termMeta,
}: FinanceScopePickerProps) {
  const [sessionOpen, setSessionOpen] = useState(false);

  const activeYear = years.find((y) => y.id === yearId) ?? null;
  const activeTerm = terms.find((t) => t.id === termId) ?? null;

  return (
    <div className={`overflow-hidden ${ACADEMIC_UI.dataPanel}`}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className={ACADEMIC_UI.sectionLabel}>Billing period</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSessionOpen((open) => !open)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brand-200/80 bg-white px-3 py-2 text-left shadow-xs transition hover:border-brand-300 sm:min-h-0"
              >
                <CalendarDays aria-hidden className="size-4 shrink-0 text-brand-600" />
                <span className="text-[13px] font-bold text-neutral-900">
                  {activeYear?.label ?? 'Pick year'}
                  {activeTerm ? ` · ${activeTerm.name}` : ''}
                </span>
                {activeTerm ? (
                  <Badge
                    variant="outline"
                    className={cn('ml-1 text-[10px] font-bold', termStatusClass(activeTerm.status))}
                  >
                    {termStatusLabel(activeTerm.status)}
                  </Badge>
                ) : null}
                <ChevronDown
                  aria-hidden
                  className={cn('size-4 text-neutral-400 transition', sessionOpen && 'rotate-180')}
                />
              </button>
              {termMeta ? (
                <span className="text-[12px] font-medium text-neutral-500">{termMeta}</span>
              ) : null}
            </div>
            {activeTerm ? (
              <p className="mt-2 text-[11px] text-neutral-400">
                {formatCalendarDate(activeTerm.startDate)} – {formatCalendarDate(activeTerm.endDate)}
              </p>
            ) : null}
          </div>
        </div>

        {sessionOpen ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className={ACADEMIC_UI.sectionLabel}>Academic year</span>
              <select
                value={yearId ?? ''}
                onChange={(e) => onYearChange(e.target.value)}
                className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-900"
              >
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={ACADEMIC_UI.sectionLabel}>Term</span>
              <select
                value={termId ?? ''}
                onChange={(e) => onTermChange(e.target.value)}
                className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px] font-medium text-neutral-900"
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
