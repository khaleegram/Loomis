'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@loomis/ui-web';
import type { StudentStatus } from '@loomis/contracts';

export type StudentStatusFilter = 'all' | StudentStatus;

interface StudentToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StudentStatusFilter;
  onStatusFilterChange: (value: StudentStatusFilter) => void;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  filteredCount?: number;
  totalCount?: number;
}

interface FilterChip {
  key: StudentStatusFilter;
  label: string;
  statusKey: StudentStatusFilter;
}

const FILTER_CHIPS: FilterChip[] = [
  { key: 'all', label: 'All', statusKey: 'all' },
  { key: 'enrolled', label: 'Enrolled', statusKey: 'enrolled' },
  { key: 'admitted', label: 'Admitted', statusKey: 'admitted' },
  { key: 'graduated', label: 'Graduated', statusKey: 'graduated' },
  { key: 'transferred_out', label: 'Transferred Out', statusKey: 'transferred_out' },
  { key: 'withdrawn', label: 'Withdrawn', statusKey: 'withdrawn' },
];

export function StudentToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  filteredCount,
  totalCount,
}: StudentToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const hasActiveFilter = statusFilter !== 'all' || search.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-md w-64">
          <Search
            aria-hidden
            className={`pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 transition-colors duration-200 ${
              isSearchFocused ? 'text-brand-600' : 'text-neutral-400'
            }`}
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search by name or file number…"
            aria-label="Search students"
            className="h-10 border-neutral-200 pl-10 pr-8 text-[13px] transition-all duration-200 focus:border-brand-300 focus:ring-brand-200"
          />
          {search ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-600"
              aria-label="Clear search"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* Result count — subtle inline */}
        {filteredCount !== undefined && totalCount !== undefined && hasActiveFilter ? (
          <span className="hidden text-[11px] tabular-nums text-neutral-400 sm:inline">
            <span className="font-semibold text-neutral-600">{filteredCount}</span>
            <span className="mx-0.5">/</span>
            <span>{totalCount}</span>
          </span>
        ) : null}
      </div>

      {/* Filter Chips + View Toggle */}
      <div className="flex items-center gap-3">
        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1">
          {FILTER_CHIPS.map((chip) => {
            const isActive = statusFilter === chip.statusKey;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => onStatusFilterChange(chip.statusKey)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-neutral-500 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="flex shrink-0 items-center rounded-xl border border-neutral-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange('cards')}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
              viewMode === 'cards'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-700'
            }`}
            aria-label="Card view"
            title="Directory view"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <rect x="0.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="8.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="0.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="8.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
              viewMode === 'table'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-700'
            }`}
            aria-label="Table view"
            title="Table view"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <rect x="0.5" y="0.5" width="13" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="0.5" y="5.5" width="13" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="0.5" y="10.5" width="13" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
