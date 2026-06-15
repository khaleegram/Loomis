'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useAcademicYears,
  useCensusPreview,
  useLockCensus,
  useStepUpMfa,
} from '@loomis/api-client';
import { censusLockRequest, type CensusLockRequest } from '@loomis/contracts';
import { formatKobo } from '@loomis/core';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
  cn,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CensusLockHero } from '@/components/academic/census-lock-hero';
import { CensusLockStepper } from '@/components/academic/census-lock-stepper';
import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';
import { PageBody } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const WIZARD_STEPS = [
  'Review count',
  'Attest count',
  'MTC check',
  'PSF impact',
  'Confirm & lock',
] as const;

const pageClass = 'max-w-[1400px] px-4 py-5 sm:px-6 lg:px-12 lg:py-8';

const censusLockFormSchema = z.object({
  declaredBillableCount: z.number().int().nonnegative(),
  varianceReason: z.string().max(500).optional(),
  belowMtcAcknowledged: z.boolean(),
  mfaCode: z.string().length(6, 'Enter your 6-digit authenticator code'),
  immutableAcknowledged: z.boolean().refine((v) => v, {
    message: 'You must acknowledge this action is irreversible.',
  }),
  psfAcknowledged: z.boolean().refine((v) => v, {
    message: 'Confirm you understand PSF obligations will be created.',
  }),
});

type CensusLockFormValues = z.infer<typeof censusLockFormSchema>;

function CensusLockSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function CensusLockPage() {
  const tenantId = useTenantId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const termId = searchParams.get('termId') ?? '';
  const yearId = searchParams.get('yearId') ?? '';
  const canLock = useCan('census.lock');
  const [step, setStep] = useState(0);

  const yearsQuery = useAcademicYears(tenantId ?? '');
  const yearLabel = yearsQuery.data?.academicYears.find((year) => year.id === yearId)?.label ?? null;

  const preview = useCensusPreview(tenantId ?? '', termId);
  const stepUp = useStepUpMfa();
  const mfaCodeRef = useRef('');

  const form = useForm<CensusLockFormValues>({
    resolver: zodResolver(censusLockFormSchema),
    defaultValues: {
      declaredBillableCount: 0,
      varianceReason: '',
      belowMtcAcknowledged: false,
      mfaCode: '',
      immutableAcknowledged: false,
      psfAcknowledged: false,
    },
  });

  const ensureStepUpToken = useCallback(async () => {
    const code = mfaCodeRef.current;
    if (!code || code.length !== 6) {
      throw new Error('Enter your authenticator code on the final step.');
    }
    return stepUp.mutateAsync({ action: 'census_lock', code });
  }, [stepUp]);

  const lockCensus = useLockCensus({
    tenantId: tenantId ?? '',
    yearId,
    termId,
    ensureStepUpToken,
  });

  useEffect(() => {
    if (preview.data) {
      form.setValue('declaredBillableCount', preview.data.systemBillableCount);
    }
  }, [preview.data, form]);

  const systemCount = preview.data?.systemBillableCount ?? 0;
  const declaredCount = form.watch('declaredBillableCount');
  const mtc = preview.data?.minimumTermCommitment ?? null;
  const varianceTolerance = preview.data?.varianceTolerance ?? 0.02;

  const varianceExceeded = useMemo(() => {
    const denominator = systemCount === 0 ? 1 : systemCount;
    return Math.abs(declaredCount - systemCount) / denominator > varianceTolerance;
  }, [declaredCount, systemCount, varianceTolerance]);

  const belowMtc = mtc !== null && declaredCount < mtc;

  const psfTotalMinor = useMemo(() => {
    const rate = preview.data?.psfRateMinor;
    if (!rate) return null;
    return declaredCount * rate;
  }, [declaredCount, preview.data?.psfRateMinor]);

  const mfaCode = form.watch('mfaCode');
  useEffect(() => {
    mfaCodeRef.current = mfaCode;
  }, [mfaCode]);

  if (!canLock) {
    return (
      <PageBody className={pageClass}>
        <Alert>
          <AlertDescription>You do not have permission to lock the census.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!tenantId || !termId || !yearId) {
    return (
      <PageBody className={pageClass}>
        <Alert variant="destructive">
          <AlertDescription>Missing term context. Return to Academic sessions.</AlertDescription>
        </Alert>
        <Link href="/school/academic/sessions" className={`mt-4 inline-flex ${ACADEMIC_UI.btnSecondary}`}>
          Back to sessions
        </Link>
      </PageBody>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const body: CensusLockRequest = {
      declaredBillableCount: values.declaredBillableCount,
      belowMtcAcknowledged: values.belowMtcAcknowledged,
      ...(values.varianceReason && values.varianceReason.length >= 3
        ? { varianceReason: values.varianceReason }
        : {}),
    };
    try {
      await lockCensus.mutateFinancialAsync(body);
      router.push('/school/academic/sessions');
    } catch (err) {
      form.setError('root', { message: academicErrorMessage(err) });
    }
  });

  function goNext() {
    if (step === 1 && varianceExceeded && !form.getValues('varianceReason')?.trim()) {
      form.setError('varianceReason', {
        message: 'Document why the declared count differs from the system count.',
      });
      return;
    }
    if (step === 2 && belowMtc && !form.getValues('belowMtcAcknowledged')) {
      form.setError('belowMtcAcknowledged', {
        message: 'Acknowledge billing at the Minimum Term Commitment.',
      });
      return;
    }
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <PageBody className={pageClass}>
      <div className="space-y-6">
        <CensusLockHero
          termLabel={preview.data?.termName ?? null}
          yearLabel={yearLabel}
          systemCount={systemCount}
          declaredCount={step >= 1 ? declaredCount : null}
          minimumTermCommitment={mtc}
          psfRateMinor={preview.data?.psfRateMinor ?? null}
          psfTotalMinor={psfTotalMinor}
          varianceWarning={varianceExceeded && step >= 1}
          belowMtc={belowMtc && step >= 2}
          isLoading={preview.isLoading}
        />

        <CensusLockStepper steps={WIZARD_STEPS} currentStep={step} />

        <div className="mx-auto max-w-3xl space-y-6">
          {preview.isLoading ? <CensusLockSkeleton /> : null}

          {preview.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Census lock unavailable</AlertTitle>
              <AlertDescription>{academicErrorMessage(preview.error)}</AlertDescription>
            </Alert>
          ) : null}

          {preview.data?.psfRateMinor === null ? (
            <Alert variant="destructive">
              <AlertTitle>PSF rate not configured</AlertTitle>
              <AlertDescription>
                A non-zero PSF rate is required before census lock. Contact platform support.
              </AlertDescription>
            </Alert>
          ) : null}

          {preview.data ? (
            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-6">
                {step === 0 ? (
                  <div className={`${ACADEMIC_UI.dataPanel} overflow-hidden`}>
                    <div className="border-b border-brand-50/80 px-5 py-4 sm:px-6">
                      <p className={ACADEMIC_UI.sectionLabel}>Step 1</p>
                      <p className="mt-1 text-[14px] font-semibold text-neutral-900">
                        Billable enrollment breakdown
                      </p>
                      <p className="mt-1 text-[12px] text-neutral-500">
                        By class level — read-only system count
                      </p>
                    </div>
                    <div className="p-5 sm:p-6">
                      {preview.data.classLevelBreakdown.length === 0 ? (
                        <p className="text-[13px] text-neutral-500">
                          No billable enrollments recorded yet. The declared count may be zero.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-brand-100/40">
                          <table className="min-w-full text-left text-[13px]">
                            <thead className={ACADEMIC_UI.tableHeader}>
                              <tr>
                                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                                  Class level
                                </th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                                  Billable students
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.data.classLevelBreakdown.map((row) => (
                                <tr key={row.classLevelId} className="border-t border-brand-50/80">
                                  <td className="px-4 py-3">
                                    <span className="font-semibold text-neutral-900">{row.classLevelName}</span>
                                    <span className="ml-2 text-[11px] text-neutral-500">{row.classLevelCode}</span>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-800">
                                    {row.billableCount}
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

                {step === 1 ? (
                  <div className={`${ACADEMIC_UI.dataPanel} p-5 sm:p-6`}>
                    <p className={ACADEMIC_UI.sectionLabel}>Step 2</p>
                    <p className="mt-1 text-[14px] font-semibold text-neutral-900">Attest billable count</p>
                    <p className="mt-1 text-[12px] text-neutral-500">
                      Defaults to the system count ({systemCount}). Edit only if your attestation differs.
                    </p>

                    <div className="mt-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="declaredBillableCount"
                        render={({ field }) => (
                          <FormItem className="max-w-xs">
                            <FormLabel>Declared billable count</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                className="h-11"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {varianceExceeded ? (
                        <>
                          <div className={cn('rounded-xl border p-4', SEMANTIC.warning.surfaceSubtle)}>
                            <p className={cn('text-[13px] font-semibold', SEMANTIC.warning.title)}>
                              Variance beyond {Math.round(varianceTolerance * 100)}%
                            </p>
                            <p className={cn('mt-1 text-[12px]', SEMANTIC.warning.text)}>
                              Your declared count differs from the system count. A documented reason is required.
                            </p>
                          </div>
                          <FormField
                            control={form.control}
                            name="varianceReason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Variance reason</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Explain the discrepancy" className="h-11" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {step === 2 && belowMtc ? (
                  <div className={cn(`${ACADEMIC_UI.dataPanel} p-5 sm:p-6`, SEMANTIC.warning.surfaceSubtle)}>
                    <p className={ACADEMIC_UI.sectionLabel}>Step 3</p>
                    <p className="mt-1 text-[14px] font-semibold text-neutral-900">
                      Below Minimum Term Commitment
                    </p>
                    <p className="mt-1 text-[12px] text-neutral-500">
                      Declared {declaredCount} is below MTC {mtc}. Billing may apply at the MTC level per your
                      agreement.
                    </p>
                    <FormField
                      control={form.control}
                      name="belowMtcAcknowledged"
                      render={({ field }) => (
                        <FormItem className="mt-4 flex items-start gap-3 rounded-xl border border-gold-200/60 bg-white/80 p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(v) => field.onChange(v === true)}
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="font-normal text-[13px] leading-relaxed text-neutral-700">
                              I acknowledge the count is below the Minimum Term Commitment and understand the
                              billing implications.
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null}

                {step === 2 && !belowMtc ? (
                  <div className={`${ACADEMIC_UI.dataPanel} p-5 sm:p-6`}>
                    <p className={ACADEMIC_UI.sectionLabel}>Step 3</p>
                    <p className="mt-1 text-[14px] font-semibold text-neutral-900">MTC check passed</p>
                    <p className="mt-2 text-[13px] text-neutral-600">
                      Declared count meets or exceeds the Minimum Term Commitment. No additional acknowledgement
                      required.
                    </p>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className={cn(`${ACADEMIC_UI.dataPanel} p-5 sm:p-6`, SEMANTIC.warning.surfaceSubtle)}>
                    <p className={ACADEMIC_UI.sectionLabel}>Step 4</p>
                    <p className="mt-1 text-[14px] font-semibold text-neutral-900">PSF obligation preview</p>
                    <p className="mt-1 text-[12px] text-neutral-500">
                      Obligations are created by census lock — not by payment.
                    </p>
                    <dl className="mt-4 space-y-2 text-[13px]">
                      <div className="flex justify-between gap-4">
                        <dt className="text-neutral-500">Students attested</dt>
                        <dd className="font-bold tabular-nums text-neutral-900">{declaredCount}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-neutral-500">PSF rate per student</dt>
                        <dd className="font-semibold text-neutral-900">
                          {preview.data.psfRateMinor ? formatKobo(preview.data.psfRateMinor) : '—'}
                        </dd>
                      </div>
                      <div className="border-t border-gold-200/60 pt-3">
                        <div className="flex justify-between gap-4">
                          <dt className="font-semibold text-neutral-800">Total PSF exposure</dt>
                          <dd className="text-lg font-extrabold tabular-nums text-gold-700">
                            {psfTotalMinor !== null ? formatKobo(psfTotalMinor) : '—'}
                          </dd>
                        </div>
                      </div>
                    </dl>
                    <p className="mt-3 text-[11px] text-neutral-500">
                      Creates {declaredCount} immutable PSF obligation
                      {declaredCount === 1 ? '' : 's'} plus a digitally signed attestation record.
                    </p>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertTitle>Permanent census lock</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px]">
                          <li>This action cannot be undone.</li>
                          <li>PSF obligations are created now — not when fees are paid.</li>
                          <li>A signed attestation record will be stored permanently.</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <div className={`${ACADEMIC_UI.dataPanel} space-y-4 p-5 sm:p-6`}>
                      <p className={ACADEMIC_UI.sectionLabel}>Step 5</p>
                      <p className="mt-1 text-[14px] font-semibold text-neutral-900">Confirm & lock</p>

                      <FormField
                        control={form.control}
                        name="psfAcknowledged"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-3 rounded-xl border border-brand-100/60 bg-brand-50/30 p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value === true}
                                onCheckedChange={(v) => field.onChange(v === true)}
                              />
                            </FormControl>
                            <div>
                              <FormLabel className="font-normal text-[13px] leading-relaxed text-neutral-700">
                                I understand {declaredCount} PSF obligation
                                {declaredCount === 1 ? '' : 's'} will be created immediately.
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="immutableAcknowledged"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value === true}
                                onCheckedChange={(v) => field.onChange(v === true)}
                              />
                            </FormControl>
                            <div>
                              <FormLabel className="font-normal text-[13px] leading-relaxed text-neutral-700">
                                I attest this count is accurate and accept that census lock is irreversible.
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <StepUpMfaFields control={form.control} name="mfaCode" />
                    </div>
                  </div>
                ) : null}

                {form.formState.errors.root ? (
                  <Alert variant="destructive">
                    <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    disabled={step === 0}
                    onClick={goBack}
                    className={ACADEMIC_UI.btnSecondary}
                  >
                    Back
                  </button>
                  {step < WIZARD_STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={preview.data.psfRateMinor === null}
                      className={ACADEMIC_UI.btnPrimary}
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={lockCensus.isSubmitting || preview.data.psfRateMinor === null}
                      className={ACADEMIC_UI.btnPrimary}
                    >
                      {lockCensus.isSubmitting ? 'Locking census…' : 'Lock census'}
                    </button>
                  )}
                </div>
              </form>
            </Form>
          ) : null}
        </div>
      </div>
    </PageBody>
  );
}
