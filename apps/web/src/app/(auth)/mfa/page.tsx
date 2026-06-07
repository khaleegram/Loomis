'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mfaVerifyRequest, type MfaVerifyRequest } from '@loomis/contracts';
import { Button } from '@loomis/ui-web';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthCard, FormError, TextField } from '@/components/auth/auth-ui';
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

  // No challenge in memory (e.g. page reloaded) → restart the flow.
  useEffect(() => {
    if (!mfaChallengeId) router.replace('/login');
  }, [mfaChallengeId, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CodeForm>({
    resolver: zodResolver(mfaVerifyRequest.pick({ code: true })),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async ({ code }) => {
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
    <AuthCard title="Two-step verification" subtitle="Enter the 6-digit code from your authenticator app">
      <form onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <TextField
          label="Authentication code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.code?.message}
          {...register('code')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </Button>
      </form>
    </AuthCard>
  );
}
