'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequest, type LoginRequest } from '@loomis/contracts';
import { Button } from '@loomis/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthCard, FormError, TextField } from '@/components/auth/auth-ui';
import { login } from '@/lib/auth/auth-client';
import { authErrorMessage } from '@/lib/auth/auth-errors';
import { useAuth } from '@/lib/auth/auth-context';
import { useAuthFlow } from '@/lib/auth/auth-flow-store';
import { homePathForRole } from '@/lib/auth/route-groups';

/** US-XC-001 — password step of login (MFA handled on the next screen). */
export default function LoginPage() {
  const router = useRouter();
  const { completeAuthentication } = useAuth();
  const { setMfaChallenge, setEnrollmentToken } = useAuthFlow();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequest),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await login(values);
      switch (result.outcome) {
        case 'authenticated':
          completeAuthentication(result);
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
    }
  });

  return (
    <AuthCard title="Sign in" subtitle="Access your Loomis console">
      <form onSubmit={onSubmit} noValidate>
        <FormError message={formError} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        <Link href="/reset-password" className="text-brand-700 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </AuthCard>
  );
}
