'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { AuthShell } from '@/components/layout/auth-shell';

const STEP_BY_PATH: Record<string, string> = {
  '/mfa': 'Step 2 of 2',
  '/mfa-enrollment': 'Security setup',
  '/reset-password': 'Account recovery',
};

interface AuthShellLayoutProps {
  children: ReactNode;
}

export function AuthShellLayout({ children }: AuthShellLayoutProps) {
  const pathname = usePathname();
  const step = STEP_BY_PATH[pathname];

  return <AuthShell step={step}>{children}</AuthShell>;
}
