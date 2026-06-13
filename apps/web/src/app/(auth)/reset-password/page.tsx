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
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { confirmPasswordReset, requestPasswordReset } from '@/lib/auth/auth-client';
import { authErrorMessage } from '@/lib/auth/auth-errors';

const confirmForm = passwordResetConfirmRequest.pick({ otp: true, newPassword: true });
type ConfirmForm = z.infer<typeof confirmForm>;

export default function ResetPasswordPage() {
  const [otpId, setOtpId] = useState<string | null>(null);
  const [channel, setChannel] = useState<'email' | 'phone' | null>(null);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    setIsRequesting(true);
    try {
      const result = await requestPasswordReset(values);
      setOtpId(result.otpId);
      setChannel(result.channel);
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setIsRequesting(false);
    }
  });

  const onConfirm = confirmFormState.handleSubmit(async (values) => {
    if (!otpId) return;
    setFormError(null);
    setIsConfirming(true);
    try {
      await confirmPasswordReset({ otpId, ...values });
      setDone(true);
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setIsConfirming(false);
    }
  });

  if (done) {
    return (
      <AuthFormCard title="Password updated" subtitle="All other sessions have been signed out.">
        <div className="mb-5 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/20">
            <CheckCircle2 className="size-7 text-green-400" />
          </div>
        </div>
        <Button className="w-full h-12 font-semibold bg-gold-400 hover:bg-gold-500 text-forest-900 shadow-[0_0_20px_rgba(212,175,55,0.15)]" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </AuthFormCard>
    );
  }

  if (otpId) {
    return (
      <AuthFormCard
        title="Enter reset code"
        subtitle={`We sent a 6-digit code to your ${channel ?? 'contact'}.`}
      >
        <Form {...confirmFormState}>
          <form onSubmit={onConfirm} noValidate className="space-y-5">
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
                  <FormLabel className="text-neutral-300 text-xs uppercase tracking-wider font-semibold">
                    Reset code
                  </FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      className="h-14 text-center font-mono text-2xl tracking-[0.5em] bg-white/5 border-white/10 text-white placeholder:text-neutral-600 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/30"
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
                  <FormLabel className="text-neutral-300 text-xs uppercase tracking-wider font-semibold">
                    New password
                  </FormLabel>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Choose a strong password"
                        className="pl-10 pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/30"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-300 transition-colors sm:right-3 sm:size-auto"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 font-semibold tracking-wide bg-gold-400 hover:bg-gold-500 text-forest-900 transition-all duration-200 shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:shadow-[0_0_30px_rgba(212,175,55,0.25)]"
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                  Updating…
                </>
              ) : (
                'Set new password'
              )}
            </Button>
          </form>
        </Form>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard
      title="Reset your password"
      subtitle="Enter your email and we'll send a one-time reset code."
      footer={
        <p className="w-full py-4 text-center text-sm text-neutral-400">
          <Link href="/login" className="text-gold-400 hover:text-gold-300 transition-colors">
            Back to sign in
          </Link>
        </p>
      }
    >
      <Form {...requestForm}>
        <form onSubmit={onRequest} noValidate className="space-y-5">
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
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="Email address"
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/30"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 font-semibold tracking-wide bg-gold-400 hover:bg-gold-500 text-forest-900 transition-all duration-200 shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:shadow-[0_0_30px_rgba(212,175,55,0.25)]"
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset code'
            )}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
