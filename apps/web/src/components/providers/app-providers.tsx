'use client';

import { ApiClientProvider } from '@loomis/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createWebApiClient } from '@/lib/api/create-web-api-client';
import { AuthProvider } from '@/lib/auth/auth-context';

import { ThemeProvider } from './theme-provider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            // Expected API errors (409 conflict, 422 validation) must be caught in UI — never crash the app shell.
            throwOnError: false,
          },
        },
      }),
  );

  const [apiClient] = useState(() => createWebApiClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={apiClient}>
          <AuthProvider>{children}</AuthProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
