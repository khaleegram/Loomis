'use client';

import { useState } from 'react';
import type { StaffDirectoryEntryResponse } from '@loomis/contracts';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { StaffStatusBadge } from '@/components/staff/staff-status-badge';
import { ProfileAvatar } from '@/components/shared/profile-avatar';
import { StaffRoleHoverSelect } from '@/components/staff/staff-role-hover-select';
import { StaffQuickActionSheet } from '@/components/staff/staff-quick-action-sheet';
import { SEMANTIC } from '@/lib/design/surfaces';

interface StaffDirectoryCardsProps {
  staff: StaffDirectoryEntryResponse[];
  canManage: boolean;
  totalCount?: number;
  onRefresh?: () => void;
}

const CARD_GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3 p-4 sm:grid-cols-[repeat(auto-fill,minmax(156px,1fr))] sm:gap-4 sm:p-5';

function StaffCard({
  member,
  canManage,
  onOpenSheet,
  onRefresh,
}: {
  member: StaffDirectoryEntryResponse;
  canManage: boolean;
  onOpenSheet: (id: string) => void;
  onRefresh?: () => void;
}) {
  return (
    <article className="card group flex min-h-[220px] flex-col overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/school/staff/${member.id}`} className="flex flex-col">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
          <ProfileAvatar
            photoStorageObjectId={member.photoStorageObjectId}
            alt={member.fullName}
            rounded="none"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-2 pb-2 pt-8">
            <StaffStatusBadge status={member.status} />
          </div>
        </div>

        <div className="px-3 pt-3 text-center">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-neutral-900 group-hover:text-brand-700">
            {member.fullName}
          </h3>
        </div>
      </Link>

      <div className="flex flex-1 flex-col items-center px-3 pb-3 text-center">
        <StaffRoleHoverSelect
          staffProfileId={member.id}
          primaryRole={member.primaryRole}
          roleExtensions={member.roleExtensions}
          status={member.status}
          size="sm"
          onSuccess={onRefresh}
        />
        {member.status === 'pending' && member.pendingInvitation?.isExpired ? (
          <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${SEMANTIC.warning.pill}`}>
            Expired
          </span>
        ) : null}
      </div>

      {canManage ? (
        <div className="border-t border-neutral-100 px-2 py-2">
          <button
            type="button"
            onClick={() => onOpenSheet(member.id)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-brand-100 bg-brand-50/40 px-2 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-600 hover:text-white"
          >
            Quick actions
            <MoreHorizontal aria-hidden className="size-3" />
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function StaffDirectoryCards({
  staff,
  canManage,
  totalCount,
  onRefresh,
}: StaffDirectoryCardsProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleOpenSheet = (staffId: string) => {
    setSelectedStaffId(staffId);
    setSheetOpen(true);
  };

  if (staff.length === 0) return null;

  return (
    <>
      <div className="overflow-hidden hero-panel rounded-2xl">
        <div className={CARD_GRID}>
          {staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              canManage={canManage}
              onOpenSheet={handleOpenSheet}
              onRefresh={onRefresh}
            />
          ))}
        </div>
        <div className="border-t border-brand-50 bg-brand-50/10 px-5 py-2.5">
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
      <StaffQuickActionSheet
        staffProfileId={selectedStaffId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={onRefresh}
      />
    </>
  );
}

export function StaffDirectoryCardsSkeleton() {
  return (
    <div className="overflow-hidden hero-panel rounded-2xl">
      <div className={CARD_GRID}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="card flex min-h-[220px] flex-col overflow-hidden rounded-xl">
            <div className="aspect-[3/4] w-full animate-pulse bg-neutral-100" />
            <div className="flex flex-1 flex-col items-center gap-2 px-3 py-3">
              <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-16 animate-pulse rounded bg-neutral-50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
