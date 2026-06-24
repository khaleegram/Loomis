'use client';

import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Zap } from 'lucide-react';
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
} from '@loomis/ui-web';
import { useActivateTenant, useStepUpMfa, useUpdateTenantProfile } from '@loomis/api-client';
import type { TenantResponse } from '@loomis/contracts';
import { z } from 'zod';

import { StepUpMfaFields } from '@/components/academic/step-up-mfa-fields';

const activateFormSchema = z.object({
  mfaCode: z.string().length(6, 'Enter your 6-digit authenticator code'),
});

const goLiveFormSchema = z.object({
  goLiveDate: z.string().min(1, 'Go-live date is required'),
});

type ActivateFormValues = z.infer<typeof activateFormSchema>;
type GoLiveFormValues = z.infer<typeof goLiveFormSchema>;

function formatGoLiveDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function goLiveDateToIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

interface TenantGoLiveCardProps {
  tenant: TenantResponse;
}

export function TenantGoLiveCard({ tenant }: TenantGoLiveCardProps) {
  const [showActivate, setShowActivate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const mfaCodeRef = useRef('');
  const stepUp = useStepUpMfa();
  const updateProfile = useUpdateTenantProfile(tenant.id);

  const isAwaitingGoLive =
    tenant.status === 'provisioning' && new Date(tenant.goLiveAt).getTime() > Date.now();

  const ensureStepUpToken = useCallback(
    async (action: import('@loomis/contracts').StepUpAction) => {
      const code = mfaCodeRef.current;
      if (!code || code.length !== 6) {
        throw new Error('Enter your 6-digit authenticator code.');
      }
      return stepUp.mutateAsync({ action, code });
    },
    [stepUp],
  );

  const activate = useActivateTenant({ tenantId: tenant.id, ensureStepUpToken });

  const activateForm = useForm<ActivateFormValues>({
    resolver: zodResolver(activateFormSchema),
    defaultValues: { mfaCode: '' },
  });

  const goLiveForm = useForm<GoLiveFormValues>({
    resolver: zodResolver(goLiveFormSchema),
    defaultValues: { goLiveDate: tenant.goLiveAt.slice(0, 10) },
  });

  async function onActivate(values: ActivateFormValues) {
    mfaCodeRef.current = values.mfaCode;
    try {
      await activate.mutateFinancialAsync({});
      activateForm.reset();
      activate.regenerateIdempotencyKey();
      setShowActivate(false);
    } catch {
      activateForm.setError('root', { message: 'Activation failed. Try again.' });
    }
  }

  async function onSaveGoLive(values: GoLiveFormValues) {
    const goLiveAt = goLiveDateToIso(values.goLiveDate);
    if (goLiveAt === tenant.goLiveAt) {
      setShowEdit(false);
      return;
    }
    try {
      await updateProfile.mutateAsync({ goLiveAt });
      setShowEdit(false);
    } catch (error) {
      goLiveForm.setError('root', {
        message: error instanceof Error ? error.message : 'Update failed',
      });
    }
  }

  return (
    <div className="card overflow-hidden rounded-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Calendar aria-hidden className="size-4" />
          </span>
          <div>
            <p className="text-[12px] font-bold text-neutral-900">Go-live schedule</p>
            <p className="text-[11px] text-neutral-400">
              {tenant.status === 'active' && tenant.activatedAt
                ? `Activated ${formatGoLiveDate(tenant.activatedAt)}`
                : isAwaitingGoLive
                  ? 'School logins blocked until date'
                  : 'Access window'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {!showEdit ? (
            <button
              type="button"
              onClick={() => {
                goLiveForm.reset({ goLiveDate: tenant.goLiveAt.slice(0, 10) });
                setShowEdit(true);
                setShowActivate(false);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 transition hover:bg-neutral-50"
            >
              Edit date
            </button>
          ) : null}
          {isAwaitingGoLive && !showActivate ? (
            <button
              type="button"
              onClick={() => {
                setShowActivate(true);
                setShowEdit(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#c9a96e] px-3 py-1.5 text-[11px] font-bold text-neutral-900 transition hover:bg-[#b89555]"
            >
              <Zap aria-hidden className="size-3.5" />
              Activate now
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
            Scheduled go-live
          </p>
          <p className="mt-1.5 text-[1.25rem] font-extrabold tracking-tight text-neutral-900">
            {formatGoLiveDate(tenant.goLiveAt)}
          </p>
          <p className="mt-1 text-[12px] text-neutral-500">
            {isAwaitingGoLive
              ? 'Welcome email sent — owner cannot sign in until this date or early activation.'
              : tenant.status === 'provisioning'
                ? 'Go-live date reached — next login activates the school automatically.'
                : 'School is live for staff and owners.'}
          </p>
        </div>

        {showEdit ? (
          <Form {...goLiveForm}>
            <form onSubmit={goLiveForm.handleSubmit(onSaveGoLive)} className="space-y-3" noValidate>
              <FormField
                control={goLiveForm.control}
                name="goLiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New go-live date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="h-10 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {goLiveForm.formState.errors.root ? (
                <p className="text-[12px] text-red-600">{goLiveForm.formState.errors.root.message}</p>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Saving…' : 'Save date'}
                </Button>
              </div>
            </form>
          </Form>
        ) : null}

        {showActivate ? (
          <Form {...activateForm}>
            <form onSubmit={activateForm.handleSubmit(onActivate)} className="space-y-3" noValidate>
              <p className="text-[12px] text-neutral-600">
                Step-up MFA required to open {tenant.name} before the scheduled date.
              </p>
              <StepUpMfaFields control={activateForm.control} name="mfaCode" />
              {activateForm.formState.errors.root ? (
                <Alert variant="destructive">
                  <AlertDescription>{activateForm.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowActivate(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={activate.isSubmitting}>
                  {activate.isSubmitting ? 'Activating…' : 'Confirm activation'}
                </Button>
              </div>
            </form>
          </Form>
        ) : null}
      </div>
    </div>
  );
}
