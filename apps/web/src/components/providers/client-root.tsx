'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { RootErrorBoundary } from '@/components/error-boundary/root-error-boundary';

import { AppProviders } from './app-providers';

const Toaster = dynamic(() => import('@/lib/toast').then((mod) => mod.Toaster), {
  ssr: false,
});

export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <RootErrorBoundary>
      <AppProviders>{children}</AppProviders>
      <Toaster />
    </RootErrorBoundary>
  );
}
