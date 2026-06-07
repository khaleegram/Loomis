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
import { Loader2, ShieldCheck } from 'lucide-react';
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

export default function MfaVerifyPage() {
  const router = useRouter();
  const { completeAuthentication } = useAuth();
  const { mfaChallengeId, reset } = useAuthFlow();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      const session = await verifyMfa({ mfaChallengeId, code });
      reset();
      completeAuthentication(session);
      router.replace(homePathForRole(session.role));
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <AuthFormCard
      title="Two-step verification"
      subtitle="Enter the 6-digit code from your authenticator app"
    >
      <div className="mb-5 flex justify-center">
        <div className="flex size-14 items-center justify-center bg-sky-400/10 ring-1 ring-sky-400/20">
          <ShieldCheck className="size-7 text-sky-400" />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
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
                <FormLabel className="text-neutral-300 text-xs uppercase tracking-wider font-semibold">
                  Authentication code
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    className="h-14 text-center font-mono text-2xl tracking-[0.5em] bg-white/5 border-white/10 text-white placeholder:text-neutral-600 focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
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
            className="w-full h-12 font-semibold tracking-wide bg-sky-400 hover:bg-sky-500 text-navy-900 transition-all duration-200"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
                Verifying…
              </>
            ) : (
              'Verify'
            )}
          </Button>

          <p className="text-center text-xs text-neutral-500">
            Open your authenticator app to find your 6-digit code.
          </p>
        </form>
      </Form>
    </AuthFormCard>
  );
}
