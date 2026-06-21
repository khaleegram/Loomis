import { Text, View } from 'react-native';
import { AuthShell, Button } from '@loomis/ui-mobile';
import { useAuth } from '@/lib/auth-context';

export default function UnsupportedRoleScreen() {
  const { session, signOut } = useAuth();

  return (
    <AuthShell
      title="Use the web console"
      subtitle="Your role is managed on the Loomis school web portal."
    >
      <View className="rounded-2xl border border-brand-100/40 bg-brand-50 p-4 dark:bg-forest-800">
        {session?.role ? (
          <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            Signed in as: {session.role.replace(/_/g, ' ')}
          </Text>
        ) : null}
        <Text className="text-sm leading-5 text-neutral-700 dark:text-neutral-200">
          Mobile supports parent, student, teacher, and class teacher only. You are on a staff or
          admin account — use the web app instead.
        </Text>
        <Text className="mt-3 text-sm leading-5 text-neutral-600 dark:text-neutral-300">
          To test the family portal, sign out and log in with{' '}
          <Text className="font-semibold">parent.jss3b@loomis.com</Text> (password{' '}
          <Text className="font-semibold">LoomisDev2026!</Text>).
        </Text>
      </View>
      <Button className="mt-6 w-full" onPress={() => void signOut()}>
        Sign out
      </Button>
    </AuthShell>
  );
}
