'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, History } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CurrencyInput,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Separator,
  Skeleton,
  Textarea,
  cn,
} from '@loomis/ui-web';
import { requestPsfRateOverrideRequest } from '@loomis/contracts';
import { useRequestPsfRateOverride, usePsfRateHistory, useStepUpMfa } from '@loomis/api-client';
import { formatKobo } from '@loomis/core';

import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';

const overrideFormSchema = requestPsfRateOverrideRequest.extend({
  mfaCode: z.string().length(6, 'Enter your 6-digit authenticator code'),
});

type OverrideFormValues = z.infer<typeof overrideFormSchema>;

interface PsfRateCardProps {
  tenantId: string;
  tenantName: string;
  currentRateMinor: number | null;
}

export function PsfRateCard({ tenantId, tenantName, currentRateMinor }: PsfRateCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const mfaCodeRef = useRef('');
  const stepUp = useStepUpMfa();

  const { data: historyData, isLoading: historyLoading } = usePsfRateHistory(tenantId);

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

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-serif text-base">PSF Rate</CardTitle>
          {!showForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              Request change
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current rate display */}
        <div
          className={cn(
            'flex items-center gap-4 rounded-lg border p-4',
            'border-neutral-200 bg-neutral-50 dark:border-forest-800 dark:bg-forest-900',
          )}
        >
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Current rate · {tenantName}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-foreground">
              {currentRateMinor != null
                ? `${formatKobo(currentRateMinor)} / student`
                : 'Using tier default'}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Per term
          </Badge>
        </div>

        {/* Rate change request form */}
        {showForm ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-forest-800 dark:bg-forest-900">
            <p className="mb-4 text-sm font-semibold text-foreground">
              Request PSF rate override
            </p>
            <Alert variant="warning" className="mb-4">
              <AlertDescription className="text-xs">
                Rate change requires dual approval. A second platform actor must approve this
                request (CON-013). Step-up MFA is required.
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
                      <FormLabel>New rate (₦ per student per term)</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          valueKobo={field.value}
                          onChangeKobo={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>Rate of zero is permanently blocked.</FormDescription>
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
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormDescription>Applies from the next billing term only.</FormDescription>
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
                          placeholder="Reason for override request…"
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
                    {requestOverride.isSubmitting ? 'Submitting…' : 'Submit for approval'}
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
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <History aria-hidden className="size-3.5" />
            {showHistory ? 'Hide' : 'Show'} rate history
          </button>

          {showHistory ? (
            <div className="mt-3">
              {historyLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : snapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rate changes recorded.</p>
              ) : (
                <ol className="space-y-2">
                  {snapshots.map((snap, i) => (
                    <li key={snap.id} className="flex items-start gap-3">
                      {i < snapshots.length - 1 ? (
                        <ArrowRight
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        />
                      ) : (
                        <div className="mt-0.5 size-4 shrink-0 rounded-full bg-brand-600 dark:bg-mint-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium tabular-nums">
                          {formatKobo(snap.rateMinor)}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            / student / term
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(snap.createdAt), { addSuffix: true })}
                          {snap.reason ? ` · ${snap.reason}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}
        </div>

        <Separator />

        <p className="text-[11px] text-muted-foreground">
          CON-011: PSF obligations are immutable after creation. Rate changes only affect future
          billing terms.
        </p>
      </CardContent>
    </Card>
  );
}
