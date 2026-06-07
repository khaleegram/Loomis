'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePublishResults, useStepUpMfa, useGradebookEntries } from '@loomis/api-client';
import { publishResultsRequest, type PublishResultsRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AcademicTermSelectors } from '@/components/academic/ops/academic-term-selectors';
import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
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
      <>
        <PageHeader title="Publish results" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>No tenant context. Sign in again.</AlertDescription>
          </Alert>
        </PageBody>
      </>
    );
  }

  if (!canPublish) {
    return (
      <>
        <PageHeader title="Publish results" />
        <PageBody>
          <Alert>
            <AlertDescription>You do not have permission to publish results.</AlertDescription>
          </Alert>
        </PageBody>
      </>
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
    <>
      <PageHeader
        title="Publish term results"
        description="Make final results visible to students and parents (US-ACA-004). Requires step-up MFA."
        actions={
          <Button variant="outline" asChild>
            <Link href="/school/exams">Back to exams</Link>
          </Button>
        }
      />
      <PageBody>
        <div className="mx-auto max-w-3xl space-y-6">
          <AcademicTermSelectors
            years={ctx.sortedYears}
            terms={ctx.terms}
            classArmOptions={classArmOptions(ctx.arms, ctx.levels)}
            yearId={ctx.yearId}
            termId={ctx.termId}
            classArmId={ctx.classArmId}
            onYearChange={(id) => {
              ctx.setYearId(id);
              ctx.setTermId(null);
            }}
            onTermChange={ctx.setTermId}
            onClassArmChange={ctx.setClassArmId}
          />

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Pre-flight checklist</CardTitle>
              <CardDescription>All gradebook entries must be complete with no pending corrections.</CardDescription>
            </CardHeader>
            <CardContent>
              {entriesQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <ul className="space-y-2 text-sm">
                  <li className={preflight.total > 0 ? 'text-brand-600 dark:text-mint-400' : 'text-destructive'}>
                    {preflight.total > 0
                      ? `${preflight.total} gradebook entries found`
                      : 'No gradebook entries — cannot publish'}
                  </li>
                  <li className={preflight.pending === 0 ? 'text-brand-600 dark:text-mint-400' : 'text-destructive'}>
                    {preflight.pending === 0
                      ? 'No pending grade corrections'
                      : `${preflight.pending} correction(s) still pending`}
                  </li>
                  {preflight.drafts > 0 ? (
                    <li className="text-warning">{preflight.drafts} entries still in draft status</li>
                  ) : null}
                </ul>
              )}
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Confirm publication</CardTitle>
                  <CardDescription>
                    Published results cannot be unpublished. Further changes require the grade correction workflow.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="irreversibleAcknowledged"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal leading-relaxed">
                          I understand that publishing is irreversible and results become immediately visible to
                          students and parents.
                        </FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <StepUpMfaFields control={form.control} name="mfaCode" />

                  {form.formState.errors.root ? (
                    <Alert variant="destructive">
                      <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/school/exams">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={!preflight.ready || publish.isSubmitting || !form.watch('irreversibleAcknowledged')}
                >
                  {publish.isSubmitting ? 'Publishing…' : 'Publish results'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </PageBody>
    </>
  );
}
