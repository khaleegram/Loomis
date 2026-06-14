'use client';

import { SmartSearchSelect } from '@loomis/ui-web';
import { X } from 'lucide-react';

import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';
import {
  DEFAULT_REPORT_CARD_FILTERS,
  type ReportCardFilters,
  type ReportCardGenderFilter,
  type ReportCardPerformanceFilter,
  type ReportCardSortBy,
} from '@/lib/academic/report-card-filters';
import { formatSubjectLabel } from '@/lib/academic/ops-labels';

const SUBJECT_ALL = '__all__';

interface ReportCardRosterFiltersProps {
  filters: ReportCardFilters;
  onChange: (filters: ReportCardFilters) => void;
  filteredCount: number;
  totalCount: number;
  variant?: 'panel';
}

const SORT_OPTIONS: { value: ReportCardSortBy; label: string }[] = [
  { value: 'position', label: 'Position' },
  { value: 'admission', label: 'Adm no.' },
  { value: 'name', label: 'Name' },
];

const GENDER_OPTIONS: { value: ReportCardGenderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const PERFORMANCE_OPTIONS: { value: ReportCardPerformanceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'at_risk', label: 'At risk' },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${
        active
          ? 'bg-brand-700 text-white shadow-sm'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
      }`}
    >
      {children}
    </button>
  );
}

function PanelSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

export function ReportCardSubjectSelect({
  value,
  subjectIds,
  onChange,
  className,
}: {
  value: string | null;
  subjectIds: string[];
  onChange: (subjectId: string | null) => void;
  className?: string;
}) {
  const selectTrigger = `${GRADEBOOK_UI.scopeTrigger} h-7 min-w-0 px-2 text-[10px] shadow-none`;

  return (
    <SmartSearchSelect
      value={value ?? SUBJECT_ALL}
      onValueChange={(v) => onChange(!v || v === SUBJECT_ALL ? null : v)}
      options={[
        { value: SUBJECT_ALL, label: 'All subjects', keywords: 'all' },
        ...subjectIds.map((subjectId) => ({
          value: subjectId,
          label: formatSubjectLabel(subjectId),
          keywords: formatSubjectLabel(subjectId),
        })),
      ]}
      placeholder="View"
      searchPlaceholder="View subject…"
      triggerClassName={`${selectTrigger} max-w-[7.5rem] ${className ?? ''}`}
      contentClassName="z-[250] rounded-2xl border border-black/[0.07] bg-white shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)]"
    />
  );
}

export function ReportCardRosterFilters({
  filters,
  onChange,
  filteredCount,
  totalCount,
  variant = 'panel',
}: ReportCardRosterFiltersProps) {
  function patch(partial: Partial<ReportCardFilters>) {
    onChange({ ...filters, ...partial });
  }

  if (variant === 'panel') {
    return (
      <div className="space-y-2.5 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2">
          <p className="text-[11px] font-semibold text-neutral-800">Refine roster</p>
          <span className="text-[10px] tabular-nums text-neutral-500">
            {filteredCount}/{totalCount} shown
          </span>
        </div>

        <PanelSection label="Order by">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={filters.sortBy === option.value}
              onClick={() => patch({ sortBy: option.value })}
            >
              {option.label}
            </Chip>
          ))}
        </PanelSection>

        <PanelSection label="Gender">
          {GENDER_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={filters.gender === option.value}
              onClick={() => patch({ gender: option.value })}
            >
              {option.label}
            </Chip>
          ))}
        </PanelSection>

        <PanelSection label="Results">
          {PERFORMANCE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={filters.performance === option.value}
              onClick={() => patch({ performance: option.value })}
            >
              {option.label}
            </Chip>
          ))}
        </PanelSection>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_REPORT_CARD_FILTERS)}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-neutral-200 py-1.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          <X className="size-3" />
          Reset
        </button>
      </div>
    );
  }

  return null;
}
