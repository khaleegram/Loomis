import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useMyProfile,
  useRevokeSession,
  useSessions,
  useUpdateProfile,
} from '@loomis/api-client';
import {
  Button,
  Input,
  Label,
  Alert,
  Card,
  SectionLabel,
  Skeleton,
  LOOMIS,
} from '@loomis/ui-mobile';
import { ParentScreen } from '@/components/parent/chrome/parent-screen';
import { useAuth } from '@/lib/auth-context';
import { greetingFirstName } from '@/lib/display-name';

const contactSchema = z.object({
  email: z.string().email(),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ParentSettingsScreen() {
  const { session, signOut } = useAuth();
  const profileQuery = useMyProfile();
  const sessionsQuery = useSessions();
  const updateProfile = useUpdateProfile();
  const revokeSession = useRevokeSession();

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (profileQuery.data?.email) {
      form.reset({ email: profileQuery.data.email });
    }
  }, [profileQuery.data?.email, form]);

  const firstName = greetingFirstName(session?.displayName ?? profileQuery.data?.displayName);

  return (
    <ParentScreen islandLabel="Account">
      <View className="px-5 pt-2">
        <Text style={{ fontSize: 24, fontWeight: '800', color: LOOMIS.neutral[900] }}>
          {firstName ? `Hi, ${firstName}` : 'Settings'}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 14, color: LOOMIS.neutral[500] }}>
          Contact details and active sessions
        </Text>

        <SectionLabel className="mb-3 mt-8">Contact details</SectionLabel>
        {profileQuery.isLoading ? (
          <Skeleton className="mb-6 h-40 w-full rounded-2xl" />
        ) : (
          <Card className="mb-6">
            <Controller
              control={form.control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Label>Email</Label>
                  <Input
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              )}
            />
            <Button
              className="mt-4"
              loading={updateProfile.isPending}
              onPress={form.handleSubmit(async (values) => {
                if (values.email === profileQuery.data?.email) return;
                try {
                  await updateProfile.mutateAsync(values);
                } catch {
                  form.setError('email', {
                    message: 'Update failed — MFA may be required on web.',
                  });
                }
              })}
            >
              Save contact
            </Button>
            {form.formState.errors.email ? (
              <Alert tone="danger" className="mt-3">
                {form.formState.errors.email.message}
              </Alert>
            ) : null}
            <Alert tone="info" className="mt-3">
              Phone updates go through your school admin.
            </Alert>
          </Card>
        )}

        <SectionLabel className="mb-3">Active sessions</SectionLabel>
        {sessionsQuery.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : (sessionsQuery.data?.sessions ?? []).length === 0 ? (
          <Text className="text-sm text-neutral-500">No active sessions.</Text>
        ) : (
          (sessionsQuery.data?.sessions ?? []).map((s) => (
            <Card key={s.id} className="mb-3">
              <Text className="text-sm font-semibold text-neutral-900">
                {s.platform ?? 'Unknown device'}
                {s.isCurrent ? ' · This device' : ''}
              </Text>
              <Text className="mt-1 text-xs text-neutral-500">
                Last active {new Date(s.lastActiveAt).toLocaleString()}
              </Text>
              {!s.isCurrent ? (
                <Button
                  variant="secondary"
                  className="mt-3"
                  loading={revokeSession.isPending}
                  onPress={() => revokeSession.mutate({ sessionId: s.id })}
                >
                  Revoke
                </Button>
              ) : null}
            </Card>
          ))
        )}

        <Button variant="danger" className="mt-8" onPress={() => void signOut()}>
          Sign out
        </Button>
      </View>
    </ParentScreen>
  );
}
