'use client';

import type { TermEnrollmentRosterEntry } from '@loomis/contracts';
import { Skeleton, cn } from '@loomis/ui-web';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { smartInputClass } from '@/components/shared/smart-form';

interface CommsStudentRosterPickerProps {
  students: TermEnrollmentRosterEntry[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading?: boolean;
}

export function CommsStudentRosterPicker({
  students,
  selectedIds,
  onChange,
  isLoading,
}: CommsStudentRosterPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q),
    );
  }, [students, search]);

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <p className="text-[13px] text-neutral-500">
        No enrolled students in this class for the selected term.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or admission no."
          className={cn(smartInputClass, 'pl-9')}
        />
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/50 p-1">
        {filtered.map((student) => {
          const checked = selectedIds.includes(student.studentId);
          const label = `${student.firstName} ${student.lastName}`;
          return (
            <li key={student.studentId}>
              <label
                className={cn(
                  'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors',
                  checked ? 'bg-brand-50 ring-1 ring-brand-200/60' : 'hover:bg-white',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(student.studentId)}
                  className="size-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-300"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-neutral-900">{label}</span>
                  <span className="ml-2 text-[11px] font-medium text-neutral-500">
                    {student.admissionNo}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-[13px] text-neutral-500">No matches.</li>
        ) : null}
      </ul>
      {selectedIds.length > 0 ? (
        <p className="text-[12px] font-medium text-neutral-500">
          {selectedIds.length} student{selectedIds.length === 1 ? '' : 's'} selected — parents of
          selected students will receive this message.
        </p>
      ) : null}
    </div>
  );
}
