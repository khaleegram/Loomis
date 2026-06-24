'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layers, Percent } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@loomis/ui-web';
import {
  migrateProductTierRequest,
  type TenantResponse,
} from '@loomis/contracts';
import { useMigrateProductTier, usePlatformTiers, useStepUpMfa } from '@loomis/api-client';
import { z } from 'zod';

import { BRONZE } from '@/components/dashboard/dashboard-primitives';
import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';

const formSchema = migrateProductTierRequest.extend({
  mfaCode: z.string().length(6, 'Enter your 6-digit authenticator code'),
});

type FormValues = z.infer<typeof formSchema>;

interface TenantProductTierCardProps {
  tenant: TenantResponse;
}

export function TenantProductTierCard({ tenant }: TenantProductTierCardProps) {
  const [open, setOpen] = useState(false);
  const mfaCodeRef = useRef('');
  const stepUp = useStepUpMfa();
  const { data: tiersData } = usePlatformTiers();

  const migrate = useMigrateProductTier({
    tenantId: tenant.id,
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { tierCode: tenant.tierCode, reason: '', mfaCode: '' },
  });

  async function onSubmit(values: FormValues) {
    mfaCodeRef.current = values.mfaCode;
    try {
      await migrate.mutateFinancialAsync({
        tierCode: values.tierCode,
        reason: values.reason,
      });
      form.reset({ tierCode: values.tierCode, reason: '', mfaCode: '' });
      migrate.regenerateIdempotencyKey();
      setOpen(false);
    } catch {
      form.setError('root', { message: 'Tier migration failed. Try again.' });
    }
  }

  const tiers = (tiersData?.tiers ?? []).filter((tier) => tier.code !== tenant.tierCode);

  return (
    <div className="card overflow-hidden rounded-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: BRONZE.gradients.g3 }}
          >
            <Layers aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[12px] font-bold text-neutral-900">Commercial plan</p>
            <p className="text-[11px] text-neutral-400">Product tier · billing caps</p>
          </div>
        </div>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 transition hover:bg-neutral-50"
          >
            Migrate tier
          </button>
        ) : null}
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
            Current product tier
          </p>
          <p className="mt-1.5 text-[1.25rem] font-extrabold uppercase tracking-tight text-neutral-900">
            {tenant.tierCode}
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">
            Role UX tier ({tenant.experienceTier}) syncs on migration. PSF rate is unchanged — apply
            suggested rate separately if needed.
          </p>
        </div>
        {open ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="tierCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New product tier</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-[13px]"
                      >
                        <option value="">Select tier…</option>
                        {tiers.map((tier) => (
                          <option key={tier.id} value={tier.code}>
                            {tier.name} ({tier.code})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} className="resize-none rounded-lg" />
                    </FormControl>
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
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={migrate.isSubmitting}>
                  {migrate.isSubmitting ? 'Migrating…' : 'Confirm migration'}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <Percent aria-hidden className="size-3.5" />
            Distinct from the role experience tier card beside this panel.
          </div>
        )}
      </div>
    </div>
  );
}
