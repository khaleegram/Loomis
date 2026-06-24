'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCreateStaff } from '@loomis/api-client';
import { createStaffRequest, type CreateStaffRequest, type EmailDeliveryResult } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
  cn,
} from '@loomis/ui-web';
import { ArrowLeft, Check, Copy, KeyRound, Mail, Phone, Sparkles, User, UserPlus } from 'lucide-react';

import {
  StaffPrimaryRoleSelect,
  staffFormInputClass,
} from '@/components/staff/staff-primary-role-select';
import { PageBody } from '@/components/school/school-shell';
import { useCan } from '@/lib/auth/use-capability';
import { useTenantId } from '@/lib/tenant/use-tenant-id';
import { useTenantExperience } from '@/lib/tenant/use-tenant-experience';

const panelClass =
  'rounded-2xl border border-neutral-200/70 bg-white p-6 sm:p-8 shadow-sm';

function credentialsEmailNotice(email: EmailDeliveryResult): string {
  if (email.sent) {
    return `Login details were emailed to ${email.recipient} with a direct link to sign in.`;
  }
  if (email.reason === 'EMAIL_NOT_CONFIGURED') {
    return 'Email is not configured yet (add RESEND_API_KEY and RESEND_FROM_EMAIL to .env.local). Copy the credentials below and share them manually.';
  }
  return 'The credentials email could not be delivered. Copy the details below and share them manually.';
}

function buildCredentialsClipboardText(loginEmail: string, temporaryPassword: string): string {
  const loginUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';
  return [
    `Sign in: ${loginUrl}`,
    `Login email: ${loginEmail}`,
    `Temporary password: ${temporaryPassword}`,
    '',
    'You must set a new password on first sign-in.',
  ].join('\n');
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-400">
      {children}
      {required ? <span className="text-brand-600"> *</span> : null}
    </p>
  );
}

export default function AddStaffPage() {
  const tenantId = useTenantId();
  const { financeMode, flags, isAdvanced } = useTenantExperience();
  const canOnboard = useCan('staff.onboard');
  const createStaff = useCreateStaff(tenantId ?? '');
  const [success, setSuccess] = useState<{
    loginEmail: string;
    temporaryPassword: string;
    credentialsEmail: EmailDeliveryResult;
  } | null>(null);

  const form = useForm<CreateStaffRequest>({
    resolver: zodResolver(createStaffRequest),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      primaryRole: 'teacher',
    },
  });

  if (!canOnboard) {
    return (
      <PageBody className="max-w-2xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <Alert>
          <AlertDescription>You do not have permission to add staff.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  if (!tenantId) {
    return (
      <PageBody className="max-w-2xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <Alert variant="destructive">
          <AlertDescription>No tenant context. Sign in again.</AlertDescription>
        </Alert>
      </PageBody>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await createStaff.mutateAsync(values);
      setSuccess({
        loginEmail: result.loginEmail,
        temporaryPassword: result.temporaryPassword,
        credentialsEmail: result.credentialsEmail,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add staff member.';
      form.setError('root', {
        message: message.includes('HRM_ROLE_CONFLICT')
          ? 'In split finance mode, one person cannot be both Cashier and Accountant.'
          : message,
      });
    }
  });

  const isPending = form.formState.isSubmitting || createStaff.isPending;

  async function copyCredentials() {
    if (!success) return;
    await navigator.clipboard.writeText(
      buildCredentialsClipboardText(success.loginEmail, success.temporaryPassword),
    );
  }

  return (
    <PageBody className="max-w-2xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-400">
        <Link href="/school/staff" className="transition-colors hover:text-brand-600">
          Staff Management
        </Link>
        <span className="text-neutral-200">/</span>
        <span className="text-brand-600">Add Staff</span>
      </div>

      <div className="mb-8">
        <h1 className="text-[1.75rem] font-extrabold tracking-tight text-neutral-900">
          Add a new staff member
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
          Creates an active account with default password{' '}
          <span className="font-mono text-neutral-700">11111111</span>. They must choose a new
          password on first login — share login details securely with them.
        </p>
      </div>

      {success ? (
        <div className={panelClass}>
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50">
            <Check aria-hidden className="size-7 text-emerald-600" />
          </div>
          <h2 className="text-center text-lg font-bold text-neutral-900">Staff member added</h2>
          <p className="mt-2 text-center text-[13px] text-neutral-500">
            {form.getValues('fullName')} can sign in now and will be prompted to change their
            password immediately.
          </p>

          <Alert
            className="mt-6"
            variant={success.credentialsEmail.sent ? 'default' : 'warning'}
          >
            <AlertTitle className="flex items-center gap-2">
              <Mail aria-hidden className="size-4" />
              {success.credentialsEmail.sent ? 'Email sent' : 'Email not sent'}
            </AlertTitle>
            <AlertDescription>{credentialsEmailNotice(success.credentialsEmail)}</AlertDescription>
          </Alert>

          <Alert className="mt-4 border-amber-200/80 bg-amber-50/80" variant="warning">
            <AlertTitle>One-time display</AlertTitle>
            <AlertDescription>
              {success.credentialsEmail.sent
                ? 'Keep a backup copy here in case the recipient cannot find the email.'
                : 'Copy these credentials now. The temporary password cannot be retrieved later.'}
            </AlertDescription>
          </Alert>

          <div className="mt-4 space-y-3 rounded-xl bg-neutral-50 p-4 text-[13px]">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-neutral-500">Sign-in link</span>
              <span className="font-mono text-[12px] font-semibold text-neutral-800 break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-neutral-500">Login email</span>
              <span className="font-mono font-semibold text-neutral-800">{success.loginEmail}</span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-neutral-500">Temporary password</span>
              <span className="font-mono font-semibold text-neutral-800">
                {success.temporaryPassword}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-neutral-200"
              onClick={() => void copyCredentials()}
            >
              <Copy aria-hidden className="size-3.5" />
              Copy credentials
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-neutral-200" asChild>
              <Link href="/school/staff">
                <ArrowLeft aria-hidden className="size-3.5" />
                Return to directory
              </Link>
            </Button>
            <Button
              size="sm"
              className="h-10 gap-1.5 rounded-lg px-5 text-[14px] font-medium text-[#0f1729]"
              style={{ background: '#c9a96e' }}
              onClick={() => {
                createStaff.reset();
                setSuccess(null);
                form.reset();
              }}
            >
              <Sparkles aria-hidden className="size-3.5" />
              Add another
            </Button>
          </div>
        </div>
      ) : (
        <div className={panelClass}>
          <div className="mb-6 flex items-center gap-3 border-b border-neutral-100 pb-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
              <UserPlus aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-[14px] font-bold text-neutral-800">New staff account</p>
              <p className="text-[12px] text-neutral-500">
                Default password <span className="font-mono text-neutral-700">11111111</span> · changed
                on first login
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-8" noValidate>
              {form.formState.errors.root?.message ? (
                <Alert variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}

              <section className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                    Personal details
                  </p>
                  <p className="mt-0.5 text-[12px] text-neutral-500">Identity and contact information</p>
                </div>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel required>Full name</FieldLabel>
                      <FormControl>
                        <div className="relative">
                          <User
                            aria-hidden
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                          />
                          <Input
                            autoComplete="name"
                            placeholder="e.g. Adebayo Oluwaseun"
                            className={cn(staffFormInputClass, 'pl-9 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-200 focus-visible:ring-offset-0')}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel required>Login email</FieldLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail
                              aria-hidden
                              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                            />
                            <Input
                              type="email"
                              autoComplete="email"
                              placeholder="olu@school.edu.ng"
                              className={cn(staffFormInputClass, 'pl-9 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-200 focus-visible:ring-offset-0')}
                              {...field}
                            />
                          </div>
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
                        <FieldLabel required>Phone</FieldLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone
                              aria-hidden
                              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                            />
                            <Input
                              type="tel"
                              autoComplete="tel"
                              placeholder="0803 456 7890"
                              className={cn(staffFormInputClass, 'pl-9 shadow-none focus-visible:ring-1 focus-visible:ring-neutral-200 focus-visible:ring-offset-0')}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="space-y-4 border-t border-neutral-100 pt-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                    Role assignment
                  </p>
                  <p className="mt-0.5 text-[12px] text-neutral-500">Primary role for this staff member</p>
                </div>

                <FormField
                  control={form.control}
                  name="primaryRole"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel required>Primary role</FieldLabel>
                      <FormControl>
                        <StaffPrimaryRoleSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isPending}
                          financeMode={financeMode}
                          enableTimetableOfficer={isAdvanced && flags.timetableDedicatedOfficer}
                          enableDeputyExamOfficer={isAdvanced && flags.deputyExamEnabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <div className="flex flex-col gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-neutral-200 sm:min-w-[120px]"
                  asChild
                >
                  <Link href="/school/staff">
                    <ArrowLeft aria-hidden className="size-3.5" />
                    Cancel
                  </Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  size="sm"
                  className="h-10 flex-1 gap-1.5 rounded-lg px-5 text-[14px] font-medium text-[#0f1729] transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#c9a96e' }}
                >
                  {isPending ? (
                    'Creating account…'
                  ) : (
                    <>
                      <KeyRound aria-hidden className="size-3.5" />
                      Add staff member
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </PageBody>
  );
}
