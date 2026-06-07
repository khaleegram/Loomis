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
  FormLabel,
  FormMessage,
  Input,
} from '@loomis/ui-web';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthFormCard } from '@/components/auth/auth-form-card';
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

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequest),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
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
    <AuthFormCard
      title="Sign in"
      subtitle="Access your Loomis console"
      footer={
        <p className="w-full py-4 text-center text-sm text-muted-foreground">
          <Link href="/reset-password" className="text-primary hover:underline">
            Forgot your password?
          </Link>
        </p>
      }
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
