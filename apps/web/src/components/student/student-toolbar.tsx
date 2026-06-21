'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input, cn } from '@loomis/ui-web';
import type { StudentStatus } from '@loomis/contracts';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';

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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
        <div className="relative w-full lg:max-w-md lg:w-64">
          <Search
            aria-hidden
            className={cn(
              'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 transition-colors duration-200',
              isSearchFocused ? 'text-brand-600' : 'text-neutral-400',
            )}
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search by name or file number…"
            aria-label="Search students"
            className={ACADEMIC_UI.searchField}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-600"
              aria-label="Clear search"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>

        {filteredCount !== undefined && totalCount !== undefined && hasActiveFilter ? (
          <span className="hidden text-[11px] tabular-nums text-neutral-400 sm:inline">
            <span className="font-semibold text-neutral-600">{filteredCount}</span>
            <span className="mx-0.5">/</span>
            <span>{totalCount}</span>
          </span>
        ) : null}
      </div>

      <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:flex-nowrap">
        <div className={ACADEMIC_UI.chipBar}>
          {FILTER_CHIPS.map((chip) => {
            const isActive = statusFilter === chip.statusKey;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => onStatusFilterChange(chip.statusKey)}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-[12px] font-semibold transition-all duration-200 min-h-[44px] sm:min-h-0 sm:py-1.5',
                  isActive ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className={ACADEMIC_UI.segmentedControl}>
          <button
            type="button"
            onClick={() => onViewModeChange('cards')}
            className={cn(
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 sm:min-h-0 sm:min-w-0',
              viewMode === 'cards' ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
            )}
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
            className={cn(
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 sm:min-h-0 sm:min-w-0',
              viewMode === 'table' ? ACADEMIC_UI.chipActive : ACADEMIC_UI.chipInactive,
            )}
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
