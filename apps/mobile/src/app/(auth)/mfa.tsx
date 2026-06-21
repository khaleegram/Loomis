import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthShell, Button, Input, Label, Alert } from '@loomis/ui-mobile';
import { verifyMfa, AuthError } from '@/lib/auth-client';
import { useAuth } from '@/lib/auth-context';
import { setBiometricEnabled, isBiometricAvailable } from '@/lib/biometrics';

export default function MfaScreen() {
  const { setSession } = useAuth();
  const params = useLocalSearchParams<{ challengeId?: string; enrollToken?: string; mode?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEnroll = params.mode === 'enroll';

  async function onVerify() {
    if (!params.challengeId || code.length !== 6) {
      setError('Enter your 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await verifyMfa({ mfaChallengeId: params.challengeId, code });
      await setSession(session);
      if (await isBiometricAvailable()) {
        await setBiometricEnabled(true);
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={isEnroll ? 'Set up MFA' : 'Verify identity'}
      subtitle="Enter the 6-digit code from your authenticator app"
    >
      {isEnroll ? (
        <Alert tone="info" className="mb-4">
          MFA enrollment on mobile uses the enrollment token from login. Complete setup on web if
          prompted, then sign in again.
        </Alert>
      ) : null}
      <Label>Authenticator code</Label>
      <Input
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        className="mb-4 tracking-[0.4em]"
      />
      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}
      <Button loading={loading} onPress={() => void onVerify()}>
        Verify
      </Button>
      <Button variant="ghost" className="mt-3" onPress={() => router.back()}>
        Back
      </Button>
    </AuthShell>
  );
}
