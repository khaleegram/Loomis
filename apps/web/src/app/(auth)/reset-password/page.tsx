'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  passwordResetConfirmRequest,
  passwordResetRequest,
  type PasswordResetRequest,
} from '@loomis/contracts';
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
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthFormCard } from '@/components/auth/auth-form-card';
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
      <AuthFormCard title="Password updated" subtitle="Your other sessions have been signed out.">
        <Button className="w-full" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </AuthFormCard>
    );
  }

  if (otpId) {
    return (
      <AuthFormCard
        title="Enter reset code"
        subtitle={`We sent a 6-digit code to your registered ${channel ?? 'contact'}.`}
      >
        <Form {...confirmFormState}>
          <form onSubmit={onConfirm} noValidate className="space-y-4">
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <FormField
              control={confirmFormState.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reset code</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      className="font-mono tracking-widest"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={confirmFormState.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={confirmFormState.formState.isSubmitting}>
              {confirmFormState.formState.isSubmitting ? 'Updating…' : 'Set new password'}
            </Button>
          </form>
        </Form>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard
      title="Reset password"
      subtitle="We'll send a one-time code to your registered contact."
      footer={
        <p className="w-full py-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <Form {...requestForm}>
        <form onSubmit={onRequest} noValidate className="space-y-4">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <FormField
            control={requestForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={requestForm.formState.isSubmitting}>
            {requestForm.formState.isSubmitting ? 'Sending…' : 'Send reset code'}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
