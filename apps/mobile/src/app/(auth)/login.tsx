import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequest, type LoginRequest } from '@loomis/contracts';
import { AuthShell, Button, Input, Label, Alert } from '@loomis/ui-mobile';
import { login, AuthError } from '@/lib/auth-client';
import { useAuth } from '@/lib/auth-context';
import {
  authenticateWithBiometrics,
  isBiometricAvailable,
  isBiometricEnabled,
} from '@/lib/biometrics';
import { refreshSession, persistSession } from '@/lib/auth-client';

export default function LoginScreen() {
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequest),
    defaultValues: { email: '', password: '' },
  });

  async function tryBiometric() {
    const [available, enabled] = await Promise.all([
      isBiometricAvailable(),
      isBiometricEnabled(),
    ]);
    if (!available || !enabled) return;
    const ok = await authenticateWithBiometrics('Unlock Loomis');
    if (!ok) return;
    setLoading(true);
    try {
      const session = await refreshSession();
      if (session) {
        await persistSession(session);
        await setSession(session);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(values: LoginRequest) {
    setError(null);
    setLoading(true);
    try {
      const result = await login(values);
      if (result.outcome === 'authenticated') {
        await setSession({
          accessToken: result.accessToken,
          expiresAt: result.expiresAt,
          role: result.role,
          tenantId: result.tenantId,
          mustChangePassword: result.mustChangePassword,
          displayName: result.displayName,
          refreshToken: result.refreshToken,
          staffExtensionRoles: result.staffExtensionRoles,
        });
        return;
      }
      if (result.outcome === 'mfa_required') {
        router.push({
          pathname: '/(auth)/mfa',
          params: { challengeId: result.mfaChallengeId },
        });
        return;
      }
      router.push({
        pathname: '/(auth)/mfa',
        params: { enrollToken: result.enrollmentToken, mode: 'enroll' },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err.message);
      } else if (err instanceof TypeError) {
        setError(
          'Cannot reach the API. Use the same Wi‑Fi as your PC, allow port 18080 in the firewall, and restart Expo with --lan.',
        );
      } else {
        setError('Login failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Family & school portal for Loomis">
      <Controller
        control={form.control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="mb-4">
            <Label>Email</Label>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          </View>
        )}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="mb-4">
            <Label>Password</Label>
            <Input secureTextEntry onBlur={onBlur} onChangeText={onChange} value={value} />
          </View>
        )}
      />
      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}
      <Button loading={loading} onPress={form.handleSubmit(onSubmit)}>
        Continue
      </Button>
      <Button variant="secondary" className="mt-3" onPress={() => void tryBiometric()}>
        Use biometrics
      </Button>
      <Link href="/(auth)/reset-password" asChild>
        <Text className="mt-6 text-center text-sm font-semibold text-brand-600">
          Forgot password?
        </Text>
      </Link>
    </AuthShell>
  );
}
