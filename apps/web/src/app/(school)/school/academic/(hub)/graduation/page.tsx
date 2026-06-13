'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  useAcademicYears,
  useClassLevels,
  usePromotions,
  useStudents,
} from '@loomis/api-client';
import { Skeleton } from '@loomis/ui-web';
import { Award, GraduationCap, FileText } from 'lucide-react';

import { GraduationCertificatesPanel } from '@/components/academic/graduation-certificates-panel';
import { PromotionReviewTable } from '@/components/academic/promotion-review-table';
import { AcademicSectionHeader } from '@/components/academic/academic-empty-state';
import { pickActiveYear } from '@/lib/academic/academic-metrics';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC } from '@/lib/design/surfaces';
import { studentDisplayName } from '@/lib/student/student-labels';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

export default function AcademicGraduationPage() {
  const tenantId = useTenantId();
  const canGraduate = useCan('student.graduate');

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const years = yearsQuery.data?.academicYears ?? [];
  const activeYear = useMemo(() => pickActiveYear(years), [years]);

  const levelsQuery = useClassLevels(tenantId ?? '');
  const terminalLevels = (levelsQuery.data?.levels ?? []).filter((l) => l.isTerminal);

  const promotionsQuery = usePromotions(tenantId ?? '', activeYear?.id ?? '');
  const graduationRecords = (promotionsQuery.data?.records ?? []).filter(
    (p) => p.outcome === 'graduated',
  );

  const studentsQuery = useStudents(tenantId ?? '', { status: 'enrolled' });
  const enrolledCount = studentsQuery.data?.students.length ?? 0;
  const studentNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const student of studentsQuery.data?.students ?? []) {
      map[student.id] = studentDisplayName(student.firstName, student.lastName);
    }
    return map;
  }, [studentsQuery.data?.students]);

  const confirmedGraduates = graduationRecords.filter((r) => r.status === 'confirmed');

  if (!tenantId) {
    return <p className="text-sm text-red-600">No tenant context.</p>;
  }

  if (!canGraduate) {
    return <p className="text-sm text-neutral-500">You do not have permission to manage graduation.</p>;
  }

  const isLoading = yearsQuery.isLoading || levelsQuery.isLoading || promotionsQuery.isLoading;

  return (
    <div className="space-y-8">
      <header>
        <p className={ACADEMIC_UI.sectionLabel}>Final-year graduation</p>
        <h1 className={ACADEMIC_UI.pageTitle} style={ACADEMIC_PAGE_TITLE_STYLE}>
          Terminal cohort
        </h1>
        <p className={ACADEMIC_UI.pageDesc}>
          Confirm graduates at the terminal class level, generate leaving certificates, and preserve
          records permanently via the promotion workflow.
        </p>
      </header>

      <div className="card grid gap-0 divide-y divide-neutral-100 rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center gap-3.5 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <GraduationCap aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Terminal levels
            </p>
            <p className="mt-0.5 text-sm font-bold text-neutral-900">
              {isLoading ? '—' : terminalLevels.length === 0 ? 'None configured' : terminalLevels.map((l) => l.name).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Award aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Graduation records
            </p>
            <p className="mt-0.5 tabular-nums text-neutral-900" style={{ fontSize: '1.375rem', fontWeight: 800 }}>
              {isLoading ? '—' : graduationRecords.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <FileText aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
              Enrolled students
            </p>
            <p className="mt-0.5 tabular-nums text-neutral-900" style={{ fontSize: '1.375rem', fontWeight: 800 }}>
              {studentsQuery.isLoading ? '—' : enrolledCount}
            </p>
          </div>
        </div>
      </div>

      <div className={`card rounded-2xl p-5 ${SEMANTIC.warning.surfaceSubtle}`}>
        <p className="font-semibold text-neutral-900">Graduation workflow</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] text-neutral-600">
          <li>Ensure terminal class levels are configured in class structure.</li>
          <li>Admin Officer stages promotions marking terminal students as graduating.</li>
          <li>Principal reviews and confirms the list on the Promotions page.</li>
          <li>Leaving certificates are generated by the platform upon confirmation.</li>
        </ol>
        <Link href="/school/academic/promotions" className={`mt-4 inline-flex ${ACADEMIC_UI.btnPrimary}`}>
          Review promotion & graduation list
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <section className="space-y-3">
          <AcademicSectionHeader
            label="Cohort records"
            title="Graduation list"
            description="Terminal students appear here once staged with a graduated outcome in the promotion workflow."
          />
          <PromotionReviewTable
            records={graduationRecords}
            levels={levelsQuery.data?.levels ?? []}
            studentNames={studentNames}
            emptyMessage="No graduation records staged yet. Terminal students appear here once staged with a graduated outcome."
          />
        </section>
      )}

      {activeYear && confirmedGraduates.length > 0 ? (
        <section className="space-y-3">
          <AcademicSectionHeader
            label="Certificates"
            title="Leaving certificates"
            description="PDF certificates are issued automatically when promotions are confirmed. Download or regenerate if needed."
          />
          <GraduationCertificatesPanel
            tenantId={tenantId}
            academicYearId={activeYear.id}
            records={graduationRecords}
            studentNames={studentNames}
          />
        </section>
      ) : null}

      {graduationRecords.some((r) => r.status === 'proposed') ? (
        <p className="text-[13px] text-neutral-500">
          Records awaiting confirmation are on the{' '}
          <Link href="/school/academic/promotions" className="font-semibold text-brand-700 hover:underline">
            Promotions
          </Link>{' '}
          page.
        </p>
      ) : null}
    </div>
  );
}
