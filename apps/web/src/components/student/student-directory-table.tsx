'use client';

import type { StudentResponse } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';
import Link from 'next/link';

import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { StudentStatusBadge } from '@/components/student/student-status-badge';
import { SURFACES } from '@/lib/design/surfaces';
import {
  computeAgeYears,
  formatCalendarDate,
  genderLabel,
  studentDisplayName,
} from '@/lib/student/student-labels';

interface StudentDirectoryTableProps {
  students: StudentResponse[];
  totalCount?: number;
}

export function StudentDirectoryTable({
  students,
  totalCount,
}: StudentDirectoryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      {/* Header — warm brand gradient */}
      <div
        className="flex items-center gap-4 px-5 py-3"
        style={{ background: SURFACES.tableHeader }}
      >
        <div className="flex w-9 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80">
          Name
        </div>
        <div className="hidden w-28 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 sm:block">
          File #
        </div>
        <div className="hidden w-20 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 lg:block">
          Gender
        </div>
        <div className="hidden w-28 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 md:block">
          DOB
        </div>
        <div className="hidden w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 lg:block">
          Age
        </div>
        <div className="w-32 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80">
          Status
        </div>
        <div className="w-24 shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80">
          Actions
        </div>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-16">
          <p className="text-[13px] font-medium text-neutral-400">No students match your filters.</p>
          <p className="text-[12px] text-neutral-300">Try adjusting the status filter or search term.</p>
        </div>
      ) : (
        <div>
          {students.map((student, i) => {
            const isOdd = i % 2 === 1;
            const name = studentDisplayName(student.firstName, student.lastName);
            const age = computeAgeYears(student.dateOfBirth);

            return (
              <div
                key={student.id}
                className={`group flex items-center gap-4 px-5 py-3.5 transition-all duration-150 ${
                  isOdd ? 'bg-brand-50/20' : 'bg-white'
                } hover:bg-brand-50/50`}
              >
                {/* Avatar */}
                <div className="size-9 shrink-0 overflow-hidden rounded-full shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <ProfileAvatar
                    photoStorageObjectId={student.photoStorageObjectId}
                    alt={name}
                  />
                </div>

                {/* Name */}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/school/students/${student.id}`}
                    className="text-left text-[14px] font-semibold text-neutral-900 transition-colors group-hover:text-brand-700 hover:underline decoration-brand-400/30 underline-offset-2"
                  >
                    {name}
                  </Link>
                </div>

                {/* File # */}
                <div className="hidden w-28 shrink-0 sm:block">
                  <span className="font-mono text-[12px] text-gold-600">
                    {student.admissionNo}
                  </span>
                </div>

                {/* Gender */}
                <div className="hidden w-20 shrink-0 lg:block">
                  <span className="text-[12px] text-neutral-500">
                    {genderLabel(student.gender)}
                  </span>
                </div>

                {/* DOB */}
                <div className="hidden w-28 shrink-0 md:block">
                  <span className="text-[12px] tabular-nums text-neutral-500">
                    {formatCalendarDate(student.dateOfBirth)}
                  </span>
                </div>

                {/* Age */}
                <div className="hidden w-16 shrink-0 lg:block">
                  <span className="text-[12px] tabular-nums text-neutral-500">
                    {age} yrs
                  </span>
                </div>

                {/* Status */}
                <div className="w-32 shrink-0">
                  <StudentStatusBadge status={student.status} />
                </div>

                {/* Actions */}
                <div className="w-24 shrink-0 text-right">
                  <Link
                    href={`/school/students/${student.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-brand-200/80 bg-brand-50/50 px-3 py-1 text-[12px] font-semibold text-brand-700 transition-all duration-200 hover:bg-brand-600 hover:text-white hover:border-brand-600 hover:shadow-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer — subtle count */}
      <div className="border-t border-brand-50 bg-brand-50/10 px-5 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            Showing{' '}
            <span className="font-semibold tabular-nums text-neutral-600">{students.length}</span>
            {totalCount !== undefined && totalCount !== students.length ? (
              <>
                {' '}of{' '}
                <span className="font-semibold tabular-nums text-neutral-600">{totalCount}</span>
              </>
            ) : null}
            {' '}student{students.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export function StudentDirectoryTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div
        className="h-11"
        style={{ background: SURFACES.tableHeader }}
      />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 px-5 py-3.5 ${i % 2 === 1 ? 'bg-brand-50/20' : 'bg-white'}`}
        >
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="hidden h-4 w-20 sm:block" />
          <Skeleton className="hidden h-4 w-16 lg:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="hidden h-4 w-12 lg:block" />
          <Skeleton className="h-5 w-24 shrink-0" />
          <Skeleton className="h-7 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
