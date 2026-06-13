'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordRequest } from '@loomis/contracts';
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
import { Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { changePassword } from '@/lib/auth/auth-client';
import { authErrorMessage } from '@/lib/auth/auth-errors';
import { useAuth } from '@/lib/auth/auth-context';
import { homePathForRole } from '@/lib/auth/route-groups';

const setupPasswordForm = changePasswordRequest
  .extend({ confirmPassword: z.string().min(1, 'Confirm your new password') })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SetupPasswordForm = z.infer<typeof setupPasswordForm>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { status, session, completeAuthentication } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SetupPasswordForm>({
    resolver: zodResolver(setupPasswordForm),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (status !== 'authenticated') {
      setFormError('Your session is still loading. Wait a moment and try again.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const next = await changePassword({ newPassword: values.newPassword });
      completeAuthentication(next);
      router.replace(homePathForRole(next.role));
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  });

  const sessionReady = status === 'authenticated';

  return (
    <AuthFormCard
      title="Set your password"
      subtitle="You signed in with a temporary password. Choose a new password before continuing."
      footer={
        <p className="w-full py-4 text-center text-sm text-neutral-400">
          Password must be at least 8 characters with upper, lower, digit, and special character.
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          {!sessionReady ? (
            <Alert>
              <AlertDescription>Preparing your session…</AlertDescription>
            </Alert>
          ) : null}

          <FormField
            control={form.control}
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full gap-2 min-h-12"
            disabled={isSubmitting || !sessionReady}
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Updating password…
              </>
            ) : (
              <>
                <Lock aria-hidden className="size-4" />
                Save new password
              </>
            )}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
