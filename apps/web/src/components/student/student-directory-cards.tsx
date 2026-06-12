'use client';

import type { StudentResponse } from '@loomis/contracts';
import Link from 'next/link';

import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { StudentStatusBadge } from '@/components/student/student-status-badge';
import {
  computeAgeYears,
  studentDisplayName,
} from '@/lib/student/student-labels';

interface StudentDirectoryCardsProps {
  students: StudentResponse[];
  totalCount?: number;
  canViewDetail?: boolean;
}

const CARD_GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3 p-4 sm:grid-cols-[repeat(auto-fill,minmax(156px,1fr))] sm:gap-4 sm:p-5';

function StudentCard({ student }: { student: StudentResponse }) {
  const name = studentDisplayName(student.firstName, student.lastName);
  const age = computeAgeYears(student.dateOfBirth);

  return (
    <Link
      href={`/school/students/${student.id}`}
      className="card group flex min-h-[220px] flex-col overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        <ProfileAvatar
          photoStorageObjectId={student.photoStorageObjectId}
          alt={name}
          rounded="none"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-2 pb-2 pt-8">
          <StudentStatusBadge status={student.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center px-3 py-3 text-center">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-neutral-900 group-hover:text-brand-700">
          {name}
        </h3>
        <p className="mt-1 font-mono text-[10px] text-gold-600">{student.admissionNo}</p>
        <p className="mt-1 text-[10px] text-neutral-400">
          {age} yrs · {student.gender.charAt(0).toUpperCase() + student.gender.slice(1)}
        </p>
      </div>
    </Link>
  );
}

export function StudentDirectoryCards({
  students,
  totalCount,
}: StudentDirectoryCardsProps) {
  if (students.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div className={CARD_GRID}>
        {students.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
      <div className="border-t border-brand-50 bg-brand-50/10 px-5 py-2.5">
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
  );
}

export function StudentDirectoryCardsSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
      <div className={CARD_GRID}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="card flex min-h-[220px] flex-col overflow-hidden rounded-xl">
            <div className="aspect-[3/4] w-full animate-pulse bg-neutral-100" />
            <div className="flex flex-1 flex-col items-center gap-2 px-3 py-3">
              <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-16 animate-pulse rounded bg-neutral-50" />
              <div className="h-2.5 w-20 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
