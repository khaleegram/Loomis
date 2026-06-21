import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { passwordResetRequest } from '@loomis/contracts';
import { AuthShell, Button, Input, Label, Alert } from '@loomis/ui-mobile';
import { requestPasswordReset, confirmPasswordReset, AuthError } from '@/lib/auth-client';

const confirmSchema = z.object({
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

type ConfirmForm = z.infer<typeof confirmSchema>;

export default function ResetPasswordScreen() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestForm = useForm<z.infer<typeof passwordResetRequest>>({
    resolver: zodResolver(passwordResetRequest),
    defaultValues: { email: '' },
  });

  const confirmForm = useForm<ConfirmForm>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { otp: '', newPassword: '' },
  });

  async function onRequest(values: z.infer<typeof passwordResetRequest>) {
    setLoading(true);
    setError(null);
    try {
      const res = await requestPasswordReset(values);
      setOtpId(res.otpId);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(values: ConfirmForm) {
    setLoading(true);
    setError(null);
    try {
      await confirmPasswordReset({
        otpId: otpId!,
        otp: values.otp,
        newPassword: values.newPassword,
      });
      router.replace('/(auth)/login');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Reset failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="We will email you a one-time code">
      {otpId ? (
        <Alert tone="success" className="mb-4">
          If the email exists, a reset code was sent.
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {step === 'request' ? (
        <>
          <Controller
            control={requestForm.control}
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
          <Button loading={loading} onPress={requestForm.handleSubmit(onRequest)}>
            Send reset code
          </Button>
        </>
      ) : (
        <>
          <Controller
            control={confirmForm.control}
            name="otp"
            render={({ field: { onChange, value } }) => (
              <View className="mb-4">
                <Label>OTP code</Label>
                <Input keyboardType="number-pad" maxLength={6} onChangeText={onChange} value={value} />
              </View>
            )}
          />
          <Controller
            control={confirmForm.control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <View className="mb-4">
                <Label>New password</Label>
                <Input secureTextEntry onChangeText={onChange} value={value} />
              </View>
            )}
          />
          <Button loading={loading} onPress={confirmForm.handleSubmit(onConfirm)}>
            Set new password
          </Button>
        </>
      )}
    </AuthShell>
  );
}
