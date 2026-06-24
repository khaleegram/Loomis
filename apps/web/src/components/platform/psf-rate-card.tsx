'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock, History, Percent, TrendingUp } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  CurrencyInput,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Skeleton,
  cn,
} from '@loomis/ui-web';
import { requestPsfRateOverrideRequest } from '@loomis/contracts';
import {
  useApplyTenantPsfRate,
  useRequestPsfRateOverride,
  usePsfRateHistory,
  useStepUpMfa,
} from '@loomis/api-client';
import { formatKobo } from '@loomis/core';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';

const overrideFormSchema = requestPsfRateOverrideRequest.extend({
  mfaCode: z.string().length(6, 'Enter your 6-digit authenticator code'),
});

type OverrideFormValues = z.infer<typeof overrideFormSchema>;

interface PsfRateCardProps {
  tenantId: string;
  tenantName: string;
  currentRateMinor: number | null;
  suggestedRateMinor?: number | null;
}

const inputClass =
  'h-10 rounded-lg border-neutral-200 bg-white text-[13px] placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-1 focus:ring-neutral-200';

export function PsfRateCard({
  tenantId,
  tenantName,
  currentRateMinor,
  suggestedRateMinor = null,
}: PsfRateCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [applyMfaCode, setApplyMfaCode] = useState('');
  const mfaCodeRef = useRef('');
  const stepUp = useStepUpMfa();

  const { data: historyData, isLoading: historyLoading } = usePsfRateHistory(tenantId);

  const ensureStepUpToken = useCallback(
    async (action: import('@loomis/contracts').StepUpAction) => {
      const code = mfaCodeRef.current || applyMfaCode;
      if (!code || code.length !== 6) {
        throw new Error('Enter your 6-digit authenticator code.');
      }
      return stepUp.mutateAsync({ action, code });
    },
    [applyMfaCode, stepUp],
  );

  const applySuggested = useApplyTenantPsfRate({ tenantId, ensureStepUpToken });

  const requestOverride = useRequestPsfRateOverride({
    tenantId,
    ensureStepUpToken: useCallback(
      async (action) => {
        const code = mfaCodeRef.current;
        if (!code || code.length !== 6) {
          throw new Error('Enter your 6-digit authenticator code.');
        }
        return stepUp.mutateAsync({ action, code });
      },
      [stepUp],
    ),
  });

  const psfMismatch =
    suggestedRateMinor != null &&
    currentRateMinor != null &&
    suggestedRateMinor !== currentRateMinor;

  const form = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideFormSchema),
    defaultValues: {
      rateMinor: 0,
      effectiveFrom: '',
      justification: '',
      mfaCode: '',
    },
  });

  async function onSubmit(values: OverrideFormValues) {
    mfaCodeRef.current = values.mfaCode;
    try {
      await requestOverride.mutateFinancialAsync({
        rateMinor: values.rateMinor,
        effectiveFrom: new Date(values.effectiveFrom).toISOString(),
        justification: values.justification,
      });
      form.reset();
      requestOverride.regenerateIdempotencyKey();
      setShowForm(false);
    } catch {
      form.setError('root', {
        message: 'Failed to submit rate change request. Try again.',
      });
    }
  }

  const snapshots = historyData?.snapshots ?? [];
  const previousSnapshot = snapshots.length > 1 ? snapshots[1] : null;
  const rateIncreased = previousSnapshot && currentRateMinor != null
    ? currentRateMinor > previousSnapshot.rateMinor
    : null;

  return (
    <div className="card overflow-hidden rounded-2xl">
      {/* Header with rate badge */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: BRONZE.gradients.g1 }}
          >
            <Percent aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[12px] font-bold text-neutral-900">PSF Rate</p>
            <p className="text-[11px] text-neutral-400">Per-student fee &middot; {tenantName}</p>
          </div>
        </div>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
          >
            Request change
          </button>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        {/* Rate display - big numbers with context */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current rate */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
            <div className="flex items-center gap-1.5">
              <Clock aria-hidden className="size-3 text-neutral-400" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                Current rate
              </p>
            </div>
            <p className="mt-1.5 font-mono text-[1.625rem] font-extrabold tabular-nums tracking-tight text-neutral-900">
              {currentRateMinor != null ? formatKobo(currentRateMinor) : '\u2014'}
            </p>
            <p className="mt-0.5 text-[12px] font-semibold text-neutral-400">per student / term</p>
          </div>

          {/* Rate trend */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp aria-hidden className="size-3 text-neutral-400" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                Trend
              </p>
            </div>
            {rateIncreased != null ? (
              <>
                <p
                  className={cn(
                    'mt-1.5 text-[1.625rem] font-extrabold tracking-tight',
                    rateIncreased ? 'text-emerald-600' : 'text-red-500',
                  )}
                >
                  {rateIncreased ? '+' : ''}
                  {currentRateMinor != null && previousSnapshot
                    ? formatKobo(Math.abs(currentRateMinor - previousSnapshot.rateMinor))
                    : formatKobo(0)}
                </p>
                <p className="mt-0.5 text-[12px] font-semibold text-neutral-400">
                  {rateIncreased ? 'Increase' : 'Decrease'} since last change
                </p>
              </>
            ) : (
              <>
                <p className="mt-1.5 text-[1.625rem] font-extrabold tracking-tight text-neutral-400">
                  \u2014
                </p>
                <p className="mt-0.5 text-[12px] font-semibold text-neutral-400">No prior changes</p>
              </>
            )}
          </div>
        </div>

        {psfMismatch ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="text-[12px] font-bold text-amber-900">
              Suggested rate from school fees: {formatKobo(suggestedRateMinor!)}
            </p>
            <p className="mt-1 text-[11px] text-amber-800/80">
              Current rate differs. Apply the suggestion after reviewing fee structures.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor={`apply-mfa-${tenantId}`} className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900/70">
                  Authenticator code
                </label>
                <Input
                  id={`apply-mfa-${tenantId}`}
                  inputMode="numeric"
                  maxLength={6}
                  value={applyMfaCode}
                  onChange={(event) => {
                    setApplyMfaCode(event.target.value);
                    mfaCodeRef.current = event.target.value;
                  }}
                  className="mt-1 h-10 rounded-lg border-amber-200 bg-white text-[13px]"
                  placeholder="000000"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={applySuggested.isSubmitting || applyMfaCode.length !== 6}
                className="min-h-[44px] bg-[#c9a96e] text-neutral-900 hover:bg-[#b89555]"
                onClick={() => {
                  mfaCodeRef.current = applyMfaCode;
                  void applySuggested
                    .mutateFinancialAsync({ useSuggested: true })
                    .then(() => {
                      setApplyMfaCode('');
                      mfaCodeRef.current = '';
                      applySuggested.regenerateIdempotencyKey();
                    })
                    .catch(() => undefined);
                }}
              >
                {applySuggested.isSubmitting ? 'Applying…' : 'Apply suggested rate'}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Rate change request form */}
        {showForm ? (
          <div className="rounded-xl border border-brand-600/20 bg-brand-50/30 p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className="flex size-7 items-center justify-center rounded-lg text-white"
                style={{ background: BRONZE.gradients.g1 }}
              >
                <Percent aria-hidden className="size-3.5" />
              </span>
              <p className="text-[13px] font-bold text-neutral-900">
                Request PSF rate override
              </p>
            </div>
            <Alert variant="warning" className="mb-4">
              <AlertDescription className="text-xs">
                Dual approval required (CON-013). Step-up MFA is mandatory.
              </AlertDescription>
            </Alert>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="rateMinor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New rate (per student per term)</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          className="rounded-lg border-neutral-200 shadow-none"
                          valueKobo={field.value}
                          onChangeKobo={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>Zero is permanently blocked (CON-011).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective from</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          className={inputClass}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormDescription>Next billing term only.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="justification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Justification</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-[72px] resize-none rounded-lg border-neutral-200 bg-white text-[13px] placeholder:text-neutral-400 focus:border-neutral-300 focus:ring-1 focus:ring-neutral-200"
                          placeholder="Reason for override..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <StepUpMfaFields control={form.control} name="mfaCode" />

                {form.formState.errors.root ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {form.formState.errors.root.message}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      form.reset();
                      setShowForm(false);
                    }}
                    disabled={requestOverride.isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={requestOverride.isSubmitting}
                  >
                    {requestOverride.isSubmitting ? 'Submitting\u2026' : 'Submit for approval'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        ) : null}

        {/* Rate history */}
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 transition hover:text-neutral-800"
          >
            <History aria-hidden className="size-3.5" />
            {showHistory ? 'Hide' : 'Show'} rate history
            <span className="rounded-full bg-neutral-100 px-1.5 py-px text-[10px] text-neutral-400">
              {snapshots.length}
            </span>
          </button>

          {showHistory ? (
            <div className="mt-3">
              {historyLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : snapshots.length === 0 ? (
                <p className="text-[12px] text-neutral-400">No rate changes yet.</p>
              ) : (
                <ol className="space-y-1.5">
                  {snapshots.map((snap, i) => (
                    <li
                      key={snap.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-neutral-50"
                    >
                      <span
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full',
                          i === 0
                            ? 'bg-black text-white'
                            : 'border border-neutral-200 bg-white text-neutral-400',
                        )}
                      >
                        {i === 0 ? (
                          <span className="text-[10px] font-bold">{'\u25CF'}</span>
                        ) : (
                          <ArrowRight aria-hidden className="size-2.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold tabular-nums text-neutral-900">
                          {formatKobo(snap.rateMinor)}
                          <span className="ml-1.5 text-[11px] font-semibold text-neutral-400">
                            / student
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                          {formatDistanceToNow(new Date(snap.createdAt), { addSuffix: true })}
                          {snap.reason ? ' \u00b7 ' + snap.reason : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-neutral-400">
            <span className="font-bold text-neutral-500">CON-011</span>{' '}
            PSF obligations are immutable after creation. Rate changes only affect future
            billing terms.
          </p>
        </div>
      </div>
    </div>
  );
}
