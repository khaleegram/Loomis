'use client';

import { useMemo, useState } from 'react';
import { useAcademicTerms } from '@loomis/api-client';
import { Badge, cn } from '@loomis/ui-web';
import { CalendarDays, ChevronDown, RotateCcw } from 'lucide-react';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useSchoolAcademic } from '@/lib/academic/school-academic-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function termStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'census_locked':
      return 'Census locked';
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

/** Global working session — shown once in the school app bar. */
export function SchoolAcademicSessionBar() {
  const tenantId = useTenantId();
  const {
    sortedYears,
    yearId,
    termId,
    activeYear,
    activeTerm,
    isHistoricalView,
    canSwitchTerm,
    isLoading,
    setHistoricalTerm,
    resetToOpenTerm,
  } = useSchoolAcademic();

  const [open, setOpen] = useState(false);
  const [pickerYearId, setPickerYearId] = useState<string | null>(null);

  const resolvedPickerYearId = pickerYearId ?? yearId ?? sortedYears[0]?.id ?? null;
  const pickerTermsQuery = useAcademicTerms(tenantId ?? '', resolvedPickerYearId ?? '');
  const pickerTerms = pickerTermsQuery.data?.terms ?? [];

  const label = useMemo(() => {
    if (isLoading) return 'Loading session…';
    if (!activeYear || !activeTerm) return 'No active term';
    return `${activeYear.label} · ${activeTerm.name}`;
  }, [activeTerm, activeYear, isLoading]);

  if (isLoading) {
    return (
      <span className="hidden shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[12px] font-medium text-neutral-500 lg:inline-flex">
        Session…
      </span>
    );
  }

  if (!canSwitchTerm) {
    return (
      <span
        className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-brand-200/70 bg-brand-50/60 px-3 py-1.5 lg:inline-flex"
        title="School working session"
      >
        <CalendarDays aria-hidden className="size-3.5 text-brand-700" />
        <span className="max-w-[12rem] truncate text-[12px] font-semibold text-neutral-900">{label}</span>
        {activeTerm ? (
          <Badge variant="outline" className={cn('text-[9px] font-bold', termStatusClass(activeTerm.status))}>
            {termStatusLabel(activeTerm.status)}
          </Badge>
        ) : null}
      </span>
    );
  }

  return (
    <div className="relative hidden shrink-0 lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-left transition-colors',
          isHistoricalView
            ? 'border-gold-300 bg-gold-50/80 hover:bg-gold-50'
            : 'border-brand-200/70 bg-brand-50/60 hover:bg-brand-50',
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays aria-hidden className="size-3.5 shrink-0 text-brand-700" />
        <span className="max-w-[11rem] truncate text-[12px] font-semibold text-neutral-900">{label}</span>
        {activeTerm ? (
          <Badge variant="outline" className={cn('text-[9px] font-bold', termStatusClass(activeTerm.status))}>
            {termStatusLabel(activeTerm.status)}
          </Badge>
        ) : null}
        {isHistoricalView ? (
          <span className="rounded-full bg-gold-500 px-1.5 py-px text-[9px] font-bold text-neutral-900">Past</span>
        ) : null}
        <ChevronDown aria-hidden className={cn('size-3.5 text-neutral-400 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[60] mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-4 shadow-lg">
          <p className={ACADEMIC_UI.sectionLabel}>Working session</p>
          <p className="mt-1 text-[12px] text-neutral-500">
            All school pages use this term. Switch only to review historical finance or closed terms.
          </p>
          <div className="mt-3 space-y-2">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Year</span>
              <select
                value={resolvedPickerYearId ?? ''}
                onChange={(e) => setPickerYearId(e.target.value)}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px]"
              >
                {sortedYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Term</span>
              <select
                value={termId ?? ''}
                onChange={(e) => {
                  if (resolvedPickerYearId) {
                    setHistoricalTerm(resolvedPickerYearId, e.target.value);
                  }
                }}
                disabled={pickerTerms.length === 0}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px]"
              >
                {pickerTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} · {term.status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {isHistoricalView ? (
            <button
              type="button"
              onClick={() => {
                resetToOpenTerm();
                setOpen(false);
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[12px] font-semibold text-brand-900"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              Return to current term
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function SchoolHistoricalTermBanner() {
  const { activeYear, activeTerm, isHistoricalView, resetToOpenTerm } = useSchoolAcademic();

  if (!isHistoricalView || !activeYear || !activeTerm) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-2 border-b border-gold-200 bg-gold-50 px-4 py-2 text-[12px] text-gold-900 sm:flex-row sm:items-center sm:justify-between lg:px-6"
    >
      <p>
        <span className="font-bold">Historical view</span> — viewing {activeYear.label} · {activeTerm.name} (
        {activeTerm.status.replace(/_/g, ' ')}). Daily operations normally use the current open term.
      </p>
      <button
        type="button"
        onClick={resetToOpenTerm}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gold-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-gold-900"
      >
        <RotateCcw aria-hidden className="size-3.5" />
        Return to current term
      </button>
    </div>
  );
}
