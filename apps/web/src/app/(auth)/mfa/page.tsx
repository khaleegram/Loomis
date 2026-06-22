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
import { landingPathForRole } from '@/lib/auth/route-groups';

type CodeForm = Pick<MfaVerifyRequest, 'code'>;

export default function MfaVerifyPage() {
  const router = useRouter();
  const { completeAuthentication } = useAuth();
  const { mfaChallengeId, mfaChannel, maskedPhone, devBypass, reset } = useAuthFlow();
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
      router.replace(landingPathForRole(session.role));
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  });

  const isSms = mfaChannel === 'sms';

  return (
    <AuthFormCard
      title="Two-step verification"
      subtitle={
        isSms
          ? maskedPhone
            ? `Enter the 6-digit code sent to ${maskedPhone}`
            : 'Enter the 6-digit code sent to your phone'
          : 'Enter the 6-digit code from your authenticator app'
      }
    >
      <div className="mb-5 flex justify-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gold-400/10 ring-1 ring-gold-400/20">
          <ShieldCheck className="size-7 text-gold-400" />
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
                  {isSms ? 'SMS code' : 'Authentication code'}
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

          <Button
            type="submit"
            size="lg"
            className="w-full h-12 font-semibold tracking-wide bg-gold-400 hover:bg-gold-500 text-forest-900 transition-all duration-200 shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:shadow-[0_0_30px_rgba(212,175,55,0.25)]"
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
            {isSms ? (
              <>
                Check your phone for the verification text.
                {devBypass ? ' In development without Termii, use 000000.' : null}
              </>
            ) : (
              'Open your authenticator app to find your 6-digit code.'
            )}
          </p>
        </form>
      </Form>
    </AuthFormCard>
  );
}
