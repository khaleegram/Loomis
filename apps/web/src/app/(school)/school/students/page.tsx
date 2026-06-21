'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useStudents } from '@loomis/api-client';
import { UserPlus, Users } from 'lucide-react';
import type { StudentStatus } from '@loomis/contracts';

import { CreateAdmissionSheet } from '@/components/student/create-admission-sheet';
import { StudentHero, StudentHeroSkeleton } from '@/components/student/student-hero';
import { StudentToolbar, type StudentStatusFilter } from '@/components/student/student-toolbar';
import { StudentDirectoryCards, StudentDirectoryCardsSkeleton } from '@/components/student/student-directory-cards';
import { StudentDirectoryTable, StudentDirectoryTableSkeleton } from '@/components/student/student-directory-table';
import { PageBody } from '@/components/school/school-shell';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { computeStudentMetrics } from '@/lib/student/student-labels';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

type ViewMode = 'cards' | 'table';

function getSavedViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'cards';
  try {
    const saved = localStorage.getItem('student_view_preference');
    if (saved === 'cards' || saved === 'table') return saved;
  } catch {}
  return 'cards';
}

function saveViewMode(mode: ViewMode) {
  try { localStorage.setItem('student_view_preference', mode); } catch {}
}

export default function StudentRegistryPage() {
  const tenantId = useTenantId();
  const canView = useCanAny(['student.promote', 'admissions.manage', 'admissions.approve']);
  const canManageAdmissions = useCan('admissions.manage');
  const canReviewAdmissions = useCan('admissions.approve');

  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(getSavedViewMode);

  const { data, isLoading, isError, error } = useStudents(tenantId ?? '');
  const students = data?.students ?? [];
  const metrics = useMemo(() => computeStudentMetrics(students), [students]);

  // Client-side filtering
  const filteredStudents = useMemo(() => {
    let rows = students;
    if (statusFilter !== 'all') rows = rows.filter((s) => s.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [students, statusFilter, search]);

  if (!tenantId) {
    return (
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">
        <p className="text-sm text-red-600 font-medium">No tenant context. Sign in again.</p>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">
        <p className="text-sm text-neutral-500">You do not have permission to view students.</p>
      </PageBody>
    );
  }

  return (
    <>
      <PageBody className="max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">
        <div className="space-y-8">
          {isLoading ? <StudentHeroSkeleton /> : <StudentHero metrics={metrics} />}

          <div className="flex flex-wrap items-center gap-3">
            {canManageAdmissions ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-colors duration-150 ${SEMANTIC.cta.primary}`}
              >
                <UserPlus size={16} />
                New Application
              </button>
            ) : canReviewAdmissions ? (
              <Link
                href="/school/students/admissions"
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-[14px] font-medium transition-colors duration-150 ${SEMANTIC.cta.primary}`}
              >
                <UserPlus size={16} />
                Review Admissions
              </Link>
            ) : null}
            <Link href="/school/students/admissions" className={ACADEMIC_UI.btnGhost}>
              Admissions pipeline
            </Link>
          </div>

        {/* 3. Error */}
        {isError ? (
          <div className={`rounded-xl border p-4 text-sm ${SEMANTIC.danger.surface}`}>
            {(error as Error).message ?? 'Failed to load students.'}
          </div>
        ) : null}

        {/* 4. Empty state — no students at all */}
        {!isLoading && !isError && students.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${SEMANTIC.cta.iconCircle}`}>
              <UserPlus size={28} />
            </div>
            <h2 className="mb-2 text-lg font-medium text-neutral-800">No students yet</h2>
            <p className="mb-5 max-w-xs text-center text-sm text-neutral-500">
              Start by registering applicants in the admissions pipeline.
            </p>
            {canManageAdmissions ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors ${SEMANTIC.cta.primary}`}
              >
                <UserPlus size={16} />
                Register first applicant
              </button>
            ) : canReviewAdmissions ? (
              <p className="max-w-md text-center text-xs text-neutral-500">
                New applicants are registered by the Admin Officer. You can review and approve
                applications on the admissions pipeline.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 5. Directory */}
        {!isLoading && !isError && students.length > 0 ? (
          <div className="space-y-4">
            <StudentToolbar
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              viewMode={viewMode}
              onViewModeChange={(m) => { setViewMode(m); saveViewMode(m); }}
              filteredCount={filteredStudents.length}
              totalCount={students.length}
            />

            {/* No results */}
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center py-20">
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${SEMANTIC.cta.iconCircle}`}>
                  <Users size={28} />
                </div>
                <h2 className="mb-2 text-lg font-medium text-neutral-800">No students found</h2>
                <p className="mb-5 max-w-xs text-center text-sm text-neutral-500">
                  No students match your current filters. Try adjusting your search or clearing active filters.
                </p>
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); }}
                  className={ACADEMIC_UI.btnSecondarySm}
                >
                  Clear filters
                </button>
              </div>
            ) : null}

            {/* Results */}
            {filteredStudents.length > 0 ? (
              viewMode === 'table' ? (
                <StudentDirectoryTable students={filteredStudents} totalCount={students.length} />
              ) : (
                <StudentDirectoryCards students={filteredStudents} totalCount={students.length} />
              )
            ) : null}
          </div>
        ) : null}

        {/* 6. Loading */}
        {isLoading ? (
          <div className="space-y-4">
            <StudentDirectoryTableSkeleton />
          </div>
        ) : null}
      </div>
    </PageBody>

      {canManageAdmissions && tenantId ? (
        <CreateAdmissionSheet
          tenantId={tenantId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      ) : null}
    </>
  );
}
