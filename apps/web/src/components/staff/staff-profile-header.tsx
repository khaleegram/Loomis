'use client';

import type { StaffDetailResponse } from '@loomis/contracts';
import type { ComponentProps, ReactNode } from 'react';
import { Badge, Button, Skeleton } from '@loomis/ui-web';
import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { formatRoleLabel } from '@/components/school/school-nav-config';
import { StaffRoleHoverSelect } from '@/components/staff/staff-role-hover-select';
import { StaffStatusBadge } from '@/components/staff/staff-status-badge';
import { SURFACES } from '@/lib/design/surfaces';
import { formatStaffJoinedDate } from '@/lib/staff/staff-labels';

interface StaffProfileHeaderProps {
  staff: StaffDetailResponse;
  actions?: ReactNode;
}

export function StaffProfileHeader({ staff, actions }: StaffProfileHeaderProps) {
  const extensions =
    staff.roleExtensions.length > 0
      ? staff.roleExtensions.map((r) => formatRoleLabel(r)).join(', ')
      : null;

  return (
    <div className="card overflow-hidden rounded-2xl">
      {/* Hero header section with warm cream/brand gradient */}
      <div
        className="border-b border-brand-100/40 px-6 py-6 sm:px-8"
        style={{ background: SURFACES.profileHeader }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          {/* Left: Avatar + Info */}
          <div className="flex items-start gap-5">
            {/* Premium avatar */}
            <div className="size-16 shrink-0 overflow-hidden rounded-2xl shadow-lg">
              <ProfileAvatar
                photoStorageObjectId={staff.photoStorageObjectId}
                alt={staff.fullName}
                rounded="2xl"
              />
            </div>

            {/* Name and metadata */}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                Staff Profile
              </p>
              <h2
                className="mt-1 text-neutral-900"
                style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 }}
              >
                {staff.fullName}
              </h2>
              <p className="mt-1 text-[13px] text-neutral-400">{staff.email}</p>

              {/* Badge row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StaffStatusBadge status={staff.status} />
                {staff.primaryRole ? (
                  <StaffRoleHoverSelect
                    staffProfileId={staff.id}
                    primaryRole={staff.primaryRole}
                    status={staff.status}
                  />
                ) : null}
                {extensions ? (
                  <Badge variant="secondary" className="bg-brand-50 text-brand-700">
                    +{extensions}
                  </Badge>
                ) : null}
                {staff.status === 'pending' && staff.pendingInvitation?.isExpired ? (
                  <Badge variant="destructive" className="text-[10px]">
                    Invitation expired
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          {actions ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      {/* Meta details row */}
      <dl className="grid gap-4 bg-white px-6 py-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div className="group rounded-xl bg-brand-50/20 p-3 transition-colors hover:bg-brand-50/40">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Primary Role
          </dt>
          <dd className="mt-1 text-[13px] font-semibold text-neutral-900">
            {formatRoleLabel(staff.primaryRole)}
          </dd>
        </div>
        <div className="group rounded-xl bg-brand-50/20 p-3 transition-colors hover:bg-brand-50/40">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Phone
          </dt>
          <dd className="mt-1 text-[13px] font-semibold text-neutral-900">
            {staff.phone ?? '—'}
          </dd>
        </div>
        <div className="group rounded-xl bg-brand-50/20 p-3 transition-colors hover:bg-brand-50/40">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Joined
          </dt>
          <dd className="mt-1 text-[13px] font-semibold text-neutral-900">
            {formatStaffJoinedDate(staff.joinedAt)}
          </dd>
        </div>
        <div className="group rounded-xl bg-brand-50/20 p-3 transition-colors hover:bg-brand-50/40">
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Assignments
          </dt>
          <dd className="mt-1 text-[13px] font-semibold text-neutral-900">
            {staff.subjectAssignments.length + staff.classTeacherAssignments.length} active
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function StaffProfileHeaderSkeleton() {
  return (
    <div className="card overflow-hidden rounded-2xl">
      <div className="px-6 py-6 sm:px-8" style={{ background: SURFACES.profileFooter }}>
        <div className="flex items-start gap-5">
          <Skeleton className="size-16 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
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

export function StaffProfileActionButton(props: ComponentProps<typeof Button>) {
  return <Button size="sm" {...props} />;
}
