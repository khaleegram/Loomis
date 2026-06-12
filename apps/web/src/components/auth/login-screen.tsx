'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequest, type LoginRequest } from '@loomis/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Input,
} from '@loomis/ui-web';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';

import { AuthFormCard } from '@/components/auth/auth-form-card';
import { login } from '@/lib/auth/auth-client';
import { authErrorMessage } from '@/lib/auth/auth-errors';
import { useAuth } from '@/lib/auth/auth-context';
import { useAuthFlow } from '@/lib/auth/auth-flow-store';
import { homePathForRole } from '@/lib/auth/route-groups';

/** Email + password sign-in form used on `/` and `/login`. */
export function LoginScreen() {
  const router = useRouter();
  const { completeAuthentication } = useAuth();
  const { setMfaChallenge, setEnrollmentToken } = useAuthFlow();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequest),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      const result = await login(values);
      switch (result.outcome) {
        case 'authenticated':
          completeAuthentication({
            accessToken: result.accessToken,
            expiresAt: result.expiresAt,
            role: result.role,
            tenantId: result.tenantId,
            ...(result.mustChangePassword ? { mustChangePassword: true } : {}),
            ...(result.displayName ? { displayName: result.displayName } : {}),
          });
          if (result.mustChangePassword) {
            router.replace('/change-password');
            return;
          }
          router.replace(homePathForRole(result.role));
          return;
        case 'mfa_required':
          setMfaChallenge(result.mfaChallengeId);
          router.push('/mfa');
          return;
        case 'mfa_enrollment_required':
          setEnrollmentToken(result.enrollmentToken);
          router.push('/mfa-enrollment');
          return;
      }
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSubmit(event);
  };

  return (
    <AuthFormCard
      title="Welcome back"
      subtitle="Sign in to your school management console."
      footer={
        <p className="w-full py-4 text-center text-sm text-neutral-400">
          Need access?{' '}
          <span className="text-neutral-500">Contact your school administrator.</span>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={handleFormSubmit} noValidate className="space-y-5">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <Mail
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500"
                  />
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="Email address"
                      className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/30 dark:bg-forest-900 dark:border-forest-700"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <Lock
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-500"
                  />
                  <FormControl>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Password"
                      className="pl-10 pr-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/30"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden className="size-4" />
                    ) : (
                      <Eye aria-hidden className="size-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <FormMessage />
                  <Link
                    href="/reset-password"
                    className="ml-auto text-xs text-neutral-400 hover:text-gold-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
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
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
