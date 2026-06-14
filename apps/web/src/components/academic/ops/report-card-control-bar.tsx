'use client';

import {
  DEFAULT_REPORT_CARD_FILTERS,
  hasActiveReportCardFilters,
  type ClassReportCardStats,
  type ReportCardFilters,
} from '@/lib/academic/report-card-filters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  SmartSearchSelect,
} from '@loomis/ui-web';
import { Search, SlidersHorizontal, X } from 'lucide-react';

import {
  ReportCardRosterFilters,
  ReportCardSubjectSelect,
} from '@/components/academic/ops/report-card-roster-filters';
import { GRADEBOOK_UI } from '@/lib/academic/gradebook-ui';

/** Matches app-bar workspace menu — opaque white float panel. */
const FLOAT_PANEL =
  'z-[250] max-h-[min(70vh,420px)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-black/[0.07] bg-white p-0 shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

interface ReportCardControlBarProps {
  filters: ReportCardFilters;
  onFiltersChange: (filters: ReportCardFilters) => void;
  subjectIds: string[];
  studentSelectOptions: { value: string; label: string; keywords: string }[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
  filteredCount: number;
  totalCount: number;
  stats: ClassReportCardStats;
  classLabel?: string | null;
  termName?: string | null;
}

function StatPill({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <span className="hidden items-baseline gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] sm:inline-flex">
      <span className="font-medium text-neutral-500">{label}</span>
      <span className={`font-mono font-bold tabular-nums ${warn ? 'text-amber-800' : 'text-neutral-800'}`}>
        {value}
      </span>
    </span>
  );
}

/** Single polished toolbar — search, sort, view, jump, floating refine panel, stats. */
export function ReportCardControlBar({
  filters,
  onFiltersChange,
  subjectIds,
  studentSelectOptions,
  selectedStudentId,
  onSelectStudent,
  filteredCount,
  totalCount,
  stats,
  classLabel,
  termName,
}: ReportCardControlBarProps) {
  const filtersActive = hasActiveReportCardFilters(filters);
  const advancedActive = filters.gender !== 'all' || filters.performance !== 'all' || filters.sortBy !== 'admission';

  return (
    <div className="print:hidden border-b border-neutral-200 bg-neutral-50/95 px-3 py-2 sm:px-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold text-neutral-800">
          {classLabel ?? 'Class'}
          {termName ? <span className="font-normal text-neutral-500"> · {termName}</span> : null}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatPill label="Avg" value={stats.classAverage != null ? `${stats.classAverage}%` : '—'} />
          <StatPill label="Done" value={`${stats.completeCount}/${stats.totalStudents}`} />
          <StatPill label="Risk" value={String(stats.failingCount)} warn={stats.failingCount > 0} />
          <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-bold tabular-nums text-brand-800">
            {filteredCount}/{totalCount}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative min-w-0 flex-1 basis-28 sm:max-w-40">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
            placeholder="Search…"
            className="h-8 w-full rounded-lg border border-neutral-200 bg-white pl-7 pr-7 text-[11px] shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/15"
            aria-label="Search students"
          />
          {filters.query ? (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, query: '' })}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>

        <ReportCardSubjectSelect
          value={filters.subjectId}
          subjectIds={subjectIds}
          onChange={(subjectId) => onFiltersChange({ ...filters, subjectId })}
        />

        <SmartSearchSelect
          value={selectedStudentId}
          onValueChange={(id) => id && onSelectStudent(id)}
          options={studentSelectOptions}
          placeholder="Jump…"
          searchPlaceholder="Student…"
          triggerClassName={`${GRADEBOOK_UI.scopeTrigger} h-8 min-w-[5rem] max-w-[7.5rem] px-2 text-[10px] shadow-sm`}
          contentClassName="z-[250] rounded-2xl border border-black/[0.07] bg-white shadow-[0_8px_32px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)]"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold shadow-sm transition-colors ${
                advancedActive
                  ? 'border-brand-400 bg-brand-700 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <SlidersHorizontal className="size-3" />
              Refine
              {advancedActive ? (
                <span className="rounded-full bg-white/20 px-1 text-[8px] uppercase tracking-wide">
                  on
                </span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className={FLOAT_PANEL}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <ReportCardRosterFilters
              filters={filters}
              onChange={onFiltersChange}
              filteredCount={filteredCount}
              totalCount={totalCount}
              variant="panel"
            />
          </DropdownMenuContent>
        </DropdownMenu>

        {filtersActive ? (
          <button
            type="button"
            onClick={() => onFiltersChange(DEFAULT_REPORT_CARD_FILTERS)}
            className="hidden h-8 items-center gap-0.5 rounded-lg px-2 text-[10px] font-semibold text-brand-700 hover:bg-brand-50 sm:inline-flex"
          >
            <X className="size-3" />
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
