'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateStaff, useStaffDirectory } from '@loomis/api-client';
import { createStaffRequest, type CreateStaffRequest } from '@loomis/contracts';
import { Alert, AlertDescription, Button, Form, FormControl, FormField, FormItem, FormMessage, Input } from '@loomis/ui-web';
import { Check, ClipboardList, ShieldCheck } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { ACADEMIC_UI } from '@/lib/academic/academic-ui';
import { staffFormInputClass } from '@/components/staff/staff-primary-role-select';
import { splitFinanceStaffStatus } from '@/lib/finance/split-finance-status';
import { SEMANTIC } from '@/lib/design/surfaces';
import { useTenantId } from '@/lib/tenant/use-tenant-id';

type FinanceInviteRole = 'cashier' | 'accountant';

const ROLE_META: Record<
  FinanceInviteRole,
  { title: string; description: string; icon: typeof ClipboardList; home: string }
> = {
  cashier: {
    title: 'Cashier',
    description: 'Logs payments and initiates refunds. Cannot verify their own entries.',
    icon: ClipboardList,
    home: '/school/finance/payments/log',
  },
  accountant: {
    title: 'Accountant',
    description: 'Verifies payments, configures fees, and views balances and PSF.',
    icon: ShieldCheck,
    home: '/school/finance/payments/verify',
  },
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
      {children}
    </p>
  );
}

interface SplitFinanceSetupWizardProps {
  onComplete?: () => void;
}

export function SplitFinanceSetupWizard({ onComplete }: SplitFinanceSetupWizardProps) {
  const tenantId = useTenantId() ?? '';
  const { data: directory, refetch } = useStaffDirectory(tenantId);
  const createStaff = useCreateStaff(tenantId);
  const status = useMemo(() => splitFinanceStaffStatus(directory?.staff), [directory?.staff]);

  const nextRole: FinanceInviteRole | null = !status.hasCashier
    ? 'cashier'
    : !status.hasAccountant
      ? 'accountant'
      : null;

  const [success, setSuccess] = useState<{ role: FinanceInviteRole; loginEmail: string } | null>(
    null,
  );

  const form = useForm<CreateStaffRequest>({
    resolver: zodResolver(createStaffRequest),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      primaryRole: 'cashier',
    },
  });

  useEffect(() => {
    if (!nextRole) return;
    form.reset({ fullName: '', email: '', phone: '', primaryRole: nextRole });
    setSuccess(null);
  }, [nextRole, form]);

  if (status.isComplete) {
    return (
      <section className={`${ACADEMIC_UI.dataPanel} space-y-3 p-5`}>
        <div className="flex items-center gap-2 text-emerald-700">
          <Check aria-hidden className="size-5" />
          <p className="text-[14px] font-semibold">Split finance team is ready</p>
        </div>
        <p className="text-[13px] text-neutral-600">
          Cashier ({status.cashierName}) and Accountant ({status.accountantName}) are separate
          accounts. Each person signs in to their own desk.
        </p>
      </section>
    );
  }

  if (!nextRole) {
    return null;
  }

  const meta = ROLE_META[nextRole];
  const StepIcon = meta.icon;
  const stepIndex = nextRole === 'cashier' ? 1 : 2;

  const onSubmit = form.handleSubmit(async (values) => {
    setSuccess(null);
    try {
      const result = await createStaff.mutateAsync({ ...values, primaryRole: nextRole });
      await refetch();
      setSuccess({ role: nextRole, loginEmail: result.loginEmail });
      form.reset({ fullName: '', email: '', phone: '', primaryRole: nextRole });
      if (nextRole === 'accountant') {
        onComplete?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add staff member.';
      form.setError('root', {
        message: message.includes('HRM_ROLE_CONFLICT')
          ? 'This person cannot hold both Cashier and Accountant roles in split mode.'
          : message,
      });
    }
  });

  return (
    <section className={`${ACADEMIC_UI.dataPanel} space-y-5 p-5`}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <StepIcon aria-hidden className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
            Step {stepIndex} of 2
          </p>
          <h2 className="text-[14px] font-semibold text-neutral-900">Invite {meta.title}</h2>
          <p className="text-[13px] leading-relaxed text-neutral-600">{meta.description}</p>
          <p className="text-[12px] text-neutral-500">
            Lands on <span className="font-mono text-neutral-700">{meta.home}</span> after sign-in.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
            status.hasCashier ? 'bg-emerald-50 text-emerald-800' : 'bg-brand-50 text-brand-800'
          }`}
        >
          Cashier {status.hasCashier ? '✓' : '—'}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
            status.hasAccountant ? 'bg-emerald-50 text-emerald-800' : 'bg-muted/60 text-neutral-600'
          }`}
        >
          Accountant {status.hasAccountant ? '✓' : '—'}
        </span>
      </div>

      {success?.role === nextRole ? (
        <Alert>
          <AlertDescription>
            {meta.title} added ({success.loginEmail}).{' '}
            {nextRole === 'cashier' ? 'Continue with the Accountant invite below.' : 'Setup complete.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FieldLabel>Full name</FieldLabel>
                <FormControl>
                  <Input {...field} className={staffFormInputClass} autoComplete="name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FieldLabel>Work email</FieldLabel>
                <FormControl>
                  <Input {...field} type="email" className={staffFormInputClass} autoComplete="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FieldLabel>Phone</FieldLabel>
                <FormControl>
                  <Input {...field} className={staffFormInputClass} autoComplete="tel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root ? (
            <p className="text-[13px] text-destructive" role="alert">
              {form.formState.errors.root.message}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={createStaff.isPending}
            className={`h-10 ${SEMANTIC.cta.primary}`}
          >
            {createStaff.isPending ? 'Adding…' : `Add ${meta.title}`}
          </Button>
        </form>
      </Form>
    </section>
  );
}
