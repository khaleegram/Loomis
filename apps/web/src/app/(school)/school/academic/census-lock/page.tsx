'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
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
  Input,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@loomis/ui-web';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';
import { PageBody, PageHeader } from '@/components/school/school-shell';
import { academicErrorMessage } from '@/lib/academic/academic-errors';
import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

const WIZARD_STEPS = [
  'Review count',
  'Attest count',
  'MTC check',
  'PSF impact',
  'Confirm & lock',
] as const;

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

function KpiTile({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'warning' | 'brand';
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-gold/40 bg-gold/5 dark:bg-gold/10'
      : tone === 'brand'
        ? 'border-brand-600/30 bg-brand-600/5 dark:border-mint-500/30 dark:bg-mint-500/5'
        : 'border-border bg-card';
  return (
    <Card className={toneClass}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-serif text-2xl tabular-nums">{value}</CardTitle>
        {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
      </CardHeader>
    </Card>
  );
}

function CensusLockSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
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
      <>
        <PageHeader title="Lock enrollment census" />
        <PageBody>
          <p className="text-sm text-muted-foreground">You do not have permission to lock the census.</p>
        </PageBody>
      </>
    );
  }

  if (!tenantId || !termId || !yearId) {
    return (
      <>
        <PageHeader title="Lock enrollment census" />
        <PageBody>
          <Alert variant="destructive">
            <AlertDescription>Missing term context. Return to Academic sessions.</AlertDescription>
          </Alert>
          <Link href="/school/academic/sessions" className={`mt-4 inline-flex ${ACADEMIC_UI.btnSecondary}`}>
            Back to sessions
          </Link>
        </PageBody>
      </>
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
    <>
      <PageHeader
        title="Lock enrollment census"
        description={`${preview.data?.termName ?? 'Term'} — irreversible PSF attestation (US-ASM-003).`}
        actions={
          <Link href="/school/academic/sessions" className={ACADEMIC_UI.btnSecondary}>
            Back to sessions
          </Link>
        }
      />
      <PageBody>
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Wizard stepper */}
          <nav aria-label="Census lock progress">
            <ol className="flex flex-wrap gap-2">
              {WIZARD_STEPS.map((label, index) => (
                <li
                  key={label}
                  className={`rounded-sm border px-3 py-1 text-xs font-medium ${
                    index === step
                      ? 'border-gold bg-gold/10 text-foreground dark:border-gold'
                      : index < step
                        ? 'border-brand-600/40 bg-brand-600/5 text-muted-foreground dark:border-mint-500/40'
                        : 'border-border text-muted-foreground'
                  }`}
                >
                  {index + 1}. {label}
                </li>
              ))}
            </ol>
          </nav>

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
            <>
              {/* KPI tiles — Dashboard Lock influence */}
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiTile label="System count" value={systemCount} sub="Auto-populated billable enrollments" tone="brand" />
                <KpiTile
                  label="Declared count"
                  value={step >= 1 ? declaredCount : '—'}
                  sub="Your legal attestation"
                  tone={varianceExceeded && step >= 1 ? 'warning' : 'default'}
                />
                <KpiTile
                  label="Minimum Term Commitment"
                  value={mtc ?? 'Not set'}
                  sub={mtc === null ? 'Configured at onboarding' : 'Contractual floor'}
                  tone={belowMtc && step >= 2 ? 'warning' : 'default'}
                />
              </div>

              <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-6">
                  {step === 0 ? (
                    <Card className="shadow-card">
                      <CardHeader>
                        <CardTitle className="text-base">Billable enrollment breakdown</CardTitle>
                        <CardDescription>By class level — read-only system count</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {preview.data.classLevelBreakdown.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No billable enrollments recorded yet. The declared count may be zero.
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Class level</TableHead>
                                <TableHead className="text-right">Billable students</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {preview.data.classLevelBreakdown.map((row) => (
                                <TableRow key={row.classLevelId}>
                                  <TableCell>
                                    <span className="font-medium">{row.classLevelName}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {row.classLevelCode}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {row.billableCount}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </Card>
                  ) : null}

                  {step === 1 ? (
                    <Card className="shadow-card">
                      <CardHeader>
                        <CardTitle className="text-base">Attest billable count</CardTitle>
                        <CardDescription>
                          Defaults to the system count ({systemCount}). Edit only if your attestation
                          differs.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
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
                            <Alert variant="warning">
                              <AlertTitle>Variance beyond {Math.round(varianceTolerance * 100)}%</AlertTitle>
                              <AlertDescription>
                                Your declared count differs from the system count. A documented reason is
                                required.
                              </AlertDescription>
                            </Alert>
                            <FormField
                              control={form.control}
                              name="varianceReason"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Variance reason</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Explain the discrepancy" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}

                  {step === 2 && belowMtc ? (
                    <Card className="border-gold/40 shadow-card">
                      <CardHeader>
                        <CardTitle className="text-base">Below Minimum Term Commitment</CardTitle>
                        <CardDescription>
                          Declared {declaredCount} is below MTC {mtc}. Billing may apply at the MTC
                          level per your agreement.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="belowMtcAcknowledged"
                          render={({ field }) => (
                            <FormItem className="flex items-start gap-3 rounded-md border border-gold/30 p-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={(v) => field.onChange(v === true)}
                                />
                              </FormControl>
                              <div>
                                <FormLabel className="font-normal">
                                  I acknowledge the count is below the Minimum Term Commitment and
                                  understand the billing implications.
                                </FormLabel>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ) : null}

                  {step === 2 && !belowMtc ? (
                    <Alert>
                      <AlertDescription>
                        Declared count meets or exceeds the Minimum Term Commitment. No additional
                        acknowledgement required.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {step === 3 ? (
                    <Card className="border-gold/30 shadow-card">
                      <CardHeader>
                        <CardTitle className="text-base">PSF obligation preview</CardTitle>
                        <CardDescription>
                          Obligations are created by census lock — not by payment (financial integrity).
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <span className="text-muted-foreground">Students attested:</span>{' '}
                          <strong className="tabular-nums">{declaredCount}</strong>
                        </p>
                        <p>
                          <span className="text-muted-foreground">PSF rate per student:</span>{' '}
                          <strong>
                            {preview.data.psfRateMinor
                              ? formatKobo(preview.data.psfRateMinor)
                              : '—'}
                          </strong>
                        </p>
                        <Separator />
                        <p className="font-serif text-lg">
                          Total PSF exposure:{' '}
                          <span className="text-gold dark:text-gold">
                            {psfTotalMinor !== null ? formatKobo(psfTotalMinor) : '—'}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Creates {declaredCount} immutable PSF obligation
                          {declaredCount === 1 ? '' : 's'} plus a digitally signed attestation record.
                        </p>
                      </CardContent>
                    </Card>
                  ) : null}

                  {step === 4 ? (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertTitle>Permanent census lock</AlertTitle>
                        <AlertDescription>
                          <ul className="mt-2 list-disc space-y-1 pl-4">
                            <li>This action cannot be undone.</li>
                            <li>PSF obligations are created now — not when fees are paid.</li>
                            <li>A signed attestation record will be stored permanently.</li>
                          </ul>
                        </AlertDescription>
                      </Alert>

                      <FormField
                        control={form.control}
                        name="psfAcknowledged"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-3 rounded-md border border-border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value === true}
                                onCheckedChange={(v) => field.onChange(v === true)}
                              />
                            </FormControl>
                            <div>
                              <FormLabel className="font-normal">
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
                          <FormItem className="flex items-start gap-3 rounded-md border border-destructive/30 p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value === true}
                                onCheckedChange={(v) => field.onChange(v === true)}
                              />
                            </FormControl>
                            <div>
                              <FormLabel className="font-normal">
                                I attest this count is accurate and accept that census lock is
                                irreversible.
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <StepUpMfaFields control={form.control} name="mfaCode" />
                    </div>
                  ) : null}

                  {form.formState.errors.root ? (
                    <Alert variant="destructive">
                      <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex flex-wrap justify-between gap-2">
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
            </>
          ) : null}
        </div>
      </PageBody>
    </>
  );
}
