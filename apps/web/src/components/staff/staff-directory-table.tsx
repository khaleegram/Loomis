'use client';

import { useState } from 'react';
import type { StaffDirectoryEntryResponse } from '@loomis/contracts';
import { Skeleton } from '@loomis/ui-web';

import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { StaffStatusBadge } from '@/components/staff/staff-status-badge';
import { SEMANTIC, SURFACES } from '@/lib/design/surfaces';
import { formatStaffExtensionLabels, formatStaffJoinedDate } from '@/lib/staff/staff-labels';
import { StaffRoleHoverSelect } from '@/components/staff/staff-role-hover-select';
import { StaffQuickActionSheet } from '@/components/staff/staff-quick-action-sheet';

export type StaffStatusFilter = 'all' | 'active' | 'pending' | 'deactivated';

interface StaffDirectoryTableProps {
  staff: StaffDirectoryEntryResponse[];
  canManage: boolean;
  totalCount?: number;
  onRefresh?: () => void;
}

export function StaffDirectoryTable({
  staff,
  canManage,
  totalCount,
  onRefresh,
}: StaffDirectoryTableProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Premium table card */}
      <div className="overflow-hidden hero-panel rounded-2xl">
        <div className="overflow-x-auto">
        {/* Header — warm brand gradient */}
        <div
          className="flex min-w-[640px] items-center gap-4 px-5 py-3"
          style={{ background: SURFACES.tableHeader }}
        >
          <div className="flex w-9 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80">
            Name
          </div>
          <div className="hidden w-36 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 sm:block">
            Role
          </div>
          <div className="hidden w-32 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 lg:block">
            Status
          </div>
          <div className="hidden w-28 shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80 sm:block">
            Joined
          </div>
          <div className="w-24 shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-brand-100/80">
            Actions
          </div>
        </div>

        {staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-16">
            <p className="text-[13px] font-medium text-neutral-400">No staff members match your filters.</p>
            <p className="text-[12px] text-neutral-300">Try adjusting the status filter or search term.</p>
          </div>
        ) : (
          <div>
            {staff.map((member, i) => {
              const isOdd = i % 2 === 1;
              const extensionLabels = formatStaffExtensionLabels(
                member.roleExtensions,
                member.primaryRole,
              );
              return (
                <div
                  key={member.id}
                  className={`group flex min-w-[640px] items-center gap-4 px-5 py-3.5 transition-all duration-150 ${
                    isOdd ? 'bg-brand-50/20' : 'bg-white'
                  } hover:bg-brand-50/50`}
                >
                  {/* Avatar */}
                  <div className="size-9 shrink-0 overflow-hidden rounded-full shadow-sm transition-transform duration-200 group-hover:scale-105">
                    <ProfileAvatar
                      photoStorageObjectId={member.photoStorageObjectId}
                      alt={member.fullName}
                    />
                  </div>

                  {/* Name + email */}
                  <div className="min-w-0 flex-1">
                    {canManage ? (
                      <button
                        onClick={() => {
                          setSelectedStaffId(member.id);
                          setSheetOpen(true);
                        }}
                        className="text-left text-[14px] font-semibold text-neutral-900 transition-colors group-hover:text-brand-700 hover:underline decoration-brand-400/30 underline-offset-2"
                      >
                        {member.fullName}
                      </button>
                    ) : (
                      <span className="text-[14px] font-semibold text-neutral-900">
                        {member.fullName}
                      </span>
                    )}
                    <div className="truncate text-xs text-neutral-400">{member.email}</div>
                  </div>

                  {/* Role */}
                  <div className="hidden w-36 shrink-0 sm:block">
                    <StaffRoleHoverSelect
                      staffProfileId={member.id}
                      primaryRole={member.primaryRole}
                      roleExtensions={member.roleExtensions}
                      status={member.status}
                      onSuccess={onRefresh}
                    />
                    {extensionLabels ? (
                      <span className="ml-1 text-[11px] text-neutral-400">+{extensionLabels}</span>
                    ) : null}
                  </div>

                  {/* Status */}
                  <div className="hidden w-32 shrink-0 items-center gap-2 lg:flex">
                    <StaffStatusBadge status={member.status} />
                    {member.status === 'pending' && member.pendingInvitation?.isExpired ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEMANTIC.warning.pillMuted}`}>
                        Expired
                      </span>
                    ) : null}
                  </div>

                  {/* Joined */}
                  <div className="hidden w-28 shrink-0 text-right sm:block">
                    <span className="text-[13px] tabular-nums text-neutral-500">
                      {member.joinedAt ? formatStaffJoinedDate(member.joinedAt) : '—'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="w-24 shrink-0 text-right">
                    {canManage ? (
                      <button
                        onClick={() => {
                          setSelectedStaffId(member.id);
                          setSheetOpen(true);
                        }}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-brand-200/80 bg-brand-50/50 px-3 py-2 text-[12px] font-semibold text-brand-700 transition-all duration-200 hover:bg-brand-600 hover:text-white hover:border-brand-600 hover:shadow-sm sm:min-h-0 sm:min-w-0 sm:py-1"
                      >
                        Manage
                      </button>
                    ) : (
                      <span className="text-[12px] text-neutral-300">—</span>
                    )}
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
              <span className="font-semibold tabular-nums text-neutral-600">{staff.length}</span>
              {totalCount !== undefined && totalCount !== staff.length ? (
                <>
                  {' '}of{' '}
                  <span className="font-semibold tabular-nums text-neutral-600">{totalCount}</span>
                </>
              ) : null}
              {' '}staff member{staff.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Slide-over Drawer */}
      <StaffQuickActionSheet
        staffProfileId={selectedStaffId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={onRefresh}
      />
    </>
  );
}

export function StaffDirectoryTableSkeleton() {
  return (
    <div className="overflow-hidden hero-panel rounded-2xl">
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
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="hidden h-5 w-20 sm:block" />
          <Skeleton className="hidden h-5 w-16 lg:block" />
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="h-7 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}
