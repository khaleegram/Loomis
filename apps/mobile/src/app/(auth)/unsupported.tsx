import { Text, View } from 'react-native';
import { AuthShell, Button } from '@loomis/ui-mobile';
import { hasMobileTeachingAccess } from '@loomis/core';
import { useAuth } from '@/lib/auth-context';

export default function UnsupportedRoleScreen() {
  const { session, signOut } = useAuth();
  const extensions = session?.staffExtensionRoles ?? [];
  const teachingExtension = hasMobileTeachingAccess(session?.role ?? 'parent', extensions);

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
        {teachingExtension ? (
          <Text className="text-sm leading-5 text-neutral-700 dark:text-neutral-200">
            Your account has teaching duties but mobile could not route you to a teaching stack. Sign
            out and back in after HRM role changes, or use the web gradebook and attendance tools.
          </Text>
        ) : (
          <Text className="text-sm leading-5 text-neutral-700 dark:text-neutral-200">
            Mobile supports parent, student, teacher, and class teacher. School admin and finance
            roles use the web console — including staff with teaching extensions (e.g. accountant +
            teacher).
          </Text>
        )}
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
