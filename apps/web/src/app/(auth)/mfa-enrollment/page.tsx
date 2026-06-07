'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mfaEnrollConfirmRequest } from '@loomis/contracts';
import { Button } from '@loomis/ui-web';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthCard, FormError, TextField } from '@/components/auth/auth-ui';
import { confirmMfaEnrollment, startMfaEnrollment } from '@/lib/auth/auth-client';
import { authErrorMessage } from '@/lib/auth/auth-errors';
import { useAuthFlow } from '@/lib/auth/auth-flow-store';

const codeForm = mfaEnrollConfirmRequest.pick({ code: true });
type CodeForm = z.infer<typeof codeForm>;

/** US-XC-001 — first-login MFA enrollment. Account stays locked until complete. */
export default function MfaEnrollmentPage() {
  const router = useRouter();
  const { enrollmentToken, reset } = useAuthFlow();
  const [secret, setSecret] = useState<string | null>(null);
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!enrollmentToken) {
      router.replace('/login');
      return;
    }
    let active = true;
    void (async () => {
      try {
        const start = await startMfaEnrollment(enrollmentToken);
        if (!active) return;
        setSecret(start.secretBase32);
        setProvisioningUri(start.provisioningUri);
      } catch (err) {
        if (active) setFormError(authErrorMessage(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [enrollmentToken, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CodeForm>({
    resolver: zodResolver(codeForm),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async ({ code }) => {
    if (!enrollmentToken) return;
    setFormError(null);
    try {
      const result = await confirmMfaEnrollment({ enrollmentToken, code });
      setBackupCodes(result.backupCodes);
    } catch (err) {
      setFormError(authErrorMessage(err));
    }
  });

  if (backupCodes) {
    return (
      <AuthCard title="Save your backup codes" subtitle="Store these somewhere safe. Each code works once.">
        <ul className="mb-6 grid grid-cols-2 gap-2 rounded-md bg-neutral-50 p-3 font-mono text-sm text-neutral-800">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button
          className="w-full"
          onClick={() => {
            reset();
            router.replace('/login');
          }}
        >
          Continue to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set up two-step verification" subtitle="Scan the key in your authenticator app, then enter a code.">
      <FormError message={formError} />
      {secret ? (
        <div className="mb-4 rounded-md bg-neutral-50 p-3 text-sm">
          <p className="text-neutral-500">Manual setup key</p>
          <p className="mt-1 break-all font-mono text-neutral-900">{secret}</p>
          {provisioningUri ? (
            <p className="mt-2 break-all text-xs text-neutral-400">{provisioningUri}</p>
          ) : null}
        </div>
      ) : (
        <p className="mb-4 text-sm text-neutral-500">Loading setup key…</p>
      )}
      <form onSubmit={onSubmit} noValidate>
        <TextField
          label="Authentication code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          error={errors.code?.message}
          {...register('code')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting || !secret}>
          {isSubmitting ? 'Confirming…' : 'Confirm'}
        </Button>
      </form>
    </AuthCard>
  );
}
