'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { mfaEnrollConfirmRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
} from '@loomis/ui-web';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthFormCard } from '@/components/auth/auth-form-card';
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

  const form = useForm<CodeForm>({
    resolver: zodResolver(codeForm),
    defaultValues: { code: '' },
  });

  const onSubmit = form.handleSubmit(async ({ code }) => {
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
      <AuthFormCard
        title="Save your backup codes"
        subtitle="Store these somewhere safe. Each code works once."
      >
        <Alert className="mb-4 border-gold/30 bg-accent">
          <AlertTitle>Keep these codes private</AlertTitle>
          <AlertDescription>
            You will not be able to view these codes again. Store them in a secure location.
          </AlertDescription>
        </Alert>
        <ul className="mb-6 grid grid-cols-2 gap-2 rounded-md border border-border bg-muted p-4 font-mono text-sm">
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
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard
      title="Set up two-step verification"
      subtitle="Scan the key in your authenticator app, then enter a code."
    >
      {formError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {secret ? (
        <div className="mb-4 rounded-md border border-border bg-muted p-4 text-sm">
          <p className="text-muted-foreground">Manual setup key</p>
          <p className="mt-1 break-all font-mono text-foreground">{secret}</p>
          {provisioningUri ? (
            <p className="mt-2 break-all text-xs text-muted-foreground">{provisioningUri}</p>
          ) : null}
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !secret}>
            {form.formState.isSubmitting ? 'Confirming…' : 'Confirm'}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
