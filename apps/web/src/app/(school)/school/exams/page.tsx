'use client';

import {
  useCreateGradingScheme,
  useGradingSchemes,
  useWorkflowInbox,
} from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ExamsNav, EXAMS_NAV_ITEMS, type ExamsSection } from '@/components/academic/ops/exams-nav';
import { ExamsPageHeader } from '@/components/academic/ops/exams-page-header';
import { GradeCorrectionReviewList } from '@/components/academic/ops/grade-correction-review-list';
import { GradingSchemeBuilder } from '@/components/academic/ops/grading-scheme-builder';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { EXAMS_PAGE_CLASS } from '@/lib/academic/exams-ui';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function defaultSection(canConfigure: boolean): ExamsSection {
  return canConfigure ? 'schemes' : 'corrections';
}

function sectionSubtitle(section: ExamsSection, creatingScheme: boolean): string {
  if (creatingScheme) {
    return 'One school-wide scheme — applied to every class and subject automatically.';
  }
  switch (section) {
    case 'schemes':
      return 'The default scheme applies to all classes. Teachers use it in the gradebook immediately.';
    case 'corrections':
      return 'Approve, return, or reject proposed score changes before publishing.';
  }
}

export default function SchoolExamsPage() {
  const tenantId = useTenantId();
  const canConfigure = useCan('grading_scheme.configure');
  const canPublish = useCan('result.publish');
  const canView = useCanAny(['grading_scheme.configure', 'result.publish', 'gradebook.read']);

  const schemesQuery = useGradingSchemes(tenantId ?? '');
  const inboxQuery = useWorkflowInbox(tenantId ?? '');
  const createScheme = useCreateGradingScheme(tenantId ?? '');

  const [builderError, setBuilderError] = useState<string | null>(null);
  const [section, setSection] = useState<ExamsSection>(() => defaultSection(canConfigure));
  const [creatingScheme, setCreatingScheme] = useState(false);

  const schemes = schemesQuery.data?.schemes ?? [];
  const defaultScheme = schemes.find((scheme) => scheme.isDefault) ?? schemes[0];

  const pendingCorrections = useMemo(() => {
    const items = inboxQuery.data?.items ?? [];
    return items.filter((item) => item.instance.workflowType === 'grade_correction').length;
  }, [inboxQuery.data]);

  const navItems = [
    { ...EXAMS_NAV_ITEMS.schemes, show: true },
    {
      ...EXAMS_NAV_ITEMS.corrections,
      show: true,
      badge: pendingCorrections > 0 ? pendingCorrections : undefined,
    },
  ];

  if (!tenantId) {
    return (
      <PageBody className={EXAMS_PAGE_CLASS}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canView) {
    return (
      <PageBody className={EXAMS_PAGE_CLASS}>
        <Alert>
          <AlertDescription>You do not have permission to view exam operations.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  return (
    <PageBody className={EXAMS_PAGE_CLASS}>
      <div className="space-y-5">
        <ExamsPageHeader
          subtitle={sectionSubtitle(section, creatingScheme)}
          pendingCorrections={pendingCorrections}
          canPublish={canPublish}
        />

        {!creatingScheme ? (
          <div className="lg:hidden">
            <ExamsNav items={navItems} active={section} onChange={setSection} layout="tabs" />
          </div>
        ) : null}

        <div className={creatingScheme ? '' : 'grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]'}>
          {!creatingScheme ? (
            <aside className="hidden lg:block">
              <ExamsNav items={navItems} active={section} onChange={setSection} layout="sidebar" />
            </aside>
          ) : null}

          <main className="min-w-0">
            {creatingScheme && canConfigure ? (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingScheme(false);
                    setBuilderError(null);
                  }}
                  className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500 transition hover:text-brand-700"
                >
                  <ArrowLeft aria-hidden className="size-4" />
                  Back to schemes
                </button>
                <GradingSchemeBuilder
                  isSubmitting={createScheme.isPending}
                  errorMessage={builderError}
                  onSubmit={async (values) => {
                    setBuilderError(null);
                    try {
                      await createScheme.mutateAsync(values);
                      setCreatingScheme(false);
                      setSection('schemes');
                    } catch (err) {
                      setBuilderError(academicErrorMessage(err));
                    }
                  }}
                />
              </div>
            ) : null}

            {section === 'schemes' && !creatingScheme ? (
              <div className="space-y-4">
                {defaultScheme ? (
                  <div className="rounded-2xl border border-brand-100/50 bg-brand-50/30 px-4 py-3 sm:px-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-800">
                      School-wide default
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-neutral-900">{defaultScheme.name}</p>
                    <p className="mt-0.5 text-[12px] text-neutral-600">
                      CA {defaultScheme.continuousAssessmentWeight}% · Exam {defaultScheme.examWeight}% · pass{' '}
                      {defaultScheme.passMark}% — used for every class and subject this term.
                    </p>
                  </div>
                ) : null}

                <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-50/80 px-4 py-3 sm:px-5">
                    <p className="text-[13px] font-semibold text-neutral-800">All schemes</p>
                    {canConfigure ? (
                      <button
                        type="button"
                        className={ACADEMIC_UI.btnPrimary}
                        onClick={() => setCreatingScheme(true)}
                      >
                        New scheme
                      </button>
                    ) : null}
                  </div>

                  {schemesQuery.isLoading ? (
                    <div className="p-6">
                      <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                  ) : schemesQuery.isError ? (
                    <div className="p-6">
                      <Alert variant="destructive">
                        <AlertDescription>{(schemesQuery.error as Error).message}</AlertDescription>
                      </Alert>
                    </div>
                  ) : schemes.length === 0 ? (
                    <div className="p-8 text-center sm:p-12">
                      <p className="text-[15px] font-semibold text-neutral-900">No grading scheme yet</p>
                      <p className="mx-auto mt-2 max-w-md text-[13px] text-neutral-500">
                        Create one school-wide scheme. It will apply to every class automatically — no per-class
                        setup.
                      </p>
                      {canConfigure ? (
                        <button
                          type="button"
                          className={`${ACADEMIC_UI.btnPrimary} mt-5`}
                          onClick={() => setCreatingScheme(true)}
                        >
                          Create grading scheme
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-[13px]">
                        <thead className={ACADEMIC_UI.tableHeader}>
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                              Name
                            </th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                              CA / Exam
                            </th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                              Pass mark
                            </th>
                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                              Default
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {schemes.map((scheme) => (
                            <tr key={scheme.id} className="border-t border-brand-50/80">
                              <td className="px-4 py-3 font-semibold text-neutral-900">{scheme.name}</td>
                              <td className="px-4 py-3 font-mono tabular-nums text-neutral-700">
                                {scheme.continuousAssessmentWeight}% / {scheme.examWeight}%
                              </td>
                              <td className="px-4 py-3 font-mono tabular-nums text-neutral-700">
                                {scheme.passMark}%
                              </td>
                              <td className="px-4 py-3">
                                {scheme.isDefault ? (
                                  <span className="rounded-full bg-accent-green-50 px-2 py-0.5 text-[10px] font-bold text-accent-green-700">
                                    School default
                                  </span>
                                ) : (
                                  <span className="text-neutral-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {section === 'corrections' && !creatingScheme ? (
              <div className={`${ACADEMIC_UI.dataPanel} p-5 sm:p-6`}>
                <GradeCorrectionReviewList tenantId={tenantId} />
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </PageBody>
  );
}
