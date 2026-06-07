'use client';

import { ApiClientProvider } from '@loomis/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createWebApiClient } from '@/lib/api/create-web-api-client';
import { AuthProvider } from '@/lib/auth/auth-context';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  const [apiClient] = useState(() => createWebApiClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={apiClient}>
        <AuthProvider>{children}</AuthProvider>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}
