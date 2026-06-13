'use client';

import type { StudentResponse } from '@loomis/contracts';
import type { ComponentProps, ReactNode } from 'react';
import { Badge, Button, Skeleton } from '@loomis/ui-web';

import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { StudentStatusBadge } from '@/components/student/student-status-badge';
import { SEMANTIC, SURFACES } from '@/lib/design/surfaces';
import {
  computeAgeYears,
  formatCalendarDate,
  genderLabel,
  studentDisplayName,
} from '@/lib/student/student-labels';

interface StudentProfileHeaderProps {
  student: StudentResponse;
  currentClassLabel?: string | null;
  actions?: ReactNode;
}

export function StudentProfileHeader({
  student,
  currentClassLabel,
  actions,
}: StudentProfileHeaderProps) {
  const name = studentDisplayName(student.firstName, student.lastName);
  const age = computeAgeYears(student.dateOfBirth);

  return (
    <div className="card overflow-hidden rounded-2xl">
      {/* Hero header section with warm cream/brand gradient */}
      <div
        className="border-b border-brand-100/40 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        style={{ background: SURFACES.profileHeader }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between lg:gap-6">
          {/* Left: Avatar + Info */}
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Premium avatar */}
            <div className="size-16 shrink-0 overflow-hidden rounded-2xl shadow-lg">
              <ProfileAvatar
                photoStorageObjectId={student.photoStorageObjectId}
                alt={name}
                rounded="2xl"
              />
            </div>

            {/* Name and metadata */}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Student Profile
              </p>
              <h2
                className="mt-1 text-neutral-900"
                style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 }}
              >
                {name}
              </h2>
              <p className="mt-1 font-mono text-[13px] text-gold-600">
                {student.admissionNo}
              </p>

              {/* Badge row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StudentStatusBadge status={student.status} />
                {currentClassLabel ? (
                  <Badge variant="outline" className="border-brand-100 bg-brand-50 text-brand-700">
                    {currentClassLabel}
                  </Badge>
                ) : null}
                {student.identityAttestationType ? (
                  <Badge variant="secondary" className={SEMANTIC.success.badge}>
                    Identity verified
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          {actions ? (
            <div className="flex w-full shrink-0 flex-wrap gap-2 lg:w-auto">
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      {/* Meta details row */}
      <dl className="grid grid-cols-1 gap-4 bg-white px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="group rounded-xl bg-brand-50/20 p-3 transition-colors hover:bg-brand-50/40">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Date of Birth
          </dt>
          <dd className="mt-1 text-[13px] font-semibold text-neutral-900">
            {formatCalendarDate(student.dateOfBirth)}
            <span className="ml-1 text-[12px] font-normal text-neutral-400">({age} yrs)</span>
          </dd>
        </div>
        <div className="group rounded-xl bg-brand-50/20 p-3 transition-colors hover:bg-brand-50/40">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Gender
          </dt>
          <dd className="mt-1 text-[13px] font-semibold text-neutral-900">
            {genderLabel(student.gender)}
          </dd>
        </div>
        <div className="group rounded-xl bg-brand-50/20 p-3 transition-colors hover:bg-brand-50/40">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Identity Attestation
          </dt>
          <dd className="mt-1 text-[13px] font-semibold text-neutral-900">
            {student.identityAttestationType ? 'On file' : 'Not recorded'}
          </dd>
        </div>
        <div className="group rounded-xl bg-brand-50/20 p-3 transition-colors hover:bg-brand-50/40">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Registered
          </dt>
          <dd className="mt-1 text-[13px] font-semibold text-neutral-900">
            {formatCalendarDate(student.createdAt.slice(0, 10))}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function StudentProfileHeaderSkeleton() {
  return (
    <div className="card overflow-hidden rounded-2xl">
      <div className="px-6 py-6 sm:px-8" style={{ background: SURFACES.profileFooter }}>
        <div className="flex items-start gap-5">
          <Skeleton className="size-16 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 px-6 py-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function StudentProfileActionButton(props: ComponentProps<typeof Button>) {
  return <Button size="sm" {...props} />;
}
