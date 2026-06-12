'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStaffDirectory } from '@loomis/api-client';
import { UserPlus, Users } from 'lucide-react';

import { StaffHero, StaffHeroSkeleton } from '@/components/staff/staff-hero';
import { StaffToolbar } from '@/components/staff/staff-search-filter';
import { StaffDirectoryCards, StaffDirectoryCardsSkeleton } from '@/components/staff/staff-directory-cards';
import { StaffDirectoryTable, StaffDirectoryTableSkeleton } from '@/components/staff/staff-directory-table';
import { StaffVacantRolesBanner } from '@/components/staff/staff-vacant-roles-banner';
import { PageBody } from '@/components/school/school-shell';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { computeStaffMetrics, computeVacantSingletonRoles } from '@/lib/staff/staff-labels';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

type ViewMode = 'cards' | 'table';
type StaffStatusFilter = 'all' | 'active' | 'pending' | 'deactivated';

function getSavedViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'cards';
  try {
    const saved = localStorage.getItem('staff_view_preference');
    if (saved === 'cards' || saved === 'table') return saved;
  } catch {}
  return 'cards';
}

function saveViewMode(mode: ViewMode) {
  try { localStorage.setItem('staff_view_preference', mode); } catch {}
}

export default function StaffDirectoryPage() {
  const tenantId = useTenantId();
  const canOnboard = useCan('staff.onboard');
  const canManage = useCanAny([
    'staff.onboard', 'staff.role.assign', 'staff.deactivate', 'subject.assign', 'classteacher.assign',
  ]);

  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(getSavedViewMode);

  const { data, isLoading, isError, error, refetch } = useStaffDirectory(tenantId ?? '');
  const staff = data?.staff ?? [];
  const metrics = useMemo(() => computeStaffMetrics(staff), [staff]);
  const vacantSingletonRoles = useMemo(() => computeVacantSingletonRoles(staff), [staff]);

  // Client-side filtering
  const filteredStaff = useMemo(() => {
    let rows = staff;
    if (statusFilter !== 'all') rows = rows.filter((m) => m.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.primaryRole?.toLowerCase().includes(q) ?? false),
      );
    }
    return rows;
  }, [staff, statusFilter, search]);

  const staffNames = useMemo(() => staff.map((s) => s.fullName), [staff]);

  if (!tenantId) {
    return (
      <PageBody className="max-w-[1400px] px-6 py-6 lg:px-12 lg:py-8">
        <p className="text-sm text-red-600 font-medium">No tenant context. Sign in again.</p>
      </PageBody>
    );
  }

  if (!canOnboard) {
    return (
      <PageBody className="max-w-[1400px] px-6 py-6 lg:px-12 lg:py-8">
        <p className="text-sm text-neutral-500">You do not have permission to view staff.</p>
      </PageBody>
    );
  }

  return (
    <PageBody className="max-w-[1400px] px-6 py-6 lg:px-12 lg:py-8">
      <div className="space-y-8">
        {/* 1. Hero */}
        {isLoading ? <StaffHeroSkeleton /> : <StaffHero metrics={metrics} />}

        {!isLoading && vacantSingletonRoles.length > 0 ? (
          <StaffVacantRolesBanner vacantRoles={vacantSingletonRoles} />
        ) : null}

        {/* 2. Invite CTA — right under the hero */}
        {canOnboard && !isLoading && staff.length > 0 ? (
          <div className="mb-6">
            <Link
              href="/school/staff/add"
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-colors duration-150 ${SEMANTIC.cta.primary}`}
            >
              <UserPlus size={16} />
              Add Staff Member
            </Link>
          </div>
        ) : null}

        {/* 3. Error */}
        {isError ? (
          <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
            {(error as Error).message ?? 'Failed to load staff directory.'}
          </div>
        ) : null}

        {/* 4. Empty state — no staff at all */}
        {!isLoading && !isError && staff.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${SEMANTIC.cta.iconCircle}`}>
              <UserPlus size={28} />
            </div>
            <h2 className="mb-2 text-lg font-medium text-neutral-800">No staff yet</h2>
            <p className="mb-5 max-w-xs text-center text-sm text-neutral-500">
              Add your first staff member to get started.
            </p>
            {canOnboard ? (
              <Link
                href="/school/staff/add"
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors ${SEMANTIC.cta.primary}`}
              >
                <UserPlus size={16} />
                Add staff member
              </Link>
            ) : null}
          </div>
        ) : null}

        {/* 5. Directory */}
        {!isLoading && !isError && staff.length > 0 ? (
          <div className="space-y-4">
            <StaffToolbar
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              viewMode={viewMode}
              onViewModeChange={(m) => { setViewMode(m); saveViewMode(m); }}
              filteredCount={filteredStaff.length}
              totalCount={staff.length}
            />

            {/* No results */}
            {filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center py-20">
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${SEMANTIC.cta.iconCircle}`}>
                  <Users size={28} />
                </div>
                <h2 className="mb-2 text-lg font-medium text-neutral-800">No staff found</h2>
                <p className="mb-5 max-w-xs text-center text-sm text-neutral-500">
                  No staff match your current filters. Try adjusting your search or clearing active filters.
                </p>
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); }}
                  className="h-9 rounded-lg border border-neutral-200 px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  Clear filters
                </button>
              </div>
            ) : null}

            {/* Results */}
            {filteredStaff.length > 0 ? (
              viewMode === 'table' ? (
                <StaffDirectoryTable staff={filteredStaff} canManage={canManage} totalCount={staff.length} onRefresh={refetch} />
              ) : (
                <StaffDirectoryCards staff={filteredStaff} canManage={canManage} totalCount={staff.length} onRefresh={refetch} />
              )
            ) : null}
          </div>
        ) : null}

        {/* 7. Loading */}
        {isLoading ? (
          <div className="space-y-4">
            <StaffDirectoryTableSkeleton />
          </div>
        ) : null}
      </div>
    </PageBody>
  );
}
