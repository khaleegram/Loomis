'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mfaVerifyRequest, type MfaVerifyRequest } from '@loomis/contracts';
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
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { verifyMfa } from '@/lib/auth/auth-client';
import { authErrorMessage } from '@/lib/auth/auth-errors';
import { useAuth } from '@/lib/auth/auth-context';
import { useAuthFlow } from '@/lib/auth/auth-flow-store';
import { homePathForRole } from '@/lib/auth/route-groups';

type CodeForm = Pick<MfaVerifyRequest, 'code'>;

/** US-XC-001 — second factor: enter the TOTP code from the authenticator app. */
export default function MfaVerifyPage() {
  const router = useRouter();
  const { completeAuthentication } = useAuth();
  const { mfaChallengeId, reset } = useAuthFlow();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!mfaChallengeId) router.replace('/login');
  }, [mfaChallengeId, router]);

  const form = useForm<CodeForm>({
    resolver: zodResolver(mfaVerifyRequest.pick({ code: true })),
    defaultValues: { code: '' },
  });

  const onSubmit = form.handleSubmit(async ({ code }) => {
    if (!mfaChallengeId) return;
    setFormError(null);
    try {
      const session = await verifyMfa({ mfaChallengeId, code });
      reset();
      completeAuthentication(session);
      router.replace(homePathForRole(session.role));
    } catch (err) {
      setFormError(authErrorMessage(err));
    }
  });

  return (
    <AuthFormCard
      title="Two-step verification"
      subtitle="Enter the 6-digit code from your authenticator app"
    >
      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication code</FormLabel>
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
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Verifying…' : 'Verify'}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
