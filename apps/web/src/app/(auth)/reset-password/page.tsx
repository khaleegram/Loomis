'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  passwordResetConfirmRequest,
  passwordResetRequest,
  type PasswordResetRequest,
} from '@loomis/contracts';
import { Button } from '@loomis/ui-web';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthCard, FormError, TextField } from '@/components/auth/auth-ui';
import { confirmPasswordReset, requestPasswordReset } from '@/lib/auth/auth-client';
import { authErrorMessage } from '@/lib/auth/auth-errors';

const confirmForm = passwordResetConfirmRequest.pick({ otp: true, newPassword: true });
type ConfirmForm = z.infer<typeof confirmForm>;

/** US-XC-003 — request an OTP, then set a new password. */
export default function ResetPasswordPage() {
  const [otpId, setOtpId] = useState<string | null>(null);
  const [channel, setChannel] = useState<'email' | 'phone' | null>(null);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const requestForm = useForm<PasswordResetRequest>({
    resolver: zodResolver(passwordResetRequest),
    defaultValues: { email: '' },
  });

  const confirmFormState = useForm<ConfirmForm>({
    resolver: zodResolver(confirmForm),
    defaultValues: { otp: '', newPassword: '' },
  });

  const onRequest = requestForm.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await requestPasswordReset(values);
      setOtpId(result.otpId);
      setChannel(result.channel);
    } catch (err) {
      setFormError(authErrorMessage(err));
    }
  });

  const onConfirm = confirmFormState.handleSubmit(async (values) => {
    if (!otpId) return;
    setFormError(null);
    try {
      await confirmPasswordReset({ otpId, ...values });
      setDone(true);
    } catch (err) {
      setFormError(authErrorMessage(err));
    }
  });

  if (done) {
    return (
      <AuthCard title="Password updated" subtitle="Your other sessions have been signed out.">
        <Link href="/login">
          <Button className="w-full">Back to sign in</Button>
        </Link>
      </AuthCard>
    );
  }

  if (otpId) {
    return (
      <AuthCard
        title="Enter reset code"
        subtitle={`We sent a 6-digit code to your registered ${channel ?? 'contact'}.`}
      >
        <form onSubmit={onConfirm} noValidate>
          <FormError message={formError} />
          <TextField
            label="Reset code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            error={confirmFormState.formState.errors.otp?.message}
            {...confirmFormState.register('otp')}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            error={confirmFormState.formState.errors.newPassword?.message}
            {...confirmFormState.register('newPassword')}
          />
          <Button type="submit" className="w-full" disabled={confirmFormState.formState.isSubmitting}>
            {confirmFormState.formState.isSubmitting ? 'Updating…' : 'Set new password'}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset password" subtitle="We'll send a one-time code to your registered contact.">
      <form onSubmit={onRequest} noValidate>
        <FormError message={formError} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={requestForm.formState.errors.email?.message}
          {...requestForm.register('email')}
        />
        <Button type="submit" className="w-full" disabled={requestForm.formState.isSubmitting}>
          {requestForm.formState.isSubmitting ? 'Sending…' : 'Send reset code'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        <Link href="/login" className="text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
