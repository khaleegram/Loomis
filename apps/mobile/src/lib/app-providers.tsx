import { useMemo, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientProvider } from '@loomis/api-client';
import { AuthProvider } from '@/lib/auth-context';
import { createMobileApiClient } from '@/lib/api-client';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      }),
  );
  const apiClient = useMemo(() => createMobileApiClient(), []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>
          <AuthProvider queryClient={queryClient}>{children}</AuthProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
