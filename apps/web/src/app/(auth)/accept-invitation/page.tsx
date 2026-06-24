'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { acceptStaffInvitationRequest } from '@loomis/contracts';
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
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { authErrorMessage } from '@/lib/auth/auth-errors';

const acceptForm = acceptStaffInvitationRequest
  .extend({ confirmPassword: z.string().min(1, 'Confirm your password') })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type AcceptForm = z.infer<typeof acceptForm>;

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const tenantId = searchParams.get('tenant') ?? '';
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:18080/api/v1';

  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const missingParams = useMemo(() => !token || !tenantId, [token, tenantId]);

  const form = useForm<AcceptForm>({
    resolver: zodResolver(acceptForm),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/tenants/${tenantId}/staff/invitations/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: values.token, password: values.password }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
        data?: unknown;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error?.message ?? 'Could not accept invitation');
      }
      setDone(true);
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  });

  if (missingParams) {
    return (
      <AuthFormCard title="Invalid invitation link" subtitle="This link is missing required details.">
        <Alert variant="destructive">
          <AlertDescription>Ask your school administrator to resend the invitation.</AlertDescription>
        </Alert>
        <Button className="mt-6 w-full" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </AuthFormCard>
    );
  }

  if (done) {
    return (
      <AuthFormCard title="Account ready" subtitle="Your staff account is active. Sign in with your new password.">
        <div className="mb-5 flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/20">
            <CheckCircle2 className="size-7 text-green-400" />
          </div>
        </div>
        <Button className="w-full h-12 font-semibold bg-gold-400 hover:bg-gold-500 text-forest-900" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard
      title="Set your password"
      subtitle="Complete your Loomis staff account setup."
    >
      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <input type="hidden" {...form.register('token')} />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-neutral-300 text-xs uppercase tracking-wider font-semibold">
                  Password
                </FormLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
                  <FormControl>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pl-10 pr-12 h-12 bg-white/5 border-white/10 text-white"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-neutral-300 text-xs uppercase tracking-wider font-semibold">
                  Confirm password
                </FormLabel>
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="h-12 bg-white/5 border-white/10 text-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 font-semibold bg-gold-400 hover:bg-gold-500 text-forest-900"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                Activating…
              </>
            ) : (
              'Activate account'
            )}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
