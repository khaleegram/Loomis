'use client';

import type { AdmissionResponse, ClassLevelResponse } from '@loomis/contracts';
import { Button, Skeleton } from '@loomis/ui-web';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { SURFACES } from '@/lib/design/surfaces';
import { AdmissionStatusBadge } from '@/components/student/admission-status-badge';
import type { KpiFilter } from '@/components/student/admissions-kpi-cards';
import {
  computeAgeYears,
  formatCalendarDate,
  relationshipLabel,
  studentDisplayName,
} from '@/lib/student/student-labels';

type AdmissionStatusFilter = 'all' | AdmissionResponse['status'];

interface AdmissionsTableProps {
  admissions: AdmissionResponse[];
  classLevels: ClassLevelResponse[];
  kpiFilter: KpiFilter | null;
  canDecide: boolean;
  onDecide: (admission: AdmissionResponse) => void;
}

function classLevelName(levels: ClassLevelResponse[], id: string): string {
  return levels.find((l) => l.id === id)?.name ?? '—';
}

function applyKpiFilter(
  rows: AdmissionResponse[],
  kpiFilter: KpiFilter | null,
): AdmissionResponse[] {
  if (!kpiFilter) return rows;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  switch (kpiFilter) {
    case 'pending':
      return rows.filter((a) => a.status === 'pending');
    case 'approved_week':
      return rows.filter(
        (a) =>
          a.status === 'approved' &&
          a.decidedAt &&
          new Date(a.decidedAt) >= weekAgo,
      );
    case 'declined':
      return rows.filter((a) => a.status === 'declined');
    default:
      return rows;
  }
}

const FILTER_CHIPS: { key: AdmissionStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' },
  { key: 'withdrawn', label: 'Withdrawn' },
];

interface AdmissionsToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: AdmissionStatusFilter;
  onStatusFilterChange: (v: AdmissionStatusFilter) => void;
  filteredCount: number;
  totalCount: number;
}

function AdmissionsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  filteredCount,
  totalCount,
}: AdmissionsToolbarProps) {
  const hasActiveFilter = statusFilter !== 'all' || search.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, ref #, or guardian…"
          aria-label="Search admissions"
          className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-4 text-[13px] placeholder:text-neutral-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 lg:w-64"
        />
        {hasActiveFilter ? (
          <span className="hidden text-[11px] tabular-nums text-neutral-400 sm:inline">
            <span className="font-semibold text-neutral-600">{filteredCount}</span>
            <span className="mx-0.5">/</span>
            <span>{totalCount}</span>
          </span>
        ) : null}
      </div>

      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1">
        {FILTER_CHIPS.map((chip) => {
          const isActive = statusFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onStatusFilterChange(chip.key)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-semibold transition-all duration-200 sm:py-1.5 ${
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
    </div>
  );
}

export function AdmissionsTable({
  admissions,
  classLevels,
  kpiFilter,
  canDecide,
  onDecide,
}: AdmissionsTableProps) {
  const [statusFilter, setStatusFilter] = useState<AdmissionStatusFilter>('all');
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    let rows = applyKpiFilter(admissions, kpiFilter);
    if (statusFilter !== 'all') {
      rows = rows.filter((a) => a.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (a) =>
          a.referenceNumber.toLowerCase().includes(q) ||
          studentDisplayName(a.firstName, a.lastName).toLowerCase().includes(q) ||
          a.guardianName.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [admissions, kpiFilter, search, statusFilter]);

  return (
    <div className="space-y-4">
      <AdmissionsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filteredCount={filteredData.length}
        totalCount={admissions.length}
      />

      <div className="overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div className="overflow-x-auto">
        {/* Header — warm brand gradient */}
        <div
          className="flex min-w-[720px] items-center gap-3 px-5 py-3"
          style={{ background: SURFACES.tableHeader }}
        >
          <div className="flex w-8 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80">
            Applicant
          </div>
          <div className="hidden w-28 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 sm:block">
            Class
          </div>
          <div className="hidden w-32 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 md:block">
            Guardian
          </div>
          <div className="hidden w-24 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 lg:block">
            Submitted
          </div>
          <div className="w-28 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80">
            Status
          </div>
          <div className="w-28 shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80">
            Actions
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-16">
            <p className="text-[13px] font-medium text-neutral-400">No applications match your filters.</p>
            <p className="text-[12px] text-neutral-300">Try adjusting the status filter or search term.</p>
          </div>
        ) : (
          <div>
            {filteredData.map((admission, i) => {
              const isOdd = i % 2 === 1;
              const name = studentDisplayName(admission.firstName, admission.lastName);
              const age = computeAgeYears(admission.dateOfBirth);

              return (
                <div
                  key={admission.id}
                  className={`group flex min-w-[720px] items-center gap-3 px-5 py-3.5 transition-all duration-150 ${
                    isOdd ? 'bg-brand-50/20' : 'bg-white'
                  } hover:bg-brand-50/50`}
                >
                  {/* Avatar */}
                  <div className="size-8 shrink-0 overflow-hidden rounded-full shadow-sm transition-transform duration-200 group-hover:scale-105">
                    <ProfileAvatar alt={name} />
                  </div>

                  {/* Applicant info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-neutral-900">
                      {name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span className="font-mono text-gold-600">{admission.referenceNumber}</span>
                      <span className="text-neutral-200">·</span>
                      <span>{formatCalendarDate(admission.dateOfBirth)}</span>
                      <span className="text-neutral-200">·</span>
                      <span>{age} yrs</span>
                    </div>
                  </div>

                  {/* Class */}
                  <div className="hidden w-28 shrink-0 sm:block">
                    <span className="text-[12px] text-neutral-500">
                      {classLevelName(classLevels, admission.intendedClassLevelId)}
                    </span>
                  </div>

                  {/* Guardian */}
                  <div className="hidden w-32 shrink-0 md:block">
                    <p className="truncate text-[12px] text-neutral-700">{admission.guardianName}</p>
                    <p className="text-[11px] text-neutral-400">
                      {relationshipLabel(admission.guardianRelationship)}
                    </p>
                  </div>

                  {/* Submitted */}
                  <div className="hidden w-24 shrink-0 lg:block">
                    <span className="text-[12px] tabular-nums text-neutral-500">
                      {formatCalendarDate(admission.createdAt.slice(0, 10))}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="w-28 shrink-0">
                    <AdmissionStatusBadge status={admission.status} />
                  </div>

                  {/* Actions */}
                  <div className="w-28 shrink-0 text-right">
                    {admission.status === 'pending' && canDecide ? (
                      <button
                        onClick={() => onDecide(admission)}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-brand-200/80 bg-brand-50/50 px-3 py-2 text-[12px] font-semibold text-brand-700 transition-all duration-200 hover:bg-brand-600 hover:text-white hover:border-brand-600 hover:shadow-sm sm:min-h-0 sm:min-w-0 sm:py-1"
                      >
                        Review
                      </button>
                    ) : admission.status === 'approved' && admission.studentId ? (
                      <Link
                        href={`/school/students/${admission.studentId}`}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-brand-200/80 bg-brand-50/50 px-3 py-2 text-[12px] font-semibold text-brand-700 transition-all duration-200 hover:bg-brand-600 hover:text-white hover:border-brand-600 hover:shadow-sm sm:min-h-0 sm:min-w-0 sm:py-1"
                      >
                        View
                      </Link>
                    ) : admission.status === 'declined' && admission.declineReason ? (
                      <span
                        className="block max-w-[8rem] truncate text-[11px] text-neutral-400"
                        title={admission.declineReason}
                      >
                        {admission.declineReason}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Footer — subtle count */}
        <div className="border-t border-brand-50 bg-brand-50/10 px-5 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">
              Showing{' '}
              <span className="font-semibold tabular-nums text-neutral-600">{filteredData.length}</span>
              {filteredData.length !== admissions.length ? (
                <>
                  {' '}of{' '}
                  <span className="font-semibold tabular-nums text-neutral-600">{admissions.length}</span>
                </>
              ) : null}
              {' '}application{filteredData.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdmissionsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-neutral-100" />
      <div className="overflow-hidden rounded-2xl border border-brand-100/40 bg-white shadow-sm">
        <div
          className="h-11"
          style={{ background: SURFACES.tableHeader }}
        />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-5 py-3.5 ${i % 2 === 1 ? 'bg-brand-50/20' : 'bg-white'}`}
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="hidden h-4 w-20 sm:block" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="hidden h-4 w-16 lg:block" />
            <Skeleton className="h-5 w-20 shrink-0" />
            <Skeleton className="h-7 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
