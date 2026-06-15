'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGradebookEntries, usePublishResults, useStepUpMfa } from '@loomis/api-client';
import { publishResultsRequest, type PublishResultsRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Skeleton,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ClipboardList, Lock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AcademicScopePicker } from '@/components/academic/ops/academic-scope-picker';
import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';
import {
  FormSubmitError,
  SmartFormPanel,
  SmartFormPanelHeader,
  SmartFormSection,
} from '@/components/shared/smart-form';
import { PageBody } from '@/components/school/school-shell';
import { ACADEMIC_PAGE_TITLE_STYLE, ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { EXAMS_PAGE_CLASS } from '@/lib/academic/exams-ui';
import {
  classArmOptions,
  useAcademicOpsContext,
} from '@/lib/academic/use-academic-ops-context';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const publishFormSchema = publishResultsRequest.extend({
  mfaCode: z.string().length(6, 'Enter your 6-digit authenticator code'),
  irreversibleAcknowledged: z.boolean().refine((v) => v, {
    message: 'You must acknowledge that published results cannot be unpublished.',
  }),
});

type PublishFormValues = z.infer<typeof publishFormSchema>;

export default function PublishResultsPage() {
  const tenantId = useTenantId();
  const router = useRouter();
  const canPublish = useCan('result.publish');
  const ctx = useAcademicOpsContext(tenantId ?? '');
  const stepUp = useStepUpMfa();
  const mfaCodeRef = useRef('');

  const arms = classArmOptions(ctx.arms, ctx.levels);
  const classLabel = arms.find((arm) => arm.id === ctx.classArmId)?.label ?? null;

  const gradebookFilters =
    ctx.termId && ctx.classArmId
      ? { termId: ctx.termId, classArmId: ctx.classArmId }
      : null;
  const entriesQuery = useGradebookEntries(tenantId ?? '', gradebookFilters);
  const entries = entriesQuery.data?.entries ?? [];

  const preflight = useMemo(() => {
    const pending = entries.filter((e) => e.status === 'correction_pending').length;
    const drafts = entries.filter((e) => e.status === 'draft').length;
    return {
      total: entries.length,
      pending,
      drafts,
      ready: entries.length > 0 && pending === 0,
    };
  }, [entries]);

  const form = useForm<PublishFormValues>({
    resolver: zodResolver(publishFormSchema),
    defaultValues: {
      termId: ctx.termId ?? '',
      classArmId: ctx.classArmId ?? '',
      mfaCode: '',
      irreversibleAcknowledged: false,
    },
  });

  useEffect(() => {
    if (ctx.termId) form.setValue('termId', ctx.termId);
    if (ctx.classArmId) form.setValue('classArmId', ctx.classArmId);
  }, [ctx.termId, ctx.classArmId, form]);

  const ensureStepUpToken = useCallback(async () => {
    const code = mfaCodeRef.current;
    if (!code || code.length !== 6) {
      throw new Error('Enter your authenticator code before publishing.');
    }
    return stepUp.mutateAsync({ action: 'result_publish', code });
  }, [stepUp]);

  const publish = usePublishResults({
    tenantId: tenantId ?? '',
    termId: ctx.termId ?? '',
    classArmId: ctx.classArmId ?? '',
    ensureStepUpToken,
  });

  const mfaCode = form.watch('mfaCode');
  useEffect(() => {
    mfaCodeRef.current = mfaCode;
  }, [mfaCode]);

  if (!tenantId) {
    return (
      <PageBody className={EXAMS_PAGE_CLASS}>
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!canPublish) {
    return (
      <PageBody className={EXAMS_PAGE_CLASS}>
        <Alert>
          <AlertDescription>You do not have permission to publish results.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const body: PublishResultsRequest = {
      termId: values.termId,
      classArmId: values.classArmId,
    };
    try {
      await publish.mutateFinancialAsync(body);
      router.push('/school/exams');
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  });

  return (
    <PageBody className={EXAMS_PAGE_CLASS}>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={ACADEMIC_UI.sectionLabel}>Exam Officer · irreversible action</p>
            <h1 className="text-neutral-900" style={ACADEMIC_PAGE_TITLE_STYLE}>
              Publish results
            </h1>
            <p className={ACADEMIC_UI.pageDesc}>
              Make final term results visible to students and parents. Requires step-up MFA — cannot be undone.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/school/exams" className={ACADEMIC_UI.btnSecondary}>
              Back to exams
            </Link>
            <Link href="/school/gradebook" className={ACADEMIC_UI.btnSecondary}>
              Gradebook
            </Link>
          </div>
        </header>

        <AcademicScopePicker
          classArmOptions={arms}
          classArmId={ctx.classArmId}
          onClassArmChange={ctx.setClassArmId}
          selectedClassMeta={
            ctx.classArmId && !entriesQuery.isLoading
              ? `${preflight.total} gradebook entries · ${classLabel ?? 'Class'}`
              : undefined
          }
        />

        {!ctx.termId || !ctx.classArmId ? (
          <div className={`${ACADEMIC_UI.dataPanel} p-10 text-center`}>
            <p className="text-[15px] font-semibold text-neutral-800">Select a class</p>
            <p className="mt-2 text-[13px] text-neutral-500">
              Choose your class above to run the publish pre-flight checklist.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            <SmartFormPanel
              header={
                <SmartFormPanelHeader
                  icon={preflight.ready ? CheckCircle2 : Lock}
                  title="Pre-flight checklist"
                  subtitle="All entries must be submitted with no pending corrections."
                  badge={
                    preflight.ready ? (
                      <span className="rounded-full bg-accent-green-50 px-2.5 py-0.5 text-[11px] font-bold text-accent-green-700">
                        Ready
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        Blocked
                      </span>
                    )
                  }
                />
              }
            >
              {entriesQuery.isLoading ? (
                <Skeleton className="h-24 w-full rounded-xl" />
              ) : (
                <ul className="space-y-2 text-[13px]">
                  <li className={preflight.total > 0 ? 'text-accent-green-700' : 'text-destructive'}>
                    {preflight.total > 0
                      ? `${preflight.total} gradebook entries found`
                      : 'No gradebook entries — cannot publish'}
                  </li>
                  <li className={preflight.pending === 0 ? 'text-accent-green-700' : 'text-destructive'}>
                    {preflight.pending === 0
                      ? 'No pending grade corrections'
                      : `${preflight.pending} correction(s) still pending`}
                  </li>
                  {preflight.drafts > 0 ? (
                    <li className="text-amber-700">{preflight.drafts} entries still in draft status</li>
                  ) : null}
                </ul>
              )}
            </SmartFormPanel>

            <SmartFormPanel
              header={
                <SmartFormPanelHeader
                  icon={ClipboardList}
                  title="Confirm publication"
                  subtitle="Published results become immediately visible. Further changes require the grade correction workflow."
                />
              }
              footer={
                <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
                  <Link href="/school/exams" className={`${ACADEMIC_UI.btnSecondary} justify-center`}>
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    form="publish-results-form"
                    className={ACADEMIC_UI.btnPrimary}
                    disabled={
                      !preflight.ready || publish.isSubmitting || !form.watch('irreversibleAcknowledged')
                    }
                  >
                    {publish.isSubmitting ? 'Publishing…' : 'Publish results'}
                  </button>
                </div>
              }
            >
              <Form {...form}>
                <form id="publish-results-form" onSubmit={onSubmit} className="space-y-5">
                  <FormSubmitError message={form.formState.errors.root?.message ?? null} />

                  <SmartFormSection title="Acknowledgement">
                    <FormField
                      control={form.control}
                      name="irreversibleAcknowledged"
                      render={({ field }) => (
                        <FormItem className="flex items-start gap-2 space-y-0 rounded-xl border border-neutral-200 bg-neutral-50/50 px-3 py-3">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                          </FormControl>
                          <FormLabel className="font-normal leading-relaxed text-[13px] text-neutral-700">
                            I understand that publishing is irreversible and results become immediately visible to
                            students and parents.
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </SmartFormSection>

                  <SmartFormSection title="Step-up verification">
                    <StepUpMfaFields control={form.control} name="mfaCode" />
                  </SmartFormSection>
                </form>
              </Form>
            </SmartFormPanel>
          </div>
        )}
      </div>
    </PageBody>
  );
}
