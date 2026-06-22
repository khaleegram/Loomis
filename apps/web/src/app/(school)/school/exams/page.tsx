'use client';

import {
  useCreateGradingScheme,
  useExamOpsStatus,
  useGradingSchemes,
  useWorkflowInbox,
} from '@loomis/api-client';
import { Alert, AlertDescription, Skeleton } from '@loomis/ui-web';
import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DeputyExamStatusBanner } from '@/components/academic/ops/deputy-exam-status-banner';
import { ExamsNav, EXAMS_NAV_ITEMS, type ExamsNavItem, type ExamsSection } from '@/components/academic/ops/exams-nav';
import { ExamsPageHeader } from '@/components/academic/ops/exams-page-header';
import { ExamsPublishPanel } from '@/components/academic/ops/exams-publish-panel';
import { GradeCorrectionReviewList } from '@/components/academic/ops/grade-correction-review-list';
import { GradingSchemeBuilder } from '@/components/academic/ops/grading-scheme-builder';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { EXAMS_PAGE_CLASS } from '@/lib/academic/exams-ui';
import { useCan, useCanAny } from '@/lib/auth/use-capability';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

function parseSection(
  param: string | null,
  pendingCorrections: number,
  canConfigure: boolean,
  canPublish: boolean,
): ExamsSection {
  if (param === 'corrections') return 'corrections';
  if (param === 'publish' && canPublish) return 'publish';
  if (param === 'schemes') return 'schemes';
  if (pendingCorrections > 0) return 'corrections';
  return canConfigure ? 'schemes' : canPublish ? 'publish' : 'corrections';
}

export default function SchoolExamsPage() {
  const tenantId = useTenantId();
  const { session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canConfigure = useCan('grading_scheme.configure');
  const canPublishExamRole = useCan('result.publish');
  const examOpsQuery = useExamOpsStatus(tenantId ?? '');
  const isPrincipal = session?.role === 'principal';
  const canEmergencyPublish =
    isPrincipal && Boolean(examOpsQuery.data?.emergencyEscalationActive);
  const canPublish = canPublishExamRole || canEmergencyPublish;
  const canView = useCanAny(['grading_scheme.configure', 'result.publish', 'gradebook.read']) || canEmergencyPublish;

  const schemesQuery = useGradingSchemes(tenantId ?? '');
  const inboxQuery = useWorkflowInbox(tenantId ?? '');
  const createScheme = useCreateGradingScheme(tenantId ?? '');

  const pendingCorrections = useMemo(() => {
    const items = inboxQuery.data?.items ?? [];
    return items.filter((item) => item.instance.workflowType === 'grade_correction').length;
  }, [inboxQuery.data]);

  const [builderError, setBuilderError] = useState<string | null>(null);
  const [section, setSection] = useState<ExamsSection>('schemes');
  const [creatingScheme, setCreatingScheme] = useState(false);

  const setSectionAndUrl = useCallback(
    (next: ExamsSection) => {
      setSection(next);
      router.replace(`/school/exams?section=${next}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    setSection(
      parseSection(searchParams.get('section'), pendingCorrections, canConfigure, canPublish),
    );
  }, [searchParams, pendingCorrections, canConfigure, canPublish]);

  const schemes = schemesQuery.data?.schemes ?? [];
  const defaultScheme = schemes.find((scheme) => scheme.isDefault) ?? schemes[0];

  const navItems: ExamsNavItem[] = [
    EXAMS_NAV_ITEMS.schemes,
    {
      ...EXAMS_NAV_ITEMS.corrections,
      badge: pendingCorrections > 0 ? pendingCorrections : undefined,
    },
    ...(canPublish ? [EXAMS_NAV_ITEMS.publish] : []),
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
        <ExamsPageHeader pendingCorrections={pendingCorrections} />

        <DeputyExamStatusBanner
          status={examOpsQuery.data}
          role={session?.role}
          isLoading={examOpsQuery.isLoading}
        />

        {!creatingScheme ? (
          <ExamsNav items={navItems} active={section} onChange={setSectionAndUrl} />
        ) : null}

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
              Back
            </button>
            <GradingSchemeBuilder
              isSubmitting={createScheme.isPending}
              errorMessage={builderError}
              onSubmit={async (values) => {
                setBuilderError(null);
                try {
                  await createScheme.mutateAsync({ ...values, isDefault: true });
                  setCreatingScheme(false);
                  setSectionAndUrl('schemes');
                } catch (err) {
                  setBuilderError(academicErrorMessage(err));
                }
              }}
            />
          </div>
        ) : null}

        {section === 'schemes' && !creatingScheme ? (
          <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
            {schemesQuery.isLoading ? (
              <div className="p-6">
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ) : schemesQuery.isError ? (
              <div className="p-6">
                <Alert variant="destructive">
                  <AlertDescription>{(schemesQuery.error as Error).message}</AlertDescription>
                </Alert>
              </div>
            ) : defaultScheme ? (
              <>
                <div className="border-b border-border/80 px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-800">
                    School grading scheme
                  </p>
                  <p className="mt-1 text-[17px] font-bold text-neutral-900">{defaultScheme.name}</p>
                  <p className="mt-1 text-[13px] text-neutral-600">
                    CA {defaultScheme.continuousAssessmentWeight}% · Exam {defaultScheme.examWeight}% · pass{' '}
                    {defaultScheme.passMark}% — applies to every class automatically.
                  </p>
                </div>
                {canConfigure ? (
                  <div className="px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      className={ACADEMIC_UI.btnSecondary}
                      onClick={() => setCreatingScheme(true)}
                    >
                      Replace scheme
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="p-8 text-center sm:p-12">
                <p className="text-[15px] font-semibold text-neutral-900">No grading scheme yet</p>
                <p className="mx-auto mt-2 max-w-md text-[13px] text-neutral-500">
                  Create one scheme for the whole school. Teachers can start entering scores immediately.
                </p>
                {canConfigure ? (
                  <button
                    type="button"
                    className={`${ACADEMIC_UI.btnPrimary} mt-5`}
                    onClick={() => setCreatingScheme(true)}
                  >
                    Set up grading
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {section === 'corrections' && !creatingScheme ? (
          <GradeCorrectionReviewList tenantId={tenantId} />
        ) : null}

        {section === 'publish' && canPublish && !creatingScheme ? (
          <ExamsPublishPanel tenantId={tenantId} emergencyPrincipal={canEmergencyPublish} />
        ) : null}
      </div>
    </PageBody>
  );
}
