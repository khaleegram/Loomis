import { Redirect, type Href } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { homeRouteForRole, isMobileRole } from '@/lib/role-routes';

export default function Index() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isMobileRole(session.role, session.staffExtensionRoles ?? [])) {
    return (
      <Redirect
        href={homeRouteForRole(session.role, session.staffExtensionRoles ?? []) as Href}
      />
    );
  }

  return <Redirect href="/(auth)/unsupported" />;
}
